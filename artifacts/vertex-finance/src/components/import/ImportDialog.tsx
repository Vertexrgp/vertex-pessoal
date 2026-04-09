import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useListCategories, useListCreditCards } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import {
  Upload, FileText, CheckCircle2, X, Loader2, ArrowRight,
  TriangleAlert, CreditCard, Sparkles, Calendar,
} from "lucide-react";

type ImportTx = {
  _id: string;
  purchaseDate: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  installmentCurrent: number | null;
  installmentTotal: number | null;
  suggestedCategory: string;
  confidence: "high" | "medium" | "low";
  categoryId: number | null;
  accountId: number | null;
  creditCardId: number | null;
  isDuplicate: boolean;
  selected: boolean;
};

type Step = "upload" | "processing" | "review" | "importing" | "done";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const ACCEPTED_TYPES = ".pdf,.csv,.xlsx,.xls";
const MAX_SIZE_MB = 10;
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function currentYYYYMM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatStatementMonth(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTHS[parseInt(m) - 1]} ${y}`;
}

function generateMonthOptions() {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 3; i >= -3; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value, label: formatStatementMonth(value) });
  }
  return options;
}

export function ImportDialog({ open, onOpenChange, onImported }: ImportDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [transactions, setTransactions] = useState<ImportTx[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Card & competence state
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [statementMonth, setStatementMonth] = useState<string>(currentYYYYMM());
  const [suggestedCardId, setSuggestedCardId] = useState<number | null>(null);
  const [suggestedCardName, setSuggestedCardName] = useState<string | null>(null);

  const { data: categories } = useListCategories();
  const { data: creditCards } = useListCreditCards();

  const monthOptions = generateMonthOptions();

  const reset = () => {
    setStep("upload");
    setFileName("");
    setFileType("");
    setTransactions([]);
    setImportedCount(0);
    setSelectedCardId("");
    setStatementMonth(currentYYYYMM());
    setSuggestedCardId(null);
    setSuggestedCardName(null);
  };

  const handleClose = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const processFile = async (file: File) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: `Máximo ${MAX_SIZE_MB}MB`, variant: "destructive" });
      return;
    }
    setFileName(file.name);
    setFileType(file.type);
    setStep("processing");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/imports/upload", { method: "POST", body: formData, credentials: "include" });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Erro ao processar arquivo", description: data.error, variant: "destructive" });
        setStep("upload");
        return;
      }

      setTransactions(data.transactions ?? []);

      // Auto-detect suggestions from backend
      if (data.suggestedCardId) {
        setSelectedCardId(String(data.suggestedCardId));
        setSuggestedCardId(data.suggestedCardId);
      }
      if (data.suggestedCardName) setSuggestedCardName(data.suggestedCardName);
      if (data.suggestedStatementMonth) setStatementMonth(data.suggestedStatementMonth);

      setStep("review");
    } catch (e: any) {
      toast({ title: "Erro de conexão", description: e.message, variant: "destructive" });
      setStep("upload");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const toggleSelect = (id: string) =>
    setTransactions((prev) => prev.map((tx) => tx._id === id ? { ...tx, selected: !tx.selected } : tx));

  const toggleSelectAll = () => {
    const allSelected = transactions.every((tx) => tx.selected);
    setTransactions((prev) => prev.map((tx) => ({ ...tx, selected: !allSelected })));
  };

  const updateTx = (id: string, patch: Partial<ImportTx>) =>
    setTransactions((prev) => prev.map((tx) => tx._id === id ? { ...tx, ...patch } : tx));

  const removeTx = (id: string) =>
    setTransactions((prev) => prev.filter((tx) => tx._id !== id));

  const handleImport = async () => {
    if (!selectedCardId) {
      toast({ title: "Selecione o cartão desta fatura", description: "Campo obrigatório antes de importar.", variant: "destructive" });
      return;
    }
    const selected = transactions.filter((tx) => tx.selected);
    if (!selected.length) {
      toast({ title: "Selecione ao menos um lançamento", variant: "destructive" });
      return;
    }
    setStep("importing");

    try {
      const res = await fetch("/api/imports/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fileName,
          fileType,
          creditCardId: Number(selectedCardId),
          statementMonth,
          transactions: selected,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erro ao importar", description: data.error, variant: "destructive" });
        setStep("review");
        return;
      }

      setImportedCount(data.importedCount);
      setStep("done");
      onImported();
    } catch (e: any) {
      toast({ title: "Erro de conexão", description: e.message, variant: "destructive" });
      setStep("review");
    }
  };

  const selectedCount = transactions.filter((tx) => tx.selected).length;
  const duplicateCount = transactions.filter((tx) => tx.isDuplicate).length;
  const selectedCard = creditCards?.find((c) => c.id === Number(selectedCardId));
  const autoDetected = suggestedCardId !== null && selectedCardId === String(suggestedCardId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "bg-white border-slate-200",
        step === "review" ? "sm:max-w-[960px] max-h-[92vh]" : "sm:max-w-[500px]"
      )}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-500" />
            {step === "upload" && "Importar Extrato / Fatura"}
            {step === "processing" && "Processando arquivo..."}
            {step === "review" && `Revisar lançamentos — ${fileName}`}
            {step === "importing" && "Importando lançamentos..."}
            {step === "done" && "Importação concluída!"}
          </DialogTitle>
        </DialogHeader>

        {/* ── UPLOAD ──────────────────────────────────────────────────────────── */}
        {step === "upload" && (
          <div className="py-2 space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
                isDragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
              )}
            >
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-700 font-semibold">Arraste o arquivo aqui ou clique para selecionar</p>
              <p className="text-slate-400 text-sm mt-1">PDF, CSV ou XLSX — até {MAX_SIZE_MB}MB</p>
              <input ref={fileRef} type="file" accept={ACCEPTED_TYPES} className="hidden" onChange={handleFileChange} />
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Como funciona</p>
              {[
                "Envie a fatura ou extrato (PDF, CSV, XLSX)",
                "A IA detecta o cartão e lê os lançamentos automaticamente",
                "Você define a competência e revisa antes de salvar",
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PROCESSING ──────────────────────────────────────────────────────── */}
        {step === "processing" && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-slate-800">{fileName}</p>
              <p className="text-slate-500 text-sm">Extraindo lançamentos com IA...</p>
              <p className="text-slate-400 text-xs">Isso pode levar alguns segundos</p>
            </div>
          </div>
        )}

        {/* ── REVIEW ──────────────────────────────────────────────────────────── */}
        {step === "review" && (
          <div className="flex flex-col gap-3 min-h-0">

            {/* ── Config bar: Cartão + Competência ── */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
              {/* Cartão */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Cartão desta fatura
                  <span className="text-rose-500">*</span>
                </label>
                <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                  <SelectTrigger className={cn(
                    "h-9 text-sm border-slate-200 bg-white",
                    !selectedCardId && "border-rose-300 bg-rose-50"
                  )}>
                    <SelectValue placeholder="Selecione o cartão…" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditCards?.filter((c) => c.ativo).map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
                          <span>{c.apelidoCartao || c.nomeCartao}</span>
                          <span className="text-slate-400 text-xs">{c.banco}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {autoDetected && suggestedCardName && (
                  <p className="text-xs text-indigo-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Detectado automaticamente: {suggestedCardName}
                  </p>
                )}
                {!selectedCardId && (
                  <p className="text-xs text-rose-500">Obrigatório para importar</p>
                )}
              </div>

              {/* Competência */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Mês da fatura (competência)
                </label>
                <Select value={statementMonth} onValueChange={setStatementMonth}>
                  <SelectTrigger className="h-9 text-sm border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">
                  Usada nos relatórios financeiros. Data da compra é registrada separado.
                </p>
              </div>
            </div>

            {/* ── Summary ── */}
            <div className="flex flex-wrap items-center gap-3 px-1">
              <span className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{transactions.length}</span> lançamentos encontrados
              </span>
              {duplicateCount > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                  <TriangleAlert className="w-3.5 h-3.5" />
                  {duplicateCount} possíve{duplicateCount > 1 ? "is duplicatas" : "l duplicata"} — desmarcada{duplicateCount > 1 ? "s" : ""}
                </span>
              )}
              {selectedCard && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-200">
                  <CreditCard className="w-3.5 h-3.5" />
                  {selectedCard.apelidoCartao || selectedCard.nomeCartao}
                </span>
              )}
              <span className="ml-auto text-sm text-slate-500">
                <span className="font-semibold text-indigo-600">{selectedCount}</span> selecionados
              </span>
            </div>

            {/* ── Table ── */}
            <div className="overflow-auto border border-slate-200 rounded-xl" style={{ maxHeight: "48vh" }}>
              <table className="w-full text-sm min-w-[780px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400 uppercase tracking-wide sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 w-8">
                      <input type="checkbox" className="rounded"
                        checked={transactions.length > 0 && transactions.every((tx) => tx.selected)}
                        onChange={toggleSelectAll} />
                    </th>
                    <th className="px-3 py-2.5 text-left w-28">Data compra</th>
                    <th className="px-3 py-2.5 text-left">Descrição</th>
                    <th className="px-3 py-2.5 text-right w-32">Valor</th>
                    <th className="px-3 py-2.5 text-center w-16">Parc.</th>
                    <th className="px-3 py-2.5 text-left w-36">Categoria</th>
                    <th className="px-3 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx._id} className={cn(
                      "transition-colors",
                      !tx.selected ? "opacity-40 bg-slate-50" : tx.isDuplicate ? "bg-amber-50/40" : "hover:bg-slate-50/60"
                    )}>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" className="rounded" checked={tx.selected} onChange={() => toggleSelect(tx._id)} />
                      </td>

                      {/* Data da compra */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Input type="date" value={tx.purchaseDate}
                          onChange={(e) => updateTx(tx._id, { purchaseDate: e.target.value })}
                          className="h-7 text-xs w-32 border-slate-200" />
                      </td>

                      {/* Descrição */}
                      <td className="px-3 py-2 min-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          {tx.isDuplicate && (
                            <span title="Possível duplicata" className="text-amber-500 shrink-0">
                              <TriangleAlert className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <Input value={tx.description}
                            onChange={(e) => updateTx(tx._id, { description: e.target.value })}
                            className="h-7 text-xs border-slate-200" />
                        </div>
                      </td>

                      {/* Valor + tipo */}
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button"
                            onClick={() => updateTx(tx._id, { type: tx.type === "expense" ? "income" : "expense" })}
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded font-bold transition-colors shrink-0",
                              tx.type === "expense" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                            )}>
                            {tx.type === "expense" ? "−" : "+"}
                          </button>
                          <Input type="number" step="0.01" value={tx.amount}
                            onChange={(e) => updateTx(tx._id, { amount: Number(e.target.value) })}
                            className="h-7 text-xs w-24 border-slate-200 text-right" />
                        </div>
                      </td>

                      {/* Parcelas */}
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        {tx.installmentCurrent && tx.installmentTotal ? (
                          <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
                            {tx.installmentCurrent}/{tx.installmentTotal}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Categoria */}
                      <td className="px-3 py-2">
                        <Select
                          value={tx.categoryId?.toString() ?? "__suggested"}
                          onValueChange={(v) => updateTx(tx._id, { categoryId: v === "__suggested" ? null : Number(v) })}>
                          <SelectTrigger className="h-7 text-xs border-slate-200 w-full">
                            <SelectValue>
                              {tx.categoryId
                                ? categories?.find((c) => c.id === tx.categoryId)?.name ?? "Categoria"
                                : <span className="text-slate-400">{tx.suggestedCategory}</span>}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__suggested">
                              <span className="text-slate-400 italic">{tx.suggestedCategory} (sugerida)</span>
                            </SelectItem>
                            {categories?.filter((c) => c.isActive).map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                <span className="flex items-center gap-2">
                                  {c.color && <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c.color }} />}
                                  {c.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      <td className="px-3 py-2">
                        <button type="button" onClick={() => removeTx(tx._id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between pt-1">
              <Button variant="outline" onClick={() => setStep("upload")} className="border-slate-200">
                ← Novo arquivo
              </Button>
              <div className="flex items-center gap-3">
                {!selectedCardId && (
                  <span className="text-xs text-rose-500 font-medium">Selecione o cartão para continuar</span>
                )}
                <Button
                  onClick={handleImport}
                  disabled={selectedCount === 0 || !selectedCardId}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Importar {selectedCount} lançamento{selectedCount !== 1 ? "s" : ""}
                  {statementMonth && <span className="opacity-70 text-xs">— {formatStatementMonth(statementMonth)}</span>}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── IMPORTING ──────────────────────────────────────────────────────── */}
        {step === "importing" && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
            <p className="text-slate-600 text-sm">Salvando {selectedCount} lançamentos em {formatStatementMonth(statementMonth)}...</p>
          </div>
        )}

        {/* ── DONE ────────────────────────────────────────────────────────────── */}
        {step === "done" && (
          <div className="py-10 flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{importedCount} lançamentos importados!</p>
              <p className="text-slate-500 text-sm mt-1">
                Fatura de {formatStatementMonth(statementMonth)} • {selectedCard?.apelidoCartao ?? selectedCard?.nomeCartao ?? "Cartão"}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => reset()} className="border-slate-200">Importar outro arquivo</Button>
              <Button onClick={() => handleClose(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white">Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
