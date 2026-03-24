import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  TrendingUp, TrendingDown, Plus, Edit2, Trash2, Clock, X, Check,
  ChevronRight, BarChart3, Wallet, Building, Flag, RefreshCw,
  DollarSign, Star, Archive, AlertCircle, Minus, ArrowUpRight,
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
function fmtPct(v: number) {
  return (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
}

const CAT_COLORS: Record<string, string> = {
  "Renda Fixa": "bg-blue-100 text-blue-700",
  "Renda Variável": "bg-violet-100 text-violet-700",
  "Fundos": "bg-amber-100 text-amber-700",
  "Imóveis": "bg-emerald-100 text-emerald-700",
  "Criptomoedas": "bg-orange-100 text-orange-700",
  "Outros": "bg-slate-100 text-slate-600",
};
const CATS = ["Renda Fixa", "Renda Variável", "Fundos", "Imóveis", "Criptomoedas", "Outros"];

const LABEL = "text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block";
const INPUT = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 bg-white";

type ModalMode = "none" | "create" | "edit" | "history" | "update-value";

const BLANK = {
  description: "", category: "Renda Fixa", amount: "", date: "", status: "active", notes: "",
};

export default function AssetsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [modal, setModal] = useState<ModalMode>("none");
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [histForm, setHistForm] = useState({ amount: "", date: new Date().toISOString().split("T")[0], note: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const inv = () => qc.invalidateQueries({ queryKey: ["assets"] });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: () => fetch(apiUrl("/assets")).then(r => r.json()),
  });

  const { data: assetDetail } = useQuery({
    queryKey: ["asset-detail", selected?.id],
    queryFn: () => fetch(apiUrl(`/assets/${selected?.id}`)).then(r => r.json()),
    enabled: !!selected?.id && (modal === "history" || modal === "update-value"),
  });

  const createAsset = useMutation({
    mutationFn: (b: any) => fetch(apiUrl("/assets"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json()),
    onSuccess: () => { inv(); setModal("none"); setForm({ ...BLANK }); toast({ title: "Ativo adicionado!" }); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const updateAsset = useMutation({
    mutationFn: ({ id, ...b }: any) => fetch(apiUrl(`/assets/${id}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json()),
    onSuccess: () => { inv(); setModal("none"); toast({ title: "Ativo atualizado!" }); },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const deleteAsset = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/assets/${id}`), { method: "DELETE" }),
    onSuccess: () => { inv(); setDeleteConfirm(null); toast({ title: "Ativo removido" }); },
  });

  const addHistory = useMutation({
    mutationFn: ({ assetId, ...b }: any) => fetch(apiUrl(`/assets/${assetId}/history`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json()),
    onSuccess: () => {
      inv();
      qc.invalidateQueries({ queryKey: ["asset-detail", selected?.id] });
      setHistForm({ amount: "", date: new Date().toISOString().split("T")[0], note: "" });
      toast({ title: "Valor atualizado!", description: "Histórico registrado com sucesso" });
    },
    onError: () => toast({ title: "Erro ao registrar", variant: "destructive" }),
  });

  const deleteHistory = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/asset-history/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["asset-detail", selected?.id] }),
  });

  const totalAtual = assets.reduce((s: number, a: any) => s + Number(a.amount), 0);
  const ativos = assets.filter((a: any) => a.status === "active");
  const vendidos = assets.filter((a: any) => a.status === "sold");

  function openEdit(a: any) {
    setSelected(a);
    setForm({ description: a.description, category: a.category, amount: String(a.amount), date: a.date || "", status: a.status, notes: a.notes || "" });
    setModal("edit");
  }
  function openHistory(a: any) {
    setSelected(a);
    setHistForm({ amount: String(a.amount), date: new Date().toISOString().split("T")[0], note: "" });
    setModal("history");
  }
  function openUpdateValue(a: any) {
    setSelected(a);
    setHistForm({ amount: String(a.amount), date: new Date().toISOString().split("T")[0], note: "" });
    setModal("update-value");
  }

  function handleSave() {
    if (!form.description || !form.category || !form.amount || !form.date) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return;
    }
    if (modal === "create") {
      createAsset.mutate(form);
    } else if (modal === "edit" && selected) {
      updateAsset.mutate({ id: selected.id, ...form });
    }
  }

  const history = assetDetail?.history ?? [];
  const maxHistVal = Math.max(...history.map((h: any) => h.amount), 1);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ativos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie seus investimentos e patrimônio</p>
        </div>
        <button
          onClick={() => { setForm({ ...BLANK }); setModal("create"); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Novo Ativo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 text-white rounded-2xl p-5">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">Patrimônio Total</p>
          <p className="text-2xl font-bold">{fmtBRL(totalAtual)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Ativos</p>
          <p className="text-2xl font-bold text-emerald-600">{ativos.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Vendidos</p>
          <p className="text-2xl font-bold text-slate-400">{vendidos.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Categorias</p>
          <p className="text-2xl font-bold text-primary">{[...new Set(assets.map((a: any) => a.category))].length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Building className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-slate-900 text-sm">Meus Investimentos</h3>
          <span className="ml-auto text-xs text-slate-400">{assets.length} ativo{assets.length !== 1 ? "s" : ""}</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Carregando...</div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Nenhum ativo cadastrado</p>
            <p className="text-xs text-slate-400 mt-1">Clique em "Novo Ativo" para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Ativo</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoria</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor Atual</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {assets.map((a: any) => {
                  const catColor = CAT_COLORS[a.category] ?? CAT_COLORS["Outros"];
                  const isVendido = a.status === "sold";
                  const isDeleting = deleteConfirm === a.id;

                  return (
                    <tr key={a.id} className="group hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className={cn("font-semibold text-slate-900", isVendido && "line-through text-slate-400")}>{a.description}</p>
                            {a.notes && <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{a.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn("text-[11px] font-semibold px-2 py-1 rounded-lg", catColor)}>{a.category}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <p className={cn("font-bold", isVendido ? "text-slate-400" : "text-emerald-600")}>{fmtBRL(a.amount)}</p>
                        <p className="text-[10px] text-slate-400">{fmtDate(a.date)}</p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {isVendido ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                            <Archive className="w-3 h-3" /> Vendido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" /> Ativo
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {isDeleting ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-rose-600 font-medium">Confirmar?</span>
                            <button onClick={() => deleteAsset.mutate(a.id)} className="text-[11px] font-bold px-2 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600">Sim</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-[11px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">Não</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openUpdateValue(a)}
                              className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center transition-colors"
                              title="Atualizar valor"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openHistory(a)}
                              className="w-7 h-7 rounded-lg bg-violet-50 text-violet-500 hover:bg-violet-100 flex items-center justify-center transition-colors"
                              title="Ver histórico"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEdit(a)}
                              className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isVendido && (
                              <button
                                onClick={() => updateAsset.mutate({ id: a.id, status: "sold" })}
                                className="w-7 h-7 rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100 flex items-center justify-center transition-colors"
                                title="Marcar como vendido"
                              >
                                <Flag className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteConfirm(a.id)}
                              className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors"
                              title="Excluir"
                            >
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

      {/* ── Create / Edit Modal ───────────────────────────────────────────── */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal("none")}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">{modal === "create" ? "Novo Ativo" : "Editar Ativo"}</h2>
              <button onClick={() => setModal("none")} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={LABEL}>Descrição *</label>
                <input className={INPUT} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Tesouro Selic 2029" />
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
                    <option value="active">Ativo</option>
                    <option value="sold">Vendido</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Valor Atual (R$) *</label>
                  <input className={INPUT} type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
                </div>
                <div>
                  <label className={LABEL}>Data *</label>
                  <input className={INPUT} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Observações</label>
                <textarea className={cn(INPUT, "h-16 resize-none")} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ticker, corretora, etc..." />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3 justify-end">
              <button onClick={() => setModal("none")} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={createAsset.isPending || updateAsset.isPending}
                className="px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50"
              >
                {createAsset.isPending || updateAsset.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Update Value Modal ────────────────────────────────────────────── */}
      {modal === "update-value" && selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal("none")}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Atualizar Valor</h2>
                <p className="text-xs text-slate-500 mt-0.5">{selected.description}</p>
              </div>
              <button onClick={() => setModal("none")} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Valor atual registrado</p>
                <p className="text-2xl font-bold text-slate-900">{fmtBRL(selected.amount)}</p>
              </div>
              <div>
                <label className={LABEL}>Novo Valor (R$) *</label>
                <input className={INPUT} type="number" step="0.01" value={histForm.amount} onChange={e => setHistForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
              </div>
              <div>
                <label className={LABEL}>Data da atualização</label>
                <input className={INPUT} type="date" value={histForm.date} onChange={e => setHistForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL}>Observação</label>
                <input className={INPUT} value={histForm.note} onChange={e => setHistForm(f => ({ ...f, note: e.target.value }))} placeholder="Ex: Rendimento mensal, valorização..." />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3 justify-end">
              <button onClick={() => setModal("none")} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button
                onClick={() => {
                  if (!histForm.amount || !histForm.date) { toast({ title: "Preencha valor e data", variant: "destructive" }); return; }
                  addHistory.mutate({ assetId: selected.id, amount: histForm.amount, date: histForm.date, note: histForm.note || undefined });
                  setModal("none");
                }}
                disabled={addHistory.isPending}
                className="px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50"
              >
                {addHistory.isPending ? "Registrando..." : "Atualizar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── History Modal ─────────────────────────────────────────────────── */}
      {modal === "history" && selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal("none")}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-bold text-slate-900">Histórico de Valorização</h2>
                <p className="text-xs text-slate-500 mt-0.5">{selected.description}</p>
              </div>
              <button onClick={() => setModal("none")} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Mini chart */}
              {history.length > 1 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Evolução do valor</p>
                  <div className="flex items-end gap-1 h-16">
                    {[...history].reverse().slice(-12).map((h: any, i: number, arr: any[]) => {
                      const pct = (h.amount / maxHistVal) * 100;
                      const isLast = i === arr.length - 1;
                      return (
                        <div key={h.id} className="flex-1 flex flex-col items-center gap-1" title={`${fmtDate(h.date)}: ${fmtBRL(h.amount)}`}>
                          <div
                            className={cn("w-full rounded-t-sm transition-all", isLast ? "bg-primary" : "bg-primary/20")}
                            style={{ height: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add entry form */}
              <div className="bg-primary/5 rounded-xl border border-primary/20 p-4">
                <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-primary" /> Registrar novo valor
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={LABEL}>Valor (R$) *</label>
                    <input className={INPUT} type="number" step="0.01" value={histForm.amount} onChange={e => setHistForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
                  </div>
                  <div>
                    <label className={LABEL}>Data *</label>
                    <input className={INPUT} type="date" value={histForm.date} onChange={e => setHistForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                </div>
                <input className={cn(INPUT, "mb-3")} value={histForm.note} onChange={e => setHistForm(f => ({ ...f, note: e.target.value }))} placeholder="Observação (opcional)" />
                <button
                  onClick={() => {
                    if (!histForm.amount || !histForm.date) { toast({ title: "Preencha valor e data", variant: "destructive" }); return; }
                    addHistory.mutate({ assetId: selected.id, amount: histForm.amount, date: histForm.date, note: histForm.note || undefined });
                  }}
                  disabled={addHistory.isPending}
                  className="w-full py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50"
                >
                  {addHistory.isPending ? "Registrando..." : "Registrar"}
                </button>
              </div>

              {/* History list */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Histórico</p>
                {history.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum registro ainda</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((h: any, i: number) => {
                      const prev = history[i + 1];
                      const diff = prev ? h.amount - prev.amount : null;
                      return (
                        <div key={h.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 group">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900">{fmtBRL(h.amount)}</p>
                              {diff !== null && (
                                <span className={cn("text-[10px] font-semibold flex items-center gap-0.5", diff >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                  {diff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {diff >= 0 ? "+" : ""}{fmtBRL(Math.abs(diff))}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">{fmtDate(h.date)}{h.note ? ` · ${h.note}` : ""}</p>
                          </div>
                          <button
                            onClick={() => deleteHistory.mutate(h.id)}
                            className="w-6 h-6 rounded-lg text-rose-400 hover:bg-rose-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
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
