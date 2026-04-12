import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useListCategories, useListCreditCards, useListAccounts } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import {
  Upload, FileText, CheckCircle2, X, Loader2, ArrowRight,
  TriangleAlert, CreditCard, Sparkles, Calendar, ChevronDown, Landmark, Layers,
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
  paymentMethod: string | null;
  isDuplicate: boolean;
  selected: boolean;
};

type Step = "upload" | "processing" | "review" | "importing" | "done";
type ImportType = "card" | "account";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const ACCEPTED_TYPES = ".pdf,.csv,.xlsx,.xls";
const MAX_SIZE_MB = 10;
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const PAYMENT_METHODS_ACCOUNT = ["Pix", "Débito", "Transferência", "Boleto", "TED/DOC", "Dinheiro", "Outros"];

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

// ─── CategoryPickerCell ────────────────────────────────────────────────────────
// Portal-based dropdown with search — bypasses any overflow/scroll constraints
function CategoryPickerCell({
  tx,
  categories,
  onUpdate,
}: {
  tx: ImportTx;
  categories: { id: number; name: string; isActive?: boolean; color?: string }[];
  onUpdate: (categoryId: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 180 });

  function handleOpen() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownH = 220;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow >= dropdownH ? rect.bottom + 2 : rect.top - dropdownH - 2;
      setPos({ top, left: rect.left, width: Math.max(rect.width, 180) });
    }
    setSearch("");
    setOpen(v => !v);
  }

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = (categories ?? []).filter(c =>
    (c.isActive !== false) &&
    (!search || c.name.toLowerCase().includes(search.toLowerCase()))
  );
  const selectedCat = (categories ?? []).find(c => c.id === tx.categoryId);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="h-7 text-xs w-full flex items-center justify-between px-2 rounded border border-slate-200 bg-white hover:border-indigo-300 transition-colors"
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          {selectedCat ? (
            <>
              {selectedCat.color && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedCat.color }} />
              )}
              <span className="truncate">{selectedCat.name}</span>
            </>
          ) : (
            <span className="text-slate-400 italic truncate">{tx.suggestedCategory || "Categoria"}</span>
          )}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 99999 }}
          className="bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden"
        >
          <div className="px-2.5 py-2 border-b border-slate-100 bg-white">
            <input
              autoFocus
              className="w-full text-xs outline-none placeholder:text-slate-400 bg-transparent"
              placeholder="Buscar categoria..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}
            />
          </div>
          <div className="overflow-y-auto max-h-52">
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); onUpdate(null); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs transition-colors",
                !tx.categoryId ? "bg-slate-50 text-slate-500 font-medium" : "text-slate-400 hover:bg-slate-50"
              )}
            >
              Sem categoria
            </button>
            {filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); onUpdate(c.id); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors",
                  tx.categoryId === c.id
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                {c.color && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                )}
                {c.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-400 italic">Nenhuma encontrada</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ─── InstallmentCell ───────────────────────────────────────────────────────────
// Editable "X/Y" installment cell for the import review table
function InstallmentCell({
  tx,
  onUpdate,
}: {
  tx: ImportTx;
  onUpdate: (current: number | null, total: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleOpen() {
    const cur = tx.installmentCurrent ?? 1;
    const tot = tx.installmentTotal ?? 1;
    setValue(tx.installmentCurrent && tx.installmentTotal ? `${cur}/${tot}` : "");
    setError(null);
    setEditing(true);
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
  }

  function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) {
      onUpdate(null, null);
      setEditing(false);
      return;
    }
    const match = trimmed.match(/^(\d+)\/(\d+)$/);
    if (!match) { setError("Use formato: X/Y"); return; }
    const cur = parseInt(match[1]);
    const tot = parseInt(match[2]);
    if (tot === 0) { setError("Total não pode ser 0"); return; }
    if (cur > tot) { setError(`${cur} > ${tot}`); return; }
    if (cur < 1) { setError("Parcela inválida"); return; }
    onUpdate(cur, tot);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <input
          ref={inputRef}
          value={value}
          onChange={e => { setValue(e.target.value); setError(null); }}
          onBlur={handleSave}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); handleSave(); }
            if (e.key === "Escape") { setEditing(false); setError(null); }
          }}
          placeholder="ex: 2/12"
          className={cn(
            "w-16 h-6 text-xs text-center border rounded outline-none focus:ring-1 focus:ring-indigo-400",
            error ? "border-rose-400 text-rose-600" : "border-indigo-300 text-indigo-700 bg-white"
          )}
        />
        {error && <span className="text-[10px] text-rose-500 whitespace-nowrap">{error}</span>}
      </div>
    );
  }

  if (tx.installmentCurrent && tx.installmentTotal) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full hover:bg-violet-100 transition-colors border border-violet-200 cursor-pointer"
        title="Clique para editar parcelas"
      >
        {tx.installmentCurrent}/{tx.installmentTotal}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="text-xs text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 px-2 py-0.5 rounded transition-colors"
      title="Clique para adicionar parcelamento"
    >
      + parc.
    </button>
  );
}

