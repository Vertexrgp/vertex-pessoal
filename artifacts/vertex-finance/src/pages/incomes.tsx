import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  TrendingUp, Plus, Edit2, Trash2, X, Check, Copy,
  Power, DollarSign, Repeat, Briefcase,
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

const LABEL = "text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block";
const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 bg-white";

const RECURRENCES = [
  { value: "monthly", label: "Mensal" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "yearly", label: "Anual" },
  { value: "variable", label: "Variável" },
];

const BLANK = {
  description: "", source: "", amount: "", recurrence: "monthly", isActive: true, notes: "",
};

type ModalMode = "none" | "create" | "edit";

export default function IncomesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [modal, setModal] = useState<ModalMode>("none");
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const inv = () => qc.invalidateQueries({ queryKey: ["incomes"] });

  const { data: incomes = [], isLoading } = useQuery({
    queryKey: ["incomes"],
    queryFn: () => fetch(apiUrl("/incomes")).then(r => r.json()),
  });

  const createIncome = useMutation({
    mutationFn: (b: any) => fetch(apiUrl("/incomes"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b),
    }).then(r => r.json()),
    onSuccess: () => { inv(); setModal("none"); setForm({ ...BLANK }); toast({ title: "Renda adicionada!" }); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const updateIncome = useMutation({
    mutationFn: ({ id, ...b }: any) => fetch(apiUrl(`/incomes/${id}`), {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b),
    }).then(r => r.json()),
    onSuccess: () => { inv(); setModal("none"); toast({ title: "Renda atualizada!" }); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const deleteIncome = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/incomes/${id}`), { method: "DELETE" }),
    onSuccess: () => { inv(); setDeleteConfirm(null); toast({ title: "Renda removida" }); },
  });

  function openEdit(inc: any) {
    setSelected(inc);
    setForm({
      description: inc.description,
      source: inc.source,
      amount: String(inc.amount),
      recurrence: inc.recurrence || "monthly",
      isActive: inc.isActive,
      notes: inc.notes || "",
    });
    setModal("edit");
  }

  function duplicate(inc: any) {
    const { id, createdAt, ...rest } = inc;
    createIncome.mutate({ ...rest, description: `${inc.description} (cópia)` });
  }

  function handleSave() {
    if (!form.description || !form.source || !form.amount) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    const payload = { ...form, amount: Number(form.amount) };
    if (modal === "create") createIncome.mutate(payload);
    else if (modal === "edit" && selected) updateIncome.mutate({ id: selected.id, ...payload });
  }

  const displayed = showInactive ? incomes : incomes.filter((i: any) => i.isActive);

  const totalAtivo = incomes.filter((i: any) => i.isActive).reduce((s: number, i: any) => s + Number(i.amount), 0);
  const totalFontes = incomes.filter((i: any) => i.isActive).length;
  const mediaFonte = totalFontes > 0 ? totalAtivo / totalFontes : 0;

  const recurrenceLabel = (r: string) => RECURRENCES.find(x => x.value === r)?.label ?? r;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rendas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Entradas recorrentes e fontes de receita</p>
        </div>
        <button
          onClick={() => { setForm({ ...BLANK }); setModal("create"); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Nova Renda
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-violet-600 text-white rounded-2xl p-5">
          <p className="text-violet-200 text-xs font-semibold uppercase tracking-wide mb-1">Renda Total / Mês</p>
          <p className="text-2xl font-bold">{fmtBRL(totalAtivo)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Fontes Ativas</p>
          <p className="text-2xl font-bold text-slate-900">{totalFontes}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Média por Fonte</p>
          <p className="text-2xl font-bold text-violet-600">{fmtBRL(mediaFonte)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-500" />
          <h3 className="font-semibold text-slate-900 text-sm">Fontes de Renda</h3>
          <span className="ml-auto text-xs text-slate-400">{displayed.length} fonte{displayed.length !== 1 ? "s" : ""}</span>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ml-2",
              showInactive ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-white text-slate-500 border-slate-200 hover:border-primary/30")}
          >
            {showInactive ? "Ocultar inativas" : "Ver inativas"}
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Carregando...</div>
        ) : displayed.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Nenhuma renda cadastrada</p>
            <button
              onClick={() => { setForm({ ...BLANK }); setModal("create"); }}
              className="mt-3 text-xs font-semibold text-primary hover:underline"
            >
              + Adicionar renda
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Descrição</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fonte</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Frequência</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayed.map((inc: any) => {
                  const isDeleting = deleteConfirm === inc.id;
                  const active = inc.isActive;

                  return (
                    <tr key={inc.id} className={cn("group hover:bg-slate-50/70 transition-colors", !active && "opacity-60")}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", active ? "bg-violet-50" : "bg-slate-100")}>
                            <DollarSign className={cn("w-4 h-4", active ? "text-violet-500" : "text-slate-400")} />
                          </div>
                          <div>
                            <p className={cn("font-semibold text-slate-900", !active && "line-through text-slate-400")}>{inc.description}</p>
                            {inc.notes && <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{inc.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          <span className="text-sm">{inc.source}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-violet-50 text-violet-700">
                          <Repeat className="w-3 h-3" /> {recurrenceLabel(inc.recurrence)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <p className={cn("font-bold text-lg", active ? "text-violet-600" : "text-slate-400")}>{fmtBRL(Number(inc.amount))}</p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => updateIncome.mutate({ id: inc.id, isActive: !inc.isActive })}
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all hover:opacity-80",
                            active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                          )}
                          title="Clique para ativar/inativar"
                        >
                          <Power className="w-3 h-3" />
                          {active ? "Ativa" : "Inativa"}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        {isDeleting ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-rose-600 font-medium">Excluir?</span>
                            <button onClick={() => deleteIncome.mutate(inc.id)} className="text-[11px] font-bold px-2 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600">Sim</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-[11px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">Não</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => duplicate(inc)} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:bg-violet-50 hover:text-violet-500 flex items-center justify-center transition-colors" title="Duplicar">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(inc)} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors" title="Editar">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteConfirm(inc.id)} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors" title="Excluir">
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
              <h2 className="font-bold text-slate-900">{modal === "create" ? "Nova Renda" : "Editar Renda"}</h2>
              <button onClick={() => setModal("none")} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={LABEL}>Descrição *</label>
                <input className={INPUT} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Salário CLT, Freelance..." />
              </div>
              <div>
                <label className={LABEL}>Fonte / Origem *</label>
                <input className={INPUT} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Ex: Empresa XYZ, Clientes..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Valor (R$) *</label>
                  <input className={INPUT} type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
                </div>
                <div>
                  <label className={LABEL}>Frequência</label>
                  <select className={INPUT} value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}>
                    {RECURRENCES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={cn("w-10 h-6 rounded-full transition-colors relative flex-shrink-0",
                    form.isActive ? "bg-emerald-500" : "bg-slate-300")}
                >
                  <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                    form.isActive ? "translate-x-[18px]" : "translate-x-0.5")} />
                </button>
                <span className="text-sm text-slate-700 font-medium">
                  {form.isActive ? "Fonte ativa" : "Fonte inativa"}
                </span>
              </div>
              <div>
                <label className={LABEL}>Observações</label>
                <textarea className={cn(INPUT, "h-16 resize-none")} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informações adicionais..." />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3 justify-end">
              <button onClick={() => setModal("none")} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={createIncome.isPending || updateIncome.isPending}
                className="px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50"
              >
                {createIncome.isPending || updateIncome.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
