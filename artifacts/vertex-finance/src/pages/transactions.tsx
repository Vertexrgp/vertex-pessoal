import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  useListTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useCreateInstallments,
  useListCategories,
  useListAccounts,
  useListCreditCards,
  useDeleteTransaction,
  useDeleteInstallmentGroup,
} from "@workspace/api-client-react";
import { Plus, Search, Trash2, Edit2, FileText, CheckCircle2, Clock, CreditCard, Layers, Tag, Landmark, Upload, Zap, Check, Loader2, X } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ImportDialog } from "@/components/import/ImportDialog";
import { QuickEntryDialog } from "@/components/quick-entry/QuickEntryDialog";

const PAYMENT_METHODS = ["Dinheiro", "Débito", "Crédito", "Pix", "Transferência", "Outros"];
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const singleSchema = z.object({
  mode: z.literal("single"),
  description: z.string().min(2, "Descrição obrigatória"),
  amount: z.coerce.number().min(0.01, "Valor obrigatório"),
  type: z.enum(["income", "expense", "transfer"]),
  status: z.enum(["planned", "paid", "received"]),
  competenceDate: z.string().min(10),
  movementDate: z.string().min(10),
  categoryId: z.coerce.number().nullable().optional(),
  accountId: z.coerce.number().nullable().optional(),
  creditCardId: z.coerce.number().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  creditType: z.enum(["avista", "parcelado"]).nullable().optional(),
  modoUsoCartao: z.enum(["fisico", "online"]).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const installmentSchema = z.object({
  mode: z.literal("installment"),
  description: z.string().min(2, "Descrição obrigatória"),
  totalAmount: z.coerce.number().min(0.01, "Valor obrigatório"),
  totalInstallments: z.coerce.number().int().min(2).max(72),
  firstInstallmentDate: z.string().min(10),
  firstInstallmentStatus: z.enum(["planned", "paid"]),
  categoryId: z.coerce.number().nullable().optional(),
  accountId: z.coerce.number().nullable().optional(),
  creditCardId: z.coerce.number().nullable().optional(),
  modoUsoCartao: z.enum(["fisico", "online"]).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const formSchema = z.discriminatedUnion("mode", [singleSchema, installmentSchema]);
type FormValues = z.infer<typeof formSchema>;

function ParcelaBadge({ tx }: { tx: any }) {
  if (tx.creditType === "parcelado" && tx.currentInstallment && tx.totalInstallments) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
        <Layers className="w-3 h-3" />
        {tx.currentInstallment}/{tx.totalInstallments}
      </span>
    );
  }
  if (tx.creditType === "avista") {
    return (
      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
        À vista
      </span>
    );
  }
  return <span className="text-slate-300 text-xs">—</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid" || status === "received") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" /> Efetivado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3.5 h-3.5" /> Previsto
    </span>
  );
}

function PaymentBadge({
  method, modoUso, cardNome, cardApelido, cardDigitos, cardCor,
}: {
  method: string | null | undefined;
  modoUso?: string | null;
  cardNome?: string | null;
  cardApelido?: string | null;
  cardDigitos?: string | null;
  cardCor?: string | null;
}) {
  if (!method) return <span className="text-slate-300 text-xs">—</span>;
  const isCredit = method === "Crédito";
  const cardLabel = cardApelido
    ? `${cardNome?.split(" ")[0] ?? ""} ${cardApelido}`.trim()
    : cardNome ?? null;

  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
        isCredit ? "bg-violet-50 text-violet-700 border border-violet-100" : "bg-slate-100 text-slate-600"
      )}>
        {isCredit && <CreditCard className="w-3 h-3" />}
        {method}
      </span>
      {isCredit && cardLabel && (
        <span className="flex items-center gap-1 text-[10px] text-slate-500 pl-0.5">
          {cardCor && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: cardCor }} />}
          <span className="font-medium">{cardLabel}</span>
          {cardDigitos && <span className="font-mono text-slate-400">•••• {cardDigitos}</span>}
        </span>
      )}
      {isCredit && modoUso && (
        <span className="text-[10px] text-slate-400 pl-0.5">
          {modoUso === "online" ? "🌐 Online" : "💳 Físico"}
        </span>
      )}
    </div>
  );
}

