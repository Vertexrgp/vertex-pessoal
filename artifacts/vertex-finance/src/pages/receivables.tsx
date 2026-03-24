import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  HandCoins, Plus, CheckCircle2, Clock, Edit2, Trash2, X, Check,
  AlertCircle, Copy, ArrowDownToLine,
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
function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

const LABEL = "text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block";
const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 bg-white";

const CATS = ["Empréstimo", "Aluguel", "Serviço Prestado", "Venda", "Dividendo", "Renda Extra", "Outros"];
const RECURRENCE = ["Nenhuma", "Mensal", "Semanal", "Anual"];

const BLANK = {
  description: "", category: "Empréstimo", amount: "", dueDate: "",
  status: "pending", recurrence: "", notes: "",
};

type ModalMode = "none" | "create" | "edit";

export default function ReceivablesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [modal, setModal] = useState<ModalMode>("none");
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "received" | "overdue">("all");

  const inv = () => qc.invalidateQueries({ queryKey: ["receivables"] });

  const { data: receivables = [], isLoading } = useQuery({
    queryKey: ["receivables"],
    queryFn: () => fetch(apiUrl("/receivables")).then(r => r.json()),
  });

  const createRec = useMutation({
    mutationFn: (b: any) => fetch(apiUrl("/receivables"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b),
    }).then(r => r.json()),
    onSuccess: () => { inv(); setModal("none"); setForm({ ...BLANK }); toast({ title: "Recebível criado!" }); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const updateRec = useMutation({
    mutationFn: ({ id, ...b }: any) => fetch(apiUrl(`/receivables/${id}`), {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b),
    }).then(r => r.json()),
    onSuccess: () => { inv(); setModal("none"); toast({ title: "Recebível atualizado!" }); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const deleteRec = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/receivables/${id}`), { method: "DELETE" }),
    onSuccess: () => { inv(); setDeleteConfirm(null); toast({ title: "Recebível removido" }); },
  });

  const markReceived = (r: any) =>
    updateRec.mutate({ id: r.id, status: r.status === "received" ? "pending" : "received" });

  const duplicate = (r: any) => {
    const { id, createdAt, ...rest } = r;
    createRec.mutate({ ...rest, description: `${r.description} (cópia)`, status: "pending" });
  };

  function openEdit(r: any) {
    setSelected(r);
    setForm({
      description: r.description,
      category: r.category,
      amount: String(r.amount),
      dueDate: r.dueDate || "",
      status: r.status,
      recurrence: r.recurrence || "",
      notes: r.notes || "",
    });
    setModal("edit");
  }

  function handleSave() {
    if (!form.description || !form.category || !form.amount || !form.dueDate) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    const payload = { ...form, amount: Number(form.amount), recurrence: form.recurrence || null };
    if (modal === "create") createRec.mutate(payload);
    else if (modal === "edit" && selected) updateRec.mutate({ id: selected.id, ...payload });
  }

  const filtered = receivables.filter((r: any) => {
    if (filter === "pending") return r.status === "pending";
    if (filter === "received") return r.status === "received";
    if (filter === "overdue") return r.status === "pending" && isOverdue(r.dueDate);
    return true;
  });

  const total = receivables.reduce((s: number, r: any) => s + Number(r.amount), 0);
  const pendente = receivables.filter((r: any) => r.status === "pending").reduce((s: number, r: any) => s + Number(r.amount), 0);
  const recebido = receivables.filter((r: any) => r.status === "received").reduce((s: number, r: any) => s + Number(r.amount), 0);
  const vencido = receivables.filter((r: any) => r.status === "pending" && isOverdue(r.dueDate)).length;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recebíveis</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tudo que você tem a receber</p>
        </div>
        <button
          onClick={() => { setForm({ ...BLANK }); setModal("create"); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Novo Recebível
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-600 text-white rounded-2xl p-5">
          <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-1">Total a Receber</p>
          <p className="text-2xl font-bold">{fmtBRL(total)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Pendente</p>
          <p className="text-2xl font-bold text-amber-600">{fmtBRL(pendente)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Já Recebido</p>
          <p className="text-2xl font-bold text-emerald-600">{fmtBRL(recebido)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Vencidos</p>
          <p className="text-2xl font-bold text-rose-600">{vencido}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(["all", "pending", "received", "overdue"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
              filter === f
                ? "bg-primary text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:border-primary/30"
            )}
          >
            {{ all: "Todos", pending: "Pendentes", received: "Recebidos", overdue: "Vencidos" }[f]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-slate-900 text-sm">Lista de Recebíveis</h3>
          <span className="ml-auto text-xs text-slate-400">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <HandCoins className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">
              {filter === "all" ? "Nenhum recebível cadastrado" : "Nenhum item nesta categoria"}
            </p>
            {filter === "all" && (
              <button
                onClick={() => { setForm({ ...BLANK }); setModal("create"); }}
                className="mt-3 text-xs font-semibold text-primary hover:underline"
              >
                + Adicionar recebível
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Descrição</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoria</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vencimento</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((r: any) => {
                  const overdue = r.status === "pending" && isOverdue(r.dueDate);
                  const isDeleting = deleteConfirm === r.id;
                  const isReceived = r.status === "received";

                  return (
                    <tr key={r.id} className="group hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                            isReceived ? "bg-emerald-50" : overdue ? "bg-rose-50" : "bg-blue-50")}>
                            <HandCoins className={cn("w-4 h-4", isReceived ? "text-emerald-500" : overdue ? "text-rose-500" : "text-blue-500")} />
                          </div>
                          <div>
                            <p className={cn("font-semibold text-slate-900", isReceived && "line-through text-slate-400")}>{r.description}</p>
                            {r.notes && <p className="text-[11px] text-slate-400 truncate max-w-[160px]">{r.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-blue-50 text-blue-700">{r.category}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn("text-sm", overdue ? "text-rose-600 font-semibold" : "text-slate-500")}>
                          {fmtDate(r.dueDate)}
                          {overdue && <span className="text-[10px] ml-1 font-bold">(VENCIDO)</span>}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <p className={cn("font-bold", isReceived ? "text-slate-400" : "text-blue-600")}>{fmtBRL(Number(r.amount))}</p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => markReceived(r)}
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all hover:opacity-80",
                            isReceived
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}
                          title="Clique para alternar status"
                        >
                          {isReceived ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {isReceived ? "Recebido" : "Pendente"}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        {isDeleting ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-rose-600 font-medium">Excluir?</span>
                            <button onClick={() => deleteRec.mutate(r.id)} className="text-[11px] font-bold px-2 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600">Sim</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-[11px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">Não</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => duplicate(r)} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-500 flex items-center justify-center transition-colors" title="Duplicar">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(r)} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors" title="Editar">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteConfirm(r.id)} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors" title="Excluir">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal("none")}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">{modal === "create" ? "Novo Recebível" : "Editar Recebível"}</h2>
              <button onClick={() => setModal("none")} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={LABEL}>Descrição *</label>
                <input className={INPUT} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Empréstimo João" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Categoria *</label>
                  <select className={INPUT} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Status</label>
                  <select className={INPUT} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="pending">Pendente</option>
                    <option value="received">Recebido</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Valor (R$) *</label>
                  <input className={INPUT} type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
                </div>
                <div>
                  <label className={LABEL}>Vencimento *</label>
                  <input className={INPUT} type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Recorrência</label>
                <select className={INPUT} value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}>
                  {RECURRENCE.map(r => <option key={r} value={r === "Nenhuma" ? "" : r.toLowerCase()}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Observações</label>
                <textarea className={cn(INPUT, "h-16 resize-none")} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Detalhes adicionais..." />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3 justify-end">
              <button onClick={() => setModal("none")} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={createRec.isPending || updateRec.isPending}
                className="px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50"
              >
                {createRec.isPending || updateRec.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