// ─── ImportDialog ──────────────────────────────────────────────────────────────
export function ImportDialog({ open, onOpenChange, onImported }: ImportDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [transactions, setTransactions] = useState<ImportTx[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Import type: card invoice or bank account statement
  const [importType, setImportType] = useState<ImportType>("card");

  // Card & competence
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [statementMonth, setStatementMonth] = useState<string>(currentYYYYMM());
  const [suggestedCardId, setSuggestedCardId] = useState<number | null>(null);
  const [suggestedCardName, setSuggestedCardName] = useState<string | null>(null);

  // Account
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const { data: categories } = useListCategories();
  const { data: creditCards } = useListCreditCards();
  const { data: accounts } = useListAccounts();

  const monthOptions = generateMonthOptions();

  const reset = () => {
    setStep("upload");
    setFileName("");
    setFileType("");
    setTransactions([]);
    setImportedCount(0);
    setImportType("card");
    setSelectedCardId("");
    setSelectedAccountId("");
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

      // Auto-detect import type from backend hints or file name
      const nameLower = file.name.toLowerCase();
      const isLikelyAccount = nameLower.includes("extrato") || nameLower.includes("conta") || !data.suggestedCardId;
      setImportType(isLikelyAccount && !data.suggestedCardId ? "account" : "card");

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
    if (importType === "card" && !selectedCardId) {
      toast({ title: "Selecione o cartão desta fatura", description: "Campo obrigatório antes de importar.", variant: "destructive" });
      return;
    }
    if (importType === "account" && !selectedAccountId) {
      toast({ title: "Selecione a conta do extrato", description: "Campo obrigatório antes de importar.", variant: "destructive" });
      return;
    }
    const selected = transactions.filter((tx) => tx.selected);
    if (!selected.length) {
      toast({ title: "Selecione ao menos um lançamento", variant: "destructive" });
      return;
    }
    setStep("importing");

    try {
      const body: any = {
        fileName,
        fileType,
        transactions: selected,
      };

      if (importType === "card") {
        body.creditCardId = Number(selectedCardId);
        body.statementMonth = statementMonth;
      } else {
        body.accountId = Number(selectedAccountId);
      }

      const res = await fetch("/api/imports/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
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
  const selectedAccount = accounts?.find((a) => a.id === Number(selectedAccountId));
  const autoDetected = suggestedCardId !== null && selectedCardId === String(suggestedCardId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "bg-white border-slate-200",
        step === "review" ? "sm:max-w-[980px] max-h-[92vh]" : "sm:max-w-[500px]"
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
                "Envie a fatura de cartão ou extrato bancário (PDF, CSV, XLSX)",
                "A IA detecta o tipo e lê os lançamentos automaticamente",
                "Você revisa, edita categorias e parcelas, depois importa",
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

            {/* ── Config bar ── */}
            <div className="space-y-3 bg-slate-50 rounded-xl p-3 border border-slate-200">

              {/* Type toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImportType("card")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    importType === "card"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <CreditCard className="w-3.5 h-3.5" /> Fatura de cartão
                </button>
                <button
                  type="button"
                  onClick={() => setImportType("account")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    importType === "account"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <Landmark className="w-3.5 h-3.5" /> Extrato de conta
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Card OR Account selector */}
                {importType === "card" ? (
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
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5" />
                      Conta do extrato
                      <span className="text-rose-500">*</span>
                    </label>
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                      <SelectTrigger className={cn(
                        "h-9 text-sm border-slate-200 bg-white",
                        !selectedAccountId && "border-rose-300 bg-rose-50"
                      )}>
                        <SelectValue placeholder="Selecione a conta…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(accounts ?? []).map((a) => (
                          <SelectItem key={a.id} value={a.id.toString()}>
                            <div className="flex items-center gap-2">
                              {(a as any).color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: (a as any).color }} />}
                              <span>{a.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!selectedAccountId && (
                      <p className="text-xs text-rose-500">Obrigatório para importar</p>
                    )}
                  </div>
                )}

                {/* Competência (only for card) */}
                {importType === "card" ? (
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
                      Usada nos relatórios. Data da compra é registrada separado.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Competência
                    </label>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Para extrato, a competência de cada lançamento é a própria data da transação.
                    </p>
                  </div>
                )}
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
              {importType === "card" && selectedCard && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-200">
                  <CreditCard className="w-3.5 h-3.5" />
                  {selectedCard.apelidoCartao || selectedCard.nomeCartao}
                </span>
              )}
              {importType === "account" && selectedAccount && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                  <Landmark className="w-3.5 h-3.5" />
                  {selectedAccount.name}
                </span>
              )}
              <span className="ml-auto text-sm text-slate-500">
                <span className="font-semibold text-indigo-600">{selectedCount}</span> selecionados
              </span>
            </div>

            {/* ── Table ── */}
            <div className="overflow-auto border border-slate-200 rounded-xl" style={{ maxHeight: "46vh" }}>
              <table className="w-full text-sm min-w-[820px]">
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
                    <th className="px-3 py-2.5 text-center w-20">Parc.</th>
                    {importType === "account" && (
                      <th className="px-3 py-2.5 text-left w-32">Pagamento</th>
                    )}
                    <th className="px-3 py-2.5 text-left w-40">Categoria</th>
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

                      {/* Parcelas — editável */}
                      <td className="px-3 py-2 text-center">
                        <InstallmentCell
                          tx={tx}
                          onUpdate={(cur, tot) => updateTx(tx._id, { installmentCurrent: cur, installmentTotal: tot })}
                        />
                      </td>

                      {/* Forma de pagamento (só extrato) */}
                      {importType === "account" && (
                        <td className="px-3 py-2">
                          <select
                            value={tx.paymentMethod ?? ""}
                            onChange={e => updateTx(tx._id, { paymentMethod: e.target.value || null })}
                            className="h-7 text-xs border border-slate-200 rounded bg-white px-1.5 w-full"
                          >
                            <option value="">—</option>
                            {PAYMENT_METHODS_ACCOUNT.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </td>
                      )}

                      {/* Categoria — portal dropdown com busca */}
                      <td className="px-3 py-2">
                        <CategoryPickerCell
                          tx={tx}
                          categories={(categories ?? []).filter(c => c.isActive !== false)}
                          onUpdate={(catId) => updateTx(tx._id, { categoryId: catId })}
                        />
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
                {importType === "card" && !selectedCardId && (
                  <span className="text-xs text-rose-500 font-medium">Selecione o cartão para continuar</span>
                )}
                {importType === "account" && !selectedAccountId && (
                  <span className="text-xs text-rose-500 font-medium">Selecione a conta para continuar</span>
                )}
                <Button
                  onClick={handleImport}
                  disabled={selectedCount === 0 || (importType === "card" && !selectedCardId) || (importType === "account" && !selectedAccountId)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Importar {selectedCount} lançamento{selectedCount !== 1 ? "s" : ""}
                  {importType === "card" && statementMonth && (
                    <span className="opacity-70 text-xs">— {formatStatementMonth(statementMonth)}</span>
                  )}
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
            <p className="text-slate-600 text-sm">
              Salvando {selectedCount} lançamentos
              {importType === "card" ? ` em ${formatStatementMonth(statementMonth)}` : ""}...
            </p>
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
                {importType === "card"
                  ? `Fatura de ${formatStatementMonth(statementMonth)} • ${selectedCard?.apelidoCartao ?? selectedCard?.nomeCartao ?? "Cartão"}`
                  : `Extrato • ${selectedAccount?.name ?? "Conta"}`}
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