// ─── InlineCategoryCell ───────────────────────────────────────────────────────
function InlineCategoryCell({
  tx,
  categories,
  onSave,
}: {
  tx: any;
  categories: { id: number; name: string; type: string; color?: string }[];
  onSave: (txId: number, fields: any) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const catColor = categories.find(c => c.id === tx.categoryId)?.color;

  useEffect(() => {
    if (!editing) return;
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [editing]);

  async function handleSelect(catId: number | null, catName: string | null) {
    setEditing(false);
    setSaving(true);
    try {
      await onSave(tx.id, { categoryId: catId, categoryName: catName });
      setFlash(true);
      setTimeout(() => setFlash(false), 1400);
    } catch {
      toast({ title: "Erro ao salvar categoria", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative inline-block">
      {saving ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-slate-400">
          <Loader2 className="w-3 h-3 animate-spin" />
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(v => !v)}
          className={cn(
            "group/cat inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-150",
            tx.categoryName
              ? flash
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 hover:border hover:border-indigo-200"
              : flash
                ? "bg-emerald-100 text-emerald-700"
                : "text-slate-300 hover:text-indigo-400 hover:bg-indigo-50"
          )}
          title="Clique para editar categoria"
        >
          {tx.categoryName && catColor && !flash && (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
          )}
          {flash ? <Check className="w-3 h-3" /> : null}
          <span>{tx.categoryName || "Sem categoria"}</span>
          {!flash && (
            <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/cat:opacity-50 transition-opacity ml-0.5" />
          )}
        </button>
      )}

      {editing && (
        <div className="absolute left-0 top-full mt-1 z-[200] bg-white border border-slate-200 rounded-xl shadow-xl py-1 min-w-[180px] max-h-60 overflow-y-auto">
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); handleSelect(null, null); }}
            className={cn(
              "w-full text-left px-3 py-1.5 text-xs transition-colors",
              !tx.categoryId
                ? "bg-slate-100 text-slate-500 font-medium"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            )}
          >
            Sem categoria
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); handleSelect(c.id, c.name); }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors",
                tx.categoryId === c.id
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-50"
              )}
            >
              {c.color && (
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              )}
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── InlineParcelaCell ────────────────────────────────────────────────────────
function InlineParcelaCell({
  tx,
  onSave,
}: {
  tx: any;
  onSave: (txId: number, fields: any, groupId?: string | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(tx.totalInstallments?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setValue(tx.totalInstallments?.toString() ?? "");
  }, [tx.totalInstallments]);

  if (!tx.totalInstallments || tx.creditType !== "parcelado") {
    return <ParcelaBadge tx={tx} />;
  }

  async function save() {
    const newTotal = parseInt(value);
    if (isNaN(newTotal) || newTotal < (tx.currentInstallment ?? 1)) {
      toast({ title: "Total deve ser ≥ parcela atual", variant: "destructive" });
      setValue(tx.totalInstallments.toString());
      setEditing(false);
      return;
    }
    if (newTotal === tx.totalInstallments) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(tx.id, { totalInstallments: newTotal }, tx.installmentGroupId ?? null);
      setFlash(true);
      setTimeout(() => setFlash(false), 1400);
    } catch {
      toast({ title: "Erro ao salvar parcelas", variant: "destructive" });
      setValue(tx.totalInstallments.toString());
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (saving) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-violet-400">
        <Loader2 className="w-3 h-3 animate-spin" />
      </span>
    );
  }

  if (editing) {
    return (
      <div className="inline-flex items-center gap-0.5">
        <span className="text-xs font-semibold text-violet-700">{tx.currentInstallment}/</span>
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value.replace(/\D/g, ""))}
          onBlur={save}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); save(); }
            if (e.key === "Escape") { setValue(tx.totalInstallments.toString()); setEditing(false); }
          }}
          className="w-9 h-5 text-xs text-center border border-indigo-300 rounded bg-white outline-none focus:ring-1 focus:ring-indigo-400 font-semibold text-indigo-700"
          autoFocus
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={cn(
        "group/parc inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border cursor-pointer transition-all duration-150",
        flash
          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
          : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300"
      )}
      title="Clique para editar total de parcelas"
    >
      {flash ? <Check className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
      {tx.currentInstallment}/{tx.totalInstallments}
      {!flash && (
        <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/parc:opacity-50 transition-opacity ml-0.5" />
      )}
    </button>
  );
}

