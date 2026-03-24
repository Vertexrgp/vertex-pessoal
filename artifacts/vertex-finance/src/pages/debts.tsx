import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  CreditCard, Plus, Edit2, Trash2, X, Check, CheckCircle2,
  AlertTriangle, DollarSign, Calendar, TrendingDown, Receipt,
  Building, Banknote, RefreshCw, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const getApiBase = () =>
  import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/[^/]*$/, "");
const apiUrl = (p: string) => `${getApiBase()}/api${p}`;

function fmtBRL(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const LABEL = "text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block";
const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 bg-white";

const BLANK_DEBT = {
  description: "", creditor: "", totalAmount: "", remainingAmount: "",
  dueDate: "", monthlyInstallment: "", status: "active", notes: "",
};

type ModalMode = "none" | "create" | "edit" | "payments" | "detail";

export default function DebtsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [modal, setModal] = useState<ModalMode>("none");
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState({ ...BLANK_DEBT });
  const [payForm, setPayForm] = useState({ amount: "", date: new Date().toISOString().split("T")[0], note: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const inv = () => qc.invalidateQueries({ queryKey: ["debts"] });
  const invDetail = () => qc.invalidateQueries({ queryKey: ["debt-detail", selected?.id] });

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ["debts"],
    queryFn: () => fetch(apiUrl("/debts")).then(r => r.json()),
  });

  const { data: debtDetail } = useQuery({
    queryKey: ["debt-detail", selected?.id],
    queryFn: () => fetch(apiUrl(`/debts/${selected?.id}`)).then(r => r.json()),
    enabled: !!selected?.id && modal === "payments",
  });

  const createDebt = useMutation({
    mutationFn: (b: any) => fetch(apiUrl("/debts"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json()),
    onSuccess: () => { inv(); setModal("none"); setForm({ ...BLANK_DEBT }); toast({ title: "Dívida registrada!" }); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const updateDebt = useMutation({
    mutationFn: ({ id, ...b }: any) => fetch(apiUrl(`/debts/${id}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json()),
    onSuccess: () => { inv(); setModal("none"); toast({ title: "Dívida atualizada!" }); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const deleteDebt = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/debts/${id}`), { method: "DELETE" }),
    onSuccess: () => { inv(); setDeleteConfirm(null); toast({ title: "Dívida removida" }); },
  });

  const registerPayment = useMutation({
    mutationFn: ({ debtId, ...b }: any) => fetch(apiUrl(`/debts/${debtId}/payments`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json()),
    onSuccess: (result) => {
      inv();
      invDetail();
      setPayForm({ amount: "", date: new Date().toISOString().split("T")[0], note: "" });
      const msg = result.newRemaining === 0 ? "🎉 Dívida quitada!" : `Saldo restante: ${fmtBRL(result.newRemaining)}`;
      toast({ title: "Pagamento registrado!", description: msg });
    },
    onError: () => toast({ title: "Erro ao registrar pagamento", variant: "destructive" }),
  });

  const deletePayment = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/debt-payments/${id}`), { method: "DELETE" }),
    onSuccess: () => { inv(); invDetail(); toast({ title: "Pagamento removido" }); },
  });

  const totalDevendo = debts.reduce((s: number, d: any) => d.status !== "paid" ? s + Number(d.remainingAmount) : s, 0);
  const totalOriginal = debts.reduce((s: number, d: any) => s + Number(d.totalAmount), 0);
  const totalPago = totalOriginal - debts.reduce((s: number, d: any) => s + Number(d.remainingAmount), 0);
  const ativas = debts.filter((d: any) => d.status !== "paid");
  const quitadas = debts.filter((d: any) => d.status === "paid");

  function openEdit(d: any) {
    setSelected(d);
    setForm({
      description: d.description,
      creditor: d.creditor,
      totalAmount: String(d.totalAmount),
      remainingAmount: String(d.remainingAmount),
      dueDate: d.dueDate || "",
      monthlyInstallment: d.monthlyInstallment ? String(d.monthlyInstallment) : "",
      status: d.status,
      notes: d.notes || "",
    });
    setModal("edit");
  }

  function openPayments(d: any) {
    setSelected(d);
    setPayForm({ amount: d.monthlyInstallment ? String(d.monthlyInstallment) : "", date: new Date().toISOString().split("T")[0], note: "" });
    setModal("payments");
  }

  function handleSave() {
    if (!form.description || !form.creditor || !form.totalAmount || !form.dueDate) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    const payload = {
      ...form,
      totalAmount: Number(form.totalAmount),
      remainingAmount: form.remainingAmount ? Number(form.remainingAmount) : Number(form.totalAmount),
      monthlyInstallment: form.monthlyInstallment ? Number(form.monthlyInstallment) : undefined,
    };
    if (modal === "create") createDebt.mutate(payload);
    else if (modal === "edit" && selected) updateDebt.mutate({ id: selected.id, ...payload });
  }

  const payments = debtDetail?.payments ?? [];
  const pctQuitado = selected ? Math.max(0, Math.min(100, ((Number(selected.totalAmount) - Number(selected.remainingAmount)) / Number(selected.totalAmount)) * 100)) : 0;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dívidas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Controle e quitação de todas as suas dívidas</p>
        </div>
        <button
          onClick={() => { setForm({ ...BLANK_DEBT }); setModal("create"); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Nova Dívida
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-rose-600 text-white rounded-2xl p-5">
          <p className="text-rose-200 text-xs font-semibold uppercase tracking-wide mb-1">Total Devendo</p>
          <p className="text-2xl font-bold">{fmtBRL(totalDevendo)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Já Pago</p>
          <p className="text-2xl font-bold text-emerald-600">{fmtBRL(totalPago)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Dívidas Ativas</p>
          <p className="text-2xl font-bold text-rose-600">{ativas.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Quitadas</p>
          <p className="text-2xl font-bold text-emerald-600">{quitadas.length}</p>
        </div>
      </div>

      {/* Debt list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">Carregando...</div>
        ) : debts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Nenhuma dívida cadastrada</p>
            <p className="text-xs text-slate-400 mt-1">Excelente! Clique em "Nova Dívida" para começar a controlar</p>
          </div>
        ) : (
          debts.map((d: any) => {
            const pago = Number(d.totalAmount) - Number(d.remainingAmount);
            const pct = Math.max(0, Math.min(100, (pago / Number(d.totalAmount)) * 100));
            const isPaid = d.status === "paid";
            const isDeleting = deleteConfirm === d.id;

            return (
              <div key={d.id} className={cn("bg-white rounded-2xl border shadow-sm overflow-hidden group transition-all", isPaid ? "border-emerald-200 opacity-70" : "border-slate-200 hover:border-primary/20 hover:shadow-md")}>
                <div className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", isPaid ? "bg-emerald-50" : "bg-rose-50")}>
                      {isPaid ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <CreditCard className="w-5 h-5 text-rose-500" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className={cn("font-bold text-slate-900", isPaid && "line-through text-slate-400")}>{d.description}</p>
                          <p className="text-xs text-slate-500">{d.creditor}{d.dueDate ? ` · Vence ${fmtDate(d.dueDate)}` : ""}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn("font-bold text-lg", isPaid ? "text-emerald-600" : "text-rose-600")}>{fmtBRL(d.remainingAmount)}</p>
                          <p className="text-[10px] text-slate-400">de {fmtBRL(d.totalAmount)}</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", isPaid ? "bg-emerald-400" : pct > 75 ? "bg-emerald-400" : pct > 40 ? "bg-amber-400" : "bg-rose-400")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={cn("text-[10px] font-bold flex-shrink-0", isPaid ? "text-emerald-600" : "text-slate-500")}>{pct.toFixed(0)}% pago</span>
                      </div>

                      {/* Footer: installment + actions */}
                      <div className="flex items-center gap-3">
                        {d.monthlyInstallment && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {fmtBRL(d.monthlyInstallment)}/mês
                          </span>
                        )}
                        {d.notes && (
                          <span className="text-[11px] text-slate-400 truncate max-w-[120px]">{d.notes}</span>
                        )}

                        {isDeleting ? (
                          <div className="ml-auto flex items-center gap-2">
                            <span className="text-xs text-rose-600 font-medium">Excluir?</span>
                            <button onClick={() => deleteDebt.mutate(d.id)} className="text-[11px] font-bold px-2 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600">Sim</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-[11px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">Não</button>
                          </div>
                        ) : (
                          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!isPaid && (
                              <button
                                onClick={() => openPayments(d)}
                                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
                                title="Registrar pagamento"
                              >
                                <DollarSign className="w-3 h-3" /> Pagar
                              </button>
                            )}
                            {!isPaid && (
                              <button
                                onClick={() => updateDebt.mutate({ id: d.id, status: "paid", remainingAmount: 0 })}
                                className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-100 flex items-center justify-center transition-colors border border-emerald-200"
                                title="Marcar como quitada"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(d)}
                              className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(d.id)}
                              className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────────────── */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal("none")}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-bold text-slate-900">{modal === "create" ? "Nova Dívida" : "Editar Dívida"}</h2>
              <button onClick={() => setModal("none")} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={LABEL}>Descrição *</label>
                <input className={INPUT} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Financiamento carro" />
              </div>
              <div>
                <label className={LABEL}>Credor *</label>
                <input className={INPUT} value={form.creditor} onChange={e => setForm(f => ({ ...f, creditor: e.target.value }))} placeholder="Ex: Banco Santander" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Valor Total (R$) *</label>
                  <input className={INPUT} type="number" step="0.01" value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} placeholder="0,00" />
                </div>
                <div>
                  <label className={LABEL}>Saldo Restante (R$)</label>
                  <input className={INPUT} type="number" step="0.01" value={form.remainingAmount} onChange={e => setForm(f => ({ ...f, remainingAmount: e.target.value }))} placeholder="Igual ao total" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Parcela Mensal (R$)</label>
                  <input className={INPUT} type="number" step="0.01" value={form.monthlyInstallment} onChange={e => setForm(f => ({ ...f, monthlyInstallment: e.target.value }))} placeholder="0,00" />
                </div>
                <div>
                  <label className={LABEL}>Vencimento *</label>
                  <input className={INPUT} type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Status</label>
                  <select className={INPUT} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Ativa</option>
                    <option value="paid">Quitada</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={LABEL}>Observações</label>
                <textarea className={cn(INPUT, "h-16 resize-none")} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Número do contrato, taxa de juros, etc..." />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3 justify-end">
              <button onClick={() => setModal("none")} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={createDebt.isPending || updateDebt.isPending}
                className="px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50"
              >
                {createDebt.isPending || updateDebt.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payments Modal ────────────────────────────────────────────────── */}
      {modal === "payments" && selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal("none")}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-bold text-slate-900">Pagamentos</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{selected.description} · {selected.creditor}</p>
                </div>
                <button onClick={() => setModal("none")} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">Pago</span>
                  <span className="text-xs text-slate-500">Restante</span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <p className="text-lg font-bold text-emerald-600">{fmtBRL(Number(selected.totalAmount) - Number(selected.remainingAmount))}</p>
                  <p className="text-lg font-bold text-rose-600">{fmtBRL(selected.remainingAmount)}</p>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all"
                    style={{ width: `${pctQuitado}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 text-center">{pctQuitado.toFixed(0)}% quitado · Total: {fmtBRL(selected.totalAmount)}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Register payment form */}
              {selected.status !== "paid" && (
                <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
                  <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Registrar pagamento
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className={LABEL}>Valor (R$) *</label>
                      <input className={INPUT} type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
                    </div>
                    <div>
                      <label className={LABEL}>Data *</label>
                      <input className={INPUT} type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                  </div>
                  <input className={cn(INPUT, "mb-3")} value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} placeholder="Observação (ex: parcela 12/60)" />
                  <button
                    onClick={() => {
                      if (!payForm.amount || !payForm.date) { toast({ title: "Preencha valor e data", variant: "destructive" }); return; }
                      registerPayment.mutate({ debtId: selected.id, amount: payForm.amount, date: payForm.date, note: payForm.note || undefined });
                    }}
                    disabled={registerPayment.isPending}
                    className="w-full py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {registerPayment.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {registerPayment.isPending ? "Registrando..." : "Registrar Pagamento"}
                  </button>
                </div>
              )}

              {/* Payment history */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Histórico de pagamentos</p>
                {payments.length === 0 ? (
                  <div className="text-center py-6">
                    <Receipt className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Nenhum pagamento registrado ainda</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 group">
                        <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-emerald-700">{fmtBRL(p.amount)}</p>
                          <p className="text-[11px] text-slate-400">{fmtDate(p.date)}{p.note ? ` · ${p.note}` : ""}</p>
                        </div>
                        <button
                          onClick={() => deletePayment.mutate(p.id)}
                          className="w-6 h-6 rounded-lg text-rose-400 hover:bg-rose-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                          title="Remover pagamento"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
