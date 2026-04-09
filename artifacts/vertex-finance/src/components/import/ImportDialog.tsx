import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useListCategories, useListAccounts, useListCreditCards } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import {
  Upload, FileText, CheckCircle2, AlertTriangle, X, Loader2,
  ArrowRight, Tag, ChevronDown, TriangleAlert, Landmark
} from "lucide-react";

type ImportTx = {
  _id: string;
  date: string;
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

export function ImportDialog({ open, onOpenChange, onImported }: ImportDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [transactions, setTransactions] = useState<ImportTx[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useListCategories();
  const { data: accounts } = useListAccounts();
  const { data: creditCards } = useListCreditCards();

  const reset = () => {
    setStep("upload");
    setFileName("");
    setFileType("");
    setTransactions([]);
    setImportedCount(0);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

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
      const res = await fetch("/api/imports/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Erro ao processar arquivo", description: data.error, variant: "destructive" });
        setStep("upload");
        return;
      }

      setTransactions(data.transactions);
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

  const toggleSelect = (id: string) => {
    setTransactions((prev) => prev.map((tx) => tx._id === id ? { ...tx, selected: !tx.selected } : tx));
  };

  const toggleSelectAll = () => {
    const allSelected = transactions.every((tx) => tx.selected);
    setTransactions((prev) => prev.map((tx) => ({ ...tx, selected: !allSelected })));
  };

  const updateTx = (id: string, patch: Partial<ImportTx>) => {
    setTransactions((prev) => prev.map((tx) => tx._id === id ? { ...tx, ...patch } : tx));
  };

  const removeTx = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx._id !== id));
  };

  const handleImport = async () => {
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
        body: JSON.stringify({ fileName, fileType, transactions: selected }),
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "bg-white border-slate-200",
        step === "review" ? "sm:max-w-[900px] max-h-[90vh]" : "sm:max-w-[480px]"
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

        {/* ── STEP: UPLOAD ─────────────────────────────────────────────────── */}
        {step === "upload" && (
          <div className="py-2 space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
                isDragging
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
              )}
            >
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-700 font-semibold">Arraste o arquivo aqui ou clique para selecionar</p>
              <p className="text-slate-400 text-sm mt-1">PDF, CSV ou XLSX — até {MAX_SIZE_MB}MB</p>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Como funciona</p>
              {[
                "Envie sua fatura ou extrato bancário",
                "A IA lê e extrai os lançamentos automaticamente",
                "Você revisa, edita e aprova antes de salvar",
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP: PROCESSING ─────────────────────────────────────────────── */}
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

        {/* ── STEP: REVIEW ─────────────────────────────────────────────────── */}
        {step === "review" && (
          <div className="space-y-3 flex flex-col min-h-0">
            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-3 px-1">
              <span className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{transactions.length}</span> lançamentos encontrados
              </span>
              {duplicateCount > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                  <TriangleAlert className="w-3.5 h-3.5" />
                  {duplicateCount} possíve{duplicateCount > 1 ? "is duplicatas" : "l duplicata"} — já desmarcada{duplicateCount > 1 ? "s" : ""}
                </span>
              )}
              <span className="ml-auto text-sm text-slate-500">
                <span className="font-semibold text-indigo-600">{selectedCount}</span> selecionados para importar
              </span>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1 border border-slate-200 rounded-xl" style={{ maxHeight: "52vh" }}>
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400 uppercase tracking-wide sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 w-8">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={transactions.length > 0 && transactions.every((tx) => tx.selected)}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left">Data</th>
                    <th className="px-3 py-2.5 text-left">Descrição</th>
                    <th className="px-3 py-2.5 text-right">Valor</th>
                    <th className="px-3 py-2.5 text-center">Parc.</th>
                    <th className="px-3 py-2.5 text-left w-36">Categoria</th>
                    <th className="px-3 py-2.5 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr
                      key={tx._id}
                      className={cn(
                        "transition-colors",
                        !tx.selected ? "opacity-40 bg-slate-50" : tx.isDuplicate ? "bg-amber-50/40" : "hover:bg-slate-50/60"
                      )}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={tx.selected}
                          onChange={() => toggleSelect(tx._id)}
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Input
                          type="date"
                          value={tx.date}
                          onChange={(e) => updateTx(tx._id, { date: e.target.value })}
                          className="h-7 text-xs w-32 border-slate-200"
                        />
                      </td>
                      <td className="px-3 py-2 min-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          {tx.isDuplicate && (
                            <span title="Possível duplicata" className="text-amber-500 shrink-0">
                              <TriangleAlert className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <Input
                            value={tx.description}
                            onChange={(e) => updateTx(tx._id, { description: e.target.value })}
                            className="h-7 text-xs border-slate-200"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => updateTx(tx._id, { type: tx.type === "expense" ? "income" : "expense" })}
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded font-semibold transition-colors",
                              tx.type === "expense" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                            )}
                          >
                            {tx.type === "expense" ? "−" : "+"}
                          </button>
                          <Input
                            type="number"
                            step="0.01"
                            value={tx.amount}
                            onChange={(e) => updateTx(tx._id, { amount: Number(e.target.value) })}
                            className="h-7 text-xs w-24 border-slate-200 text-right"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        {tx.installmentCurrent && tx.installmentTotal ? (
                          <span className="text-xs font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded">
                            {tx.installmentCurrent}/{tx.installmentTotal}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={tx.categoryId?.toString() ?? "__suggested"}
                          onValueChange={(v) => updateTx(tx._id, { categoryId: v === "__suggested" ? null : Number(v) })}
                        >
                          <SelectTrigger className="h-7 text-xs border-slate-200 w-full">
                            <SelectValue>
                              {tx.categoryId
                                ? categories?.find((c) => c.id === tx.categoryId)?.name ?? "Categoria"
                                : <span className="text-slate-400">{tx.suggestedCategory}</span>
                              }
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
                        <button
                          type="button"
                          onClick={() => removeTx(tx._id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <Button variant="outline" onClick={() => setStep("upload")} className="border-slate-200">
                ← Novo arquivo
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Importar {selectedCount} lançamento{selectedCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: IMPORTING ──────────────────────────────────────────────── */}
        {step === "importing" && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
            <p className="text-slate-600 text-sm">Salvando {selectedCount} lançamentos...</p>
          </div>
        )}

        {/* ── STEP: DONE ───────────────────────────────────────────────────── */}
        {step === "done" && (
          <div className="py-10 flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{importedCount} lançamentos importados!</p>
              <p className="text-slate-500 text-sm mt-1">Todos os lançamentos aprovados foram salvos com sucesso.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { reset(); }} className="border-slate-200">
                Importar outro arquivo
              </Button>
              <Button onClick={() => handleClose(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