export default function TransactionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear] = useState(new Date().getFullYear());
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [pendingEditTx, setPendingEditTx] = useState<any | null>(null);
  const [showInstallmentEditDialog, setShowInstallmentEditDialog] = useState(false);
  const [installmentEditScope, setInstallmentEditScope] = useState<"single" | "group" | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const { toast } = useToast();

  // ── Advanced filters (client-side) ────────────────────────────────────────
  const [fCategory, setFCategory] = useState<string>("");
  const [fPayment, setFPayment] = useState<string>("");
  const [fStatus, setFStatus] = useState<string>("");
  const [fType, setFType] = useState<string>("");
  const [fCard, setFCard] = useState<string>("");

  const hasActiveFilters = !!(fCategory || fPayment || fStatus || fType || fCard);

  function clearFilters() {
    setFCategory(""); setFPayment(""); setFStatus(""); setFType(""); setFCard("");
  }

  // ── Saved filter views ────────────────────────────────────────────────────
  const [savedViews, setSavedViews] = useState<any[]>([]);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [savingView, setSavingView] = useState(false);

  useEffect(() => {
    fetch("/api/filter-views", { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSavedViews(data); })
      .catch(() => {});
  }, []);

  async function saveFilterView() {
    if (!newViewName.trim()) return;
    setSavingView(true);
    try {
      const res = await fetch("/api/filter-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newViewName.trim(),
          filters: { fCategory, fPayment, fStatus, fType, fCard },
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setSavedViews(v => [...v, created]);
        toast({ title: `Visualização "${newViewName.trim()}" salva` });
        setNewViewName("");
        setShowSaveInput(false);
      }
    } catch { /* ignore */ } finally { setSavingView(false); }
  }

  async function deleteFilterView(id: number) {
    await fetch(`/api/filter-views/${id}`, { method: "DELETE", credentials: "include" });
    setSavedViews(v => v.filter(fv => fv.id !== id));
  }

  function applyFilterView(view: any) {
    const f = view.filters ?? {};
    setFCategory(f.fCategory ?? "");
    setFPayment(f.fPayment ?? "");
    setFStatus(f.fStatus ?? "");
    setFType(f.fType ?? "");
    setFCard(f.fCard ?? "");
  }

  // ── Conciliation ──────────────────────────────────────────────────────────
  const [conciliationOpen, setConciliationOpen] = useState(false);
  const [conciliationCandidates, setConciliationCandidates] = useState<any[]>([]);
  const [conciliationLoading, setConciliationLoading] = useState(false);
  const [conciliationCount, setConciliationCount] = useState<number | null>(null);

  async function loadConciliationCandidates() {
    setConciliationLoading(true);
    try {
      const res = await fetch("/api/conciliation/candidates", { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setConciliationCandidates(data);
        setConciliationCount(data.length);
      }
    } catch { /* ignore */ } finally { setConciliationLoading(false); }
  }

  function openConciliation() {
    setConciliationOpen(true);
    loadConciliationCandidates();
  }

  async function conciliationMerge(keepId: number, deleteId: number) {
    await fetch("/api/conciliation/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ keepId, deleteId }),
    });
    setConciliationCandidates(cs => cs.filter(p => p.a.id !== keepId && p.a.id !== deleteId && p.b.id !== keepId && p.b.id !== deleteId));
    setConciliationCount(c => (c ?? 1) - 1);
    refetch();
    toast({ title: "Lançamento duplicado removido e conciliado." });
  }

  async function conciliationDismiss(id1: number, id2: number) {
    await fetch("/api/conciliation/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id1, id2 }),
    });
    setConciliationCandidates(cs => cs.filter(p => !(
      (p.a.id === id1 && p.b.id === id2) || (p.a.id === id2 && p.b.id === id1)
    )));
    setConciliationCount(c => (c ?? 1) - 1);
    toast({ title: "Par ignorado — tratado como lançamentos distintos." });
  }

  // Load conciliation count on mount (silently)
  useEffect(() => {
    fetch("/api/conciliation/candidates", { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setConciliationCount(data.length); })
      .catch(() => {});
  }, []);

  const { data: transactions, isLoading, refetch } = useListTransactions({
    month: filterMonth,
    year: filterYear,
    search: searchTerm || undefined,
  });
  const { data: categories } = useListCategories();
  const { data: accounts } = useListAccounts();
  const { data: creditCards } = useListCreditCards();

  // ── Inline-edit optimistic overrides ──────────────────────────────────────
  const [txOverrides, setTxOverrides] = useState<Record<number, any>>({});

  function patchInlineLocal(txId: number, fields: Record<string, any>, groupId?: string | null) {
    setTxOverrides(prev => {
      const next = { ...prev };
      if (groupId) {
        (transactions ?? []).forEach(t => {
          if ((t as any).installmentGroupId === groupId) {
            next[t.id] = { ...next[t.id], ...fields };
          }
        });
      } else {
        next[txId] = { ...next[txId], ...fields };
      }
      return next;
    });
  }

  async function patchInline(txId: number, fields: Record<string, any>, groupId?: string | null) {
    const url = groupId
      ? `/api/transactions/group/${groupId}`
      : `/api/transactions/${txId}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error("Erro ao salvar");

    // When totalInstallments changes on a group, the backend may create/delete rows
    // so we must refetch the full list instead of just patching local state
    if (groupId && "totalInstallments" in fields) {
      const data = await res.json().catch(() => ({}));
      await refetch();
      const n = data.totalInstallments ?? fields.totalInstallments;
      const total = data.totalAmount;
      const perParc = total ? (total / n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;
      toast({
        title: `Série recalculada: ${n} parcelas`,
        description: perParc
          ? `${perParc} por parcela · competências redistribuídas`
          : "Competências redistribuídas",
      });
      return;
    }

    patchInlineLocal(txId, fields, groupId);
  }

  // ── Client-side filtered transactions ────────────────────────────────────
  const filteredTransactions = (transactions ?? []).filter(tx => {
    const merged = { ...tx, ...(txOverrides[tx.id] ?? {}) };
    if (fCategory && String(merged.categoryId ?? "") !== fCategory) return false;
    if (fPayment && (merged.paymentMethod ?? "") !== fPayment) return false;
    if (fStatus && (merged.status ?? "") !== fStatus) return false;
    if (fType && (merged.type ?? "") !== fType) return false;
    if (fCard) {
      const cardMatch = String(merged.creditCardId ?? "") === fCard;
      const accMatch = String(merged.accountId ?? "") === fCard;
      if (!cardMatch && !accMatch) return false;
    }
    return true;
  });

  const filteredTotal = filteredTransactions.reduce((sum, tx) => {
    const merged = { ...tx, ...(txOverrides[tx.id] ?? {}) };
    const amt = Number(merged.amount ?? 0);
    return sum + (merged.type === "expense" ? -amt : merged.type === "income" ? amt : 0);
  }, 0);

  // Payment methods found in current data
  const uniquePaymentMethods = [...new Set((transactions ?? []).map(tx => tx.paymentMethod).filter(Boolean))].sort();

  const createMutation = useCreateTransaction({
    mutation: {
      onSuccess: () => {
        toast({ title: "Lançamento criado com sucesso!" });
        setIsModalOpen(false);
        refetch();
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? err?.message ?? "Erro ao salvar lançamento";
        toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
      },
    }
  });
  const installmentMutation = useCreateInstallments({
    mutation: {
      onSuccess: (data) => {
        toast({ title: `${data.length} parcelas criadas com sucesso!` });
        setIsModalOpen(false);
        refetch();
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? err?.message ?? "Erro ao criar parcelas";
        toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
      },
    }
  });
  const updateMutation = useUpdateTransaction({
    mutation: {
      onSuccess: () => {
        toast({ title: "Lançamento atualizado!" });
        setIsModalOpen(false);
        setEditingTx(null);
        setInstallmentEditScope(null);
        refetch();
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? err?.message ?? "Erro ao atualizar lançamento";
        toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
      },
    }
  });
  const deleteMutation = useDeleteTransaction({
    mutation: { onSuccess: () => { toast({ title: "Lançamento excluído." }); refetch(); } }
  });
  const deleteGroupMutation = useDeleteInstallmentGroup({
    mutation: { onSuccess: () => { toast({ title: "Todas as parcelas excluídas." }); refetch(); } }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      mode: "single",
      type: "expense",
      status: "paid",
      competenceDate: new Date().toISOString().split("T")[0],
      movementDate: new Date().toISOString().split("T")[0],
      paymentMethod: "Pix",
      creditType: null,
    } as any,
  });

  const mode = useWatch({ control: form.control, name: "mode" });
  const paymentMethod = useWatch({ control: form.control, name: "paymentMethod" as any });
  const creditType = useWatch({ control: form.control, name: "creditType" as any });

  useEffect(() => {
    if (paymentMethod === "Crédito" && !creditType) {
      (form as any).setValue("creditType", "avista");
    }
    if (paymentMethod !== "Crédito") {
      (form as any).setValue("creditType", null);
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (creditType === "parcelado") {
      form.setValue("mode" as any, "installment");
      (form as any).setValue("totalInstallments", 2);
      (form as any).setValue("firstInstallmentDate", new Date().toISOString().split("T")[0]);
      (form as any).setValue("firstInstallmentStatus", "paid");
    } else if (mode === "installment" && creditType !== "parcelado") {
      form.setValue("mode" as any, "single");
    }
  }, [creditType]);

  const onSubmit = async (values: FormValues) => {
    if (editingTx) {
      if (editingTx._editScope === "group" && editingTx.installmentGroupId) {
        try {
          const res = await fetch(`/api/transactions/group/${editingTx.installmentGroupId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              description: (values as any).description,
              categoryId: (values as any).categoryId ?? null,
              accountId: (values as any).accountId ?? null,
              creditCardId: (values as any).creditCardId ?? null,
              modoUsoCartao: (values as any).modoUsoCartao ?? null,
              notes: (values as any).notes ?? null,
            }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            toast({ title: "Erro ao salvar", description: errData.error ?? "Erro desconhecido", variant: "destructive" });
            return;
          }
          toast({ title: `Série de parcelas atualizada!` });
          setIsModalOpen(false);
          setEditingTx(null);
          setInstallmentEditScope(null);
          refetch();
        } catch (e: any) {
          toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
        }
      } else {
        updateMutation.mutate({
          id: editingTx.id,
          data: {
            description: (values as any).description,
            amount: (values as any).amount,
            type: (values as any).type,
            status: (values as any).status,
            competenceDate: (values as any).competenceDate,
            movementDate: (values as any).movementDate,
            categoryId: (values as any).categoryId ?? null,
            accountId: (values as any).accountId ?? null,
            creditCardId: (values as any).creditCardId ?? null,
            paymentMethod: (values as any).paymentMethod ?? null,
            creditType: (values as any).creditType ?? null,
            modoUsoCartao: (values as any).modoUsoCartao ?? null,
            notes: (values as any).notes ?? null,
          } as any,
        });
      }
      return;
    }

    if (values.mode === "installment") {
      installmentMutation.mutate({
        data: {
          description: values.description,
          totalAmount: values.totalAmount,
          totalInstallments: values.totalInstallments,
          firstInstallmentDate: values.firstInstallmentDate,
          firstInstallmentStatus: values.firstInstallmentStatus,
          categoryId: values.categoryId ?? null,
          accountId: values.accountId ?? null,
          creditCardId: values.creditCardId ?? null,
          paymentMethod: "Crédito",
          modoUsoCartao: (values as any).modoUsoCartao ?? null,
          notes: values.notes ?? null,
        } as any
      });
    } else {
      createMutation.mutate({
        data: {
          description: values.description,
          amount: values.amount,
          type: values.type,
          status: values.status,
          competenceDate: values.competenceDate,
          movementDate: values.movementDate,
          categoryId: values.categoryId ?? null,
          accountId: values.accountId ?? null,
          creditCardId: values.creditCardId ?? null,
          paymentMethod: values.paymentMethod ?? null,
          creditType: values.creditType ?? null,
          modoUsoCartao: (values as any).modoUsoCartao ?? null,
          notes: values.notes ?? null,
        } as any
      });
    }
  };

  const handleDelete = (tx: any) => {
    if (tx.installmentGroupId) {
      if (confirm(`Excluir todas as ${tx.totalInstallments} parcelas?`)) {
        deleteGroupMutation.mutate({ groupId: tx.installmentGroupId });
      }
    } else {
      if (confirm("Excluir este lançamento?")) {
        deleteMutation.mutate({ id: tx.id });
      }
    }
  };

  const isPending = createMutation.isPending || installmentMutation.isPending || updateMutation.isPending;

  const openNew = () => {
    setEditingTx(null);
    setPendingEditTx(null);
    setInstallmentEditScope(null);
    form.reset({
      mode: "single", type: "expense", status: "paid",
      competenceDate: new Date().toISOString().split("T")[0],
      movementDate: new Date().toISOString().split("T")[0],
      paymentMethod: "Pix",
    } as any);
    setIsModalOpen(true);
  };

  const prefillFormForEdit = (tx: any) => {
    form.reset({
      mode: "single",
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      status: tx.status,
      competenceDate: tx.competenceDate,
      movementDate: tx.movementDate,
      categoryId: tx.categoryId ?? undefined,
      accountId: tx.accountId ?? undefined,
      creditCardId: tx.creditCardId ?? undefined,
      paymentMethod: tx.paymentMethod ?? undefined,
      creditType: tx.creditType ?? undefined,
      modoUsoCartao: tx.modoUsoCartao ?? undefined,
      notes: tx.notes ?? undefined,
    } as any);
  };

  const openEdit = (tx: any) => {
    if (tx.installmentGroupId) {
      setPendingEditTx(tx);
      setShowInstallmentEditDialog(true);
    } else {
      setEditingTx(tx);
      setInstallmentEditScope(null);
      prefillFormForEdit(tx);
      setIsModalOpen(true);
    }
  };

  const startInstallmentEdit = (scope: "single" | "group") => {
    const tx = pendingEditTx!;
    setInstallmentEditScope(scope);
    setShowInstallmentEditDialog(false);
    setEditingTx({ ...tx, _editScope: scope });
    prefillFormForEdit(tx);
    setIsModalOpen(true);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Lançamentos</h1>
          <p className="text-slate-500 mt-1">Gerencie suas receitas, despesas e transferências.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
            onClick={() => setIsImportOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" /> Importar
          </Button>
          <Button
            variant="outline"
            className="relative border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 rounded-xl font-medium gap-1.5"
            onClick={openConciliation}
          >
            <CheckCircle2 className="w-4 h-4" /> Conciliação
            {conciliationCount !== null && conciliationCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] text-[10px] font-bold bg-amber-500 text-white rounded-full flex items-center justify-center px-1">
                {conciliationCount}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            className="border-indigo-200 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl font-medium gap-1.5"
            onClick={() => setIsQuickEntryOpen(true)}
          >
            <Zap className="w-4 h-4" /> Lançamento Rápido
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md shadow-primary/20"
            onClick={openNew}
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
          </Button>
        </div>
      </div>

      {/* ── Month + Search row ── */}
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar lançamentos..."
            className="pl-9 bg-white border-slate-200 rounded-xl"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {MONTHS.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setFilterMonth(i + 1)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                filterMonth === i + 1
                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── Advanced filters row ── */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {/* Tipo */}
        <select
          value={fType}
          onChange={e => setFType(e.target.value)}
          className={cn(
            "h-8 text-xs border rounded-lg px-2 bg-white transition-colors",
            fType ? "border-indigo-400 text-indigo-700 bg-indigo-50" : "border-slate-200 text-slate-500"
          )}
        >
          <option value="">Tipo</option>
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
          <option value="transfer">Transferência</option>
        </select>

        {/* Status */}
        <select
          value={fStatus}
          onChange={e => setFStatus(e.target.value)}
          className={cn(
            "h-8 text-xs border rounded-lg px-2 bg-white transition-colors",
            fStatus ? "border-indigo-400 text-indigo-700 bg-indigo-50" : "border-slate-200 text-slate-500"
          )}
        >
          <option value="">Status</option>
          <option value="paid">Pago</option>
          <option value="planned">Previsto</option>
          <option value="received">Recebido</option>
        </select>

        {/* Categoria */}
        <select
          value={fCategory}
          onChange={e => setFCategory(e.target.value)}
          className={cn(
            "h-8 text-xs border rounded-lg px-2 bg-white transition-colors max-w-[160px]",
            fCategory ? "border-indigo-400 text-indigo-700 bg-indigo-50" : "border-slate-200 text-slate-500"
          )}
        >
          <option value="">Categoria</option>
          {(categories ?? []).filter(c => c.isActive !== false).map(c => (
            <option key={c.id} value={c.id.toString()}>{c.name}</option>
          ))}
        </select>

        {/* Cartão / Conta */}
        <select
          value={fCard}
          onChange={e => setFCard(e.target.value)}
          className={cn(
            "h-8 text-xs border rounded-lg px-2 bg-white transition-colors max-w-[180px]",
            fCard ? "border-indigo-400 text-indigo-700 bg-indigo-50" : "border-slate-200 text-slate-500"
          )}
        >
          <option value="">Cartão / Conta</option>
          {(creditCards ?? []).map(c => (
            <option key={`card-${c.id}`} value={c.id.toString()}>
              💳 {c.apelidoCartao || c.nomeCartao}
            </option>
          ))}
          {(accounts ?? []).map(a => (
            <option key={`acc-${a.id}`} value={a.id.toString()}>
              🏦 {a.name}
            </option>
          ))}
        </select>

        {/* Pagamento */}
        <select
          value={fPayment}
          onChange={e => setFPayment(e.target.value)}
          className={cn(
            "h-8 text-xs border rounded-lg px-2 bg-white transition-colors",
            fPayment ? "border-indigo-400 text-indigo-700 bg-indigo-50" : "border-slate-200 text-slate-500"
          )}
        >
          <option value="">Pagamento</option>
          {PAYMENT_METHODS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
          {uniquePaymentMethods.filter(m => !PAYMENT_METHODS.includes(m as any)).map(m => (
            <option key={m} value={m!}>{m}</option>
          ))}
        </select>

        {/* Limpar filtros */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-8 px-3 text-xs rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors font-medium flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Limpar
          </button>
        )}

        {/* Salvar como visualização */}
        {hasActiveFilters && !showSaveInput && (
          <button
            type="button"
            onClick={() => { setShowSaveInput(true); setNewViewName(""); }}
            className="h-8 px-3 text-xs rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors font-medium flex items-center gap-1"
          >
            <Tag className="w-3 h-3" /> Salvar
          </button>
        )}

        {/* Save name input */}
        {showSaveInput && (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newViewName}
              onChange={e => setNewViewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") saveFilterView();
                if (e.key === "Escape") { setShowSaveInput(false); setNewViewName(""); }
              }}
              placeholder="Nome da visualização..."
              className="h-8 text-xs border border-indigo-300 rounded-lg px-2 w-44 outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={saveFilterView}
              disabled={savingView || !newViewName.trim()}
              className="h-8 px-2 text-xs rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
            >
              {savingView ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={() => { setShowSaveInput(false); setNewViewName(""); }}
              className="h-8 px-2 text-xs rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Resultado */}
        {(hasActiveFilters || searchTerm) && (
          <span className="ml-auto text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{filteredTransactions.length}</span> lançamento{filteredTransactions.length !== 1 ? "s" : ""}
            {" "}
            {filteredTotal !== 0 && (
              <span className={cn("font-semibold", filteredTotal >= 0 ? "text-emerald-600" : "text-rose-600")}>
                · {filteredTotal >= 0 ? "+" : ""}{filteredTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            )}
          </span>
        )}
      </div>

      {/* ── Saved views chips row ── */}
      {savedViews.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          <span className="text-xs text-slate-400 font-medium">Visualizações:</span>
          {savedViews.map(view => (
            <div
              key={view.id}
              className="group/chip inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors cursor-pointer"
              onClick={() => applyFilterView(view)}
              title="Clique para aplicar este filtro"
            >
              <Tag className="w-3 h-3 opacity-60" />
              {view.name}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); deleteFilterView(view.id); }}
                className="ml-0.5 opacity-0 group-hover/chip:opacity-100 transition-opacity text-rose-400 hover:text-rose-600"
                title="Excluir visualização"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-medium border-b border-slate-200 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3.5">Data</th>
                <th className="px-5 py-3.5">Descrição</th>
                <th className="px-5 py-3.5">Categoria</th>
                <th className="px-5 py-3.5">Pagamento</th>
                <th className="px-5 py-3.5 text-center">Parcela</th>
                <th className="px-5 py-3.5 text-right">Valor</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Carregando...</td></tr>
              ) : !filteredTransactions.length ? (
                <tr>
                  <td colSpan={8} className="p-14 text-center">
                    <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">
                      {hasActiveFilters || searchTerm ? "Nenhum lançamento com esses filtros." : "Nenhum lançamento encontrado."}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      {hasActiveFilters ? (
                        <button type="button" onClick={clearFilters} className="text-indigo-500 hover:underline">Limpar filtros</button>
                      ) : "Clique em \"Novo Lançamento\" para começar."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-5 py-3.5 text-slate-400 text-xs font-medium whitespace-nowrap">
                      {formatDate(tx.competenceDate)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-900 text-sm">{tx.description}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <InlineCategoryCell
                        tx={{ ...tx, ...(txOverrides[tx.id] ?? {}) }}
                        categories={categories ?? []}
                        onSave={async (txId, fields) => {
                          const res = await fetch(`/api/transactions/${txId}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ categoryId: fields.categoryId }),
                          });
                          if (!res.ok) throw new Error("Erro ao salvar");
                          patchInlineLocal(txId, fields, null);
                        }}
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <PaymentBadge
                        method={tx.paymentMethod}
                        modoUso={(tx as any).modoUsoCartao}
                        cardNome={(tx as any).creditCardNome}
                        cardApelido={(tx as any).creditCardApelido}
                        cardDigitos={(tx as any).creditCardDigitos}
                        cardCor={(tx as any).creditCardCor}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <InlineParcelaCell
                        tx={{ ...tx, ...(txOverrides[tx.id] ?? {}) }}
                        onSave={async (txId, fields, groupId) => {
                          await patchInline(txId, fields, groupId);
                        }}
                      />
                    </td>
                    <td className={cn(
                      "px-5 py-3.5 text-right font-bold tracking-tight tabular-nums",
                      tx.type === "income" ? "text-emerald-600" : tx.type === "expense" ? "text-rose-600" : "text-slate-600"
                    )}>
                      {tx.type === "expense" ? "-" : tx.type === "income" ? "+" : ""}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-primary hover:bg-primary/10"
                          title="Editar"
                          onClick={() => openEdit(tx)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title={tx.installmentGroupId ? `Excluir todas as ${tx.totalInstallments} parcelas` : "Excluir"}
                          onClick={() => handleDelete(tx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {transactions && transactions.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between text-xs text-slate-400">
            <span>{transactions.length} lançamento{transactions.length !== 1 ? "s" : ""}</span>
            <span>
              Total despesas:{" "}
              <span className="font-semibold text-rose-600">
                -{formatCurrency(transactions.filter(t => t.type === "expense").reduce((a, t) => a + t.amount, 0))}
              </span>
            </span>
          </div>
        )}
      </Card>

      {/* Dialog: escolher escopo de edição de parcelado */}
      <Dialog open={showInstallmentEditDialog} onOpenChange={setShowInstallmentEditDialog}>
        <DialogContent className="sm:max-w-[380px] bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Editar lançamento parcelado</DialogTitle>
          </DialogHeader>
          {pendingEditTx && (
            <div className="py-2 space-y-3">
              <p className="text-sm text-slate-500">
                Este lançamento é a parcela{" "}
                <span className="font-semibold text-slate-700">
                  {pendingEditTx.currentInstallment}/{pendingEditTx.totalInstallments}
                </span>{" "}
                de <span className="font-semibold text-slate-700">{pendingEditTx.description}</span>.
              </p>
              <p className="text-xs text-slate-400">O que você quer editar?</p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3 px-4 border-slate-200 hover:border-primary hover:bg-primary/5"
                  onClick={() => startInstallmentEdit("single")}
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-800">Apenas esta parcela</p>
                    <p className="text-xs text-slate-400 font-normal">Edita somente a parcela {pendingEditTx.currentInstallment}/{pendingEditTx.totalInstallments}</p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3 px-4 border-slate-200 hover:border-violet-500 hover:bg-violet-50"
                  onClick={() => startInstallmentEdit("group")}
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-800">Toda a série de parcelas</p>
                    <p className="text-xs text-slate-400 font-normal">Atualiza descrição, categoria, conta e observações em todas as {pendingEditTx.totalInstallments} parcelas</p>
                  </div>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) { setEditingTx(null); setInstallmentEditScope(null); } }}>
        <DialogContent className="sm:max-w-[520px] bg-white border-slate-200 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingTx
                ? installmentEditScope === "group"
                  ? `Editar série: ${editingTx.description}`
                  : "Editar Lançamento"
                : "Novo Lançamento"
              }
            </DialogTitle>
            {editingTx && installmentEditScope === "group" && (
              <p className="text-xs text-violet-600 font-medium mt-1">
                As alterações serão aplicadas a todas as {editingTx.totalInstallments} parcelas da série.
              </p>
            )}
            {editingTx && installmentEditScope === "single" && editingTx.totalInstallments && (
              <p className="text-xs text-slate-400 mt-1">
                Editando apenas a parcela {editingTx.currentInstallment}/{editingTx.totalInstallments}.
              </p>
            )}
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">

              {/* Tipo */}
              {mode !== "installment" && (
                <FormField control={form.control} name={"type" as any} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <div className="flex gap-2">
                      {[
                        { value: "expense", label: "Despesa", color: "hover:border-rose-400 data-[active=true]:bg-rose-50 data-[active=true]:border-rose-500 data-[active=true]:text-rose-700" },
                        { value: "income", label: "Receita", color: "hover:border-emerald-400 data-[active=true]:bg-emerald-50 data-[active=true]:border-emerald-500 data-[active=true]:text-emerald-700" },
                        { value: "transfer", label: "Transferência", color: "hover:border-blue-400 data-[active=true]:bg-blue-50 data-[active=true]:border-blue-500 data-[active=true]:text-blue-700" },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          data-active={field.value === opt.value}
                          onClick={() => field.onChange(opt.value)}
                          className={cn(
                            "flex-1 py-2 rounded-xl border text-sm font-medium transition-all",
                            field.value === opt.value ? "" : "border-slate-200 text-slate-500 bg-white",
                            opt.color
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* Descrição + Valor */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name={"description" as any} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl><Input placeholder="Ex: Mercado, Salário..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={mode === "installment" ? "totalAmount" as any : "amount" as any} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{mode === "installment" ? "Valor Total (R$)" : "Valor (R$)"}</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Forma de Pagamento */}
              <FormField control={form.control} name={"paymentMethod" as any} render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Crédito fields */}
              {paymentMethod === "Crédito" && (
                <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> Cartão de Crédito
                  </p>
                  <FormField control={form.control} name={"creditCardId" as any} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cartão</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() ?? ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {[...(creditCards ?? [])]
                            .sort((a, b) => (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1))
                            .map(c => {
                              const label = (c as any).apelidoCartao
                                ? `${c.banco} ${(c as any).apelidoCartao}`
                                : `${c.nomeCartao}`;
                              const digits = (c as any).ultimos4Digitos;
                              return (
                                <SelectItem key={c.id} value={c.id.toString()}>
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 inline-block"
                                      style={{ backgroundColor: c.cor }}
                                    />
                                    <span className="font-medium">{label}</span>
                                    {digits ? (
                                      <span className="text-slate-400 font-mono text-xs">•••• {digits}</span>
                                    ) : (
                                      <span className="text-slate-400 text-xs">{c.banco}</span>
                                    )}
                                    {!c.ativo && <span className="text-xs text-slate-400">(inativo)</span>}
                                  </span>
                                </SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name={"creditType" as any} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Crédito</FormLabel>
                        <div className="flex gap-2">
                          {[
                            { value: "avista", label: "À Vista" },
                            { value: "parcelado", label: "Parcelado" },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => field.onChange(opt.value)}
                              className={cn(
                                "flex-1 py-2 rounded-lg border text-xs font-medium transition-all",
                                field.value === opt.value
                                  ? "bg-primary text-white border-primary shadow-sm"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name={"modoUsoCartao" as any} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modo de Uso</FormLabel>
                        <div className="flex gap-2">
                          {[
                            { value: "fisico", label: "Físico" },
                            { value: "online", label: "Online" },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => field.onChange(field.value === opt.value ? null : opt.value)}
                              className={cn(
                                "flex-1 py-2 rounded-lg border text-xs font-medium transition-all",
                                field.value === opt.value
                                  ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}

              {/* Parcelamento fields */}
              {mode === "installment" && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-violet-800 flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Parcelamento
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name={"totalInstallments" as any} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº de Parcelas</FormLabel>
                        <FormControl><Input type="number" min={2} max={72} placeholder="Ex: 12" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={"firstInstallmentDate" as any} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data 1ª Parcela</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name={"firstInstallmentStatus" as any} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status da 1ª Parcela</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? "paid"}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="paid">Já paga</SelectItem>
                          <SelectItem value="planned">Prevista</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {(form.getValues("totalInstallments" as any) ?? 0) >= 2 && (form.getValues("totalAmount" as any) ?? 0) > 0 && (
                    <div className="flex items-center justify-between bg-violet-100 rounded-lg px-3 py-2">
                      <span className="text-xs text-violet-700">Valor por parcela:</span>
                      <span className="text-sm font-bold text-violet-900">
                        {formatCurrency((form.getValues("totalAmount" as any) ?? 0) / (form.getValues("totalInstallments" as any) ?? 1))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Categoria + Conta */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name={"categoryId" as any} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      <span>Categoria</span>
                      {!categories?.length && (
                        <Link href="/settings">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="text-xs text-primary hover:underline flex items-center gap-1">
                            <Tag className="w-3 h-3" /> Criar
                          </button>
                        </Link>
                      )}
                    </FormLabel>
                    {categories?.length ? (
                      <Select onValueChange={field.onChange} value={field.value?.toString() ?? ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {categories.filter(c => c.isActive).map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              <span className="flex items-center gap-2">
                                {c.color && <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: c.color }} />}
                                {c.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-slate-200 bg-slate-50">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm text-slate-400">Nenhuma categoria —</span>
                        <Link href="/settings">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="text-xs text-primary font-medium hover:underline">criar agora</button>
                        </Link>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={"accountId" as any} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      <span>Conta</span>
                      {!accounts?.length && (
                        <Link href="/settings">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="text-xs text-primary hover:underline flex items-center gap-1">
                            <Landmark className="w-3 h-3" /> Criar
                          </button>
                        </Link>
                      )}
                    </FormLabel>
                    {accounts?.length ? (
                      <Select onValueChange={field.onChange} value={field.value?.toString() ?? ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {accounts.map(a => (
                            <SelectItem key={a.id} value={a.id.toString()}>
                              <span className="flex items-center gap-2">
                                {(a as any).color && <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: (a as any).color }} />}
                                {a.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-slate-200 bg-slate-50">
                        <Landmark className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm text-slate-400">Nenhuma conta —</span>
                        <Link href="/settings">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="text-xs text-primary font-medium hover:underline">criar agora</button>
                        </Link>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Data + Status (single mode only) */}
              {mode !== "installment" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name={"competenceDate" as any} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Competência</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={"status" as any} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="paid">Pago</SelectItem>
                          <SelectItem value="received">Recebido</SelectItem>
                          <SelectItem value="planned">Previsto</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Observações */}
              <FormField control={form.control} name={"notes" as any} render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações <span className="text-slate-400 font-normal">(opcional)</span></FormLabel>
                  <FormControl><Input placeholder="Anotações..." {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full mt-2 h-11" disabled={isPending}>
                {isPending
                  ? "Salvando..."
                  : editingTx
                    ? installmentEditScope === "group"
                      ? `Atualizar todas as ${editingTx.totalInstallments} parcelas`
                      : "Salvar alterações"
                    : mode === "installment"
                      ? `Criar ${form.getValues("totalInstallments" as any) || "N"} parcelas`
                      : "Salvar Lançamento"
                }
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <ImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImported={() => refetch()}
      />
      <QuickEntryDialog
        open={isQuickEntryOpen}
        onOpenChange={setIsQuickEntryOpen}
        categories={categories ?? []}
        accounts={accounts ?? []}
        creditCards={creditCards ?? []}
        onSaved={() => { refetch(); toast({ title: "Lançamento salvo!", description: "Registrado com sucesso." }); }}
      />

      {/* ── Conciliation Side Panel ── */}
      {conciliationOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={() => setConciliationOpen(false)}
          />
          {/* Panel */}
          <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Conciliação automática</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pares de lançamentos possivelmente duplicados encontrados automaticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConciliationOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {conciliationLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Analisando lançamentos...</span>
                </div>
              ) : conciliationCandidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
                  <p className="text-slate-600 font-medium">Nenhum duplicado detectado</p>
                  <p className="text-slate-400 text-xs mt-1">Todos os lançamentos estão devidamente conciliados.</p>
                </div>
              ) : (
                conciliationCandidates.map((pair, idx) => {
                  const isHigh = pair.confidence === "high";
                  return (
                  <div
                    key={idx}
                    className={cn(
                      "bg-white border rounded-xl p-4 shadow-sm",
                      isHigh ? "border-amber-200" : "border-slate-200"
                    )}
                  >
                    {/* Confidence badge + reason */}
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold",
                        isHigh
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", isHigh ? "bg-amber-500" : "bg-slate-400")} />
                        {isHigh ? "Alta confiança" : "Sugestão"}
                      </div>
                      <span className="text-[10px] text-slate-400 italic text-right max-w-[55%] leading-tight">
                        {pair.reason}
                      </span>
                    </div>

                    {/* Side A / Side B */}
                    <div className="flex gap-3 mb-3">
                      <div className="flex-1 bg-slate-50 rounded-lg p-3">
                        <div className="text-[10px] text-slate-400 font-medium uppercase mb-1">Lançamento A</div>
                        <div className="font-medium text-slate-800 text-sm leading-tight">{pair.a.description}</div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-slate-500">
                          <span>{new Date(pair.a.competenceDate).toLocaleDateString("pt-BR")}</span>
                          <span className="font-semibold text-slate-700">
                            {Number(pair.a.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                          {pair.a.categoryName && <span className="text-indigo-500">{pair.a.categoryName}</span>}
                        </div>
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-lg p-3">
                        <div className="text-[10px] text-slate-400 font-medium uppercase mb-1">Lançamento B</div>
                        <div className="font-medium text-slate-800 text-sm leading-tight">{pair.b.description}</div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-slate-500">
                          <span>{new Date(pair.b.competenceDate).toLocaleDateString("pt-BR")}</span>
                          <span className="font-semibold text-slate-700">
                            {Number(pair.b.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                          {pair.b.categoryName && <span className="text-indigo-500">{pair.b.categoryName}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => conciliationMerge(pair.a.id, pair.b.id)}
                        className="flex-1 text-xs py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
                      >
                        Manter A, excluir B
                      </button>
                      <button
                        type="button"
                        onClick={() => conciliationMerge(pair.b.id, pair.a.id)}
                        className="flex-1 text-xs py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
                      >
                        Manter B, excluir A
                      </button>
                      <button
                        type="button"
                        onClick={() => conciliationDismiss(pair.a.id, pair.b.id)}
                        className="px-3 text-xs py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors"
                        title="São lançamentos distintos — não é duplicata"
                      >
                        Ignorar
                      </button>
                    </div>
                  </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {!conciliationLoading && conciliationCandidates.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
                {conciliationCandidates.length} par{conciliationCandidates.length !== 1 ? "es" : ""} para revisar · Critérios: mesmo tipo, valor ±2%, data ±7 dias
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
