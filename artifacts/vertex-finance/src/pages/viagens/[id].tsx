import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowLeft, Plane, Calendar, DollarSign, Plus, Trash2, Check, X, MapPin, ListChecks, ReceiptText, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const getApiBase = () => import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/[^/]*$/, "");
const apiUrl = (path: string) => `${getApiBase()}/api${path}`;

const STATUS_OPTIONS = [
  { value: "planejando", label: "Planejando", color: "bg-blue-100 text-blue-700" },
  { value: "confirmada", label: "Confirmada", color: "bg-emerald-100 text-emerald-700" },
  { value: "em_andamento", label: "Em andamento", color: "bg-amber-100 text-amber-700" },
  { value: "concluida", label: "Concluída", color: "bg-slate-100 text-slate-600" },
  { value: "cancelada", label: "Cancelada", color: "bg-rose-100 text-rose-700" },
];
function getStatus(val: string) { return STATUS_OPTIONS.find(s => s.value === val) || STATUS_OPTIONS[0]; }
function fmtDate(d: string | null) { if (!d) return ""; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; }
function fmtBRL(v: string | null | number) { if (v === null || v === undefined || v === "") return "R$ 0,00"; return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

const EXPENSE_CATS = ["hospedagem", "voos", "alimentação", "transporte", "passeios", "compras", "outros"];
const DESTINO_EMOJIS: Record<string, string> = { "miami": "🌊", "nova york": "🗽", "paris": "🗼", "portugal": "🇵🇹", "japão": "🗾", "italia": "🇮🇹", "cancun": "🏖️", "disney": "🏰", "default": "✈️" };
function getEmoji(destino: string) { const lower = destino?.toLowerCase() || ""; for (const key of Object.keys(DESTINO_EMOJIS)) { if (lower.includes(key)) return DESTINO_EMOJIS[key]; } return DESTINO_EMOJIS.default; }

type TabId = "despesas" | "checklist" | "roteiro";

interface Props { id: string; }

export default function ViagemDetailPage({ id }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<TabId>("despesas");
  const [expenseForm, setExpenseForm] = useState({ descricao: "", valor: "", categoria: "outros", data: "" });
  const [checkItem, setCheckItem] = useState("");
  const [roteiroForm, setRoteiroForm] = useState({ dia: "1", titulo: "", hora: "", descricao: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["viagem-detail", id],
    queryFn: () => fetch(apiUrl(`/viagens/trips/${id}`)).then(r => r.json()),
    enabled: !!id,
  });

  const addExpense = useMutation({
    mutationFn: (body: object) => fetch(apiUrl(`/viagens/trips/${id}/expenses`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["viagem-detail", id] }); setExpenseForm({ descricao: "", valor: "", categoria: "outros", data: "" }); toast({ title: "Despesa adicionada" }); },
  });
  const deleteExpense = useMutation({
    mutationFn: (eid: number) => fetch(apiUrl(`/viagens/expenses/${eid}`), { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["viagem-detail", id] }),
  });
  const addCheck = useMutation({
    mutationFn: (item: string) => fetch(apiUrl(`/viagens/trips/${id}/checklist`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["viagem-detail", id] }); setCheckItem(""); },
  });
  const toggleCheck = useMutation({
    mutationFn: ({ cid, concluido }: { cid: number; concluido: boolean }) => fetch(apiUrl(`/viagens/checklist/${cid}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ concluido }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["viagem-detail", id] }),
  });
  const deleteCheck = useMutation({
    mutationFn: (cid: number) => fetch(apiUrl(`/viagens/checklist/${cid}`), { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["viagem-detail", id] }),
  });
  const addRoteiro = useMutation({
    mutationFn: (body: object) => fetch(apiUrl(`/viagens/trips/${id}/roteiro`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["viagem-detail", id] }); setRoteiroForm({ dia: "1", titulo: "", hora: "", descricao: "" }); toast({ title: "Item adicionado ao roteiro" }); },
  });
  const deleteRoteiro = useMutation({
    mutationFn: (rid: number) => fetch(apiUrl(`/viagens/roteiro/${rid}`), { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["viagem-detail", id] }),
  });

  if (isLoading) return <AppLayout><div className="text-center py-20 text-slate-400">Carregando...</div></AppLayout>;
  if (!data?.trip) return <AppLayout><div className="text-center py-20 text-slate-500">Viagem não encontrada.</div></AppLayout>;

  const { trip, expenses = [], checklist = [], roteiro = [] } = data;
  const st = getStatus(trip.status);
  const totalGasto = expenses.reduce((s: number, e: any) => s + Number(e.valor), 0);
  const orcamento = trip.orcamento ? Number(trip.orcamento) : null;
  const progresso = orcamento ? Math.min(100, (totalGasto / orcamento) * 100) : null;
  const concluidos = checklist.filter((c: any) => c.concluido).length;

  // Group roteiro by day
  const roteiroByDay: Record<number, any[]> = {};
  roteiro.forEach((r: any) => { if (!roteiroByDay[r.dia]) roteiroByDay[r.dia] = []; roteiroByDay[r.dia].push(r); });

  const TABS = [
    { id: "despesas" as TabId, label: "Despesas", icon: ReceiptText, count: expenses.length },
    { id: "checklist" as TabId, label: "Checklist", icon: ListChecks, count: `${concluidos}/${checklist.length}` },
    { id: "roteiro" as TabId, label: "Roteiro", icon: Route, count: roteiro.length },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button onClick={() => setLocation("/viagens")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Minhas Viagens
          </button>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{getEmoji(trip.destino)}</div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">{trip.destino}</h1>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", st.color)}>{st.label}</span>
                </div>
                {(trip.dataInicio || trip.dataFim) && (
                  <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {fmtDate(trip.dataInicio)}{trip.dataFim ? ` → ${fmtDate(trip.dataFim)}` : ""}
                  </p>
                )}
                {trip.descricao && <p className="text-sm text-slate-500 mt-1">{trip.descricao}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Orçamento</p>
            <p className="text-lg font-bold text-slate-900">{orcamento ? fmtBRL(orcamento) : "—"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Gasto</p>
            <p className={cn("text-lg font-bold", orcamento && totalGasto > orcamento ? "text-rose-600" : "text-slate-900")}>{fmtBRL(totalGasto)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Saldo</p>
            <p className={cn("text-lg font-bold", orcamento ? (orcamento - totalGasto >= 0 ? "text-emerald-600" : "text-rose-600") : "text-slate-900")}>
              {orcamento ? fmtBRL(orcamento - totalGasto) : "—"}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Checklist</p>
            <p className="text-lg font-bold text-slate-900">{concluidos}/{checklist.length}</p>
          </div>
        </div>

        {orcamento && progresso !== null && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">Uso do orçamento</p>
              <p className="text-xs font-bold text-slate-700">{progresso.toFixed(0)}%</p>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", progresso > 100 ? "bg-rose-500" : progresso > 80 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(progresso, 100)}%` }} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div>
          <div className="flex gap-1 border-b border-slate-200 mb-6">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors", tab === t.id ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700")}>
                  <Icon className="w-4 h-4" />
                  {t.label}
                  <span className={cn("text-xs px-1.5 py-0.5 rounded-md font-medium", tab === t.id ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500")}>{t.count}</span>
                </button>
              );
            })}
          </div>

          {/* Despesas */}
          {tab === "despesas" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Adicionar despesa</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <input value={expenseForm.descricao} onChange={e => setExpenseForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição *" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input type="number" value={expenseForm.valor} onChange={e => setExpenseForm(f => ({ ...f, valor: e.target.value }))} placeholder="Valor (R$) *" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <select value={expenseForm.categoria} onChange={e => setExpenseForm(f => ({ ...f, categoria: e.target.value }))} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {EXPENSE_CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                  <button onClick={() => { if (!expenseForm.descricao || !expenseForm.valor) { toast({ title: "Preencha descrição e valor", variant: "destructive" }); return; } addExpense.mutate({ ...expenseForm, valor: parseFloat(expenseForm.valor) }); }} disabled={addExpense.isPending} className="flex items-center justify-center gap-2 bg-primary text-white rounded-xl px-3 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                  <ReceiptText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-slate-400 text-sm">Nenhuma despesa registrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {expenses.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-4 p-3.5 bg-white rounded-xl border border-slate-200 group hover:border-slate-300 transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{e.descricao}</p>
                        <p className="text-xs text-slate-500 mt-0.5 capitalize">{e.categoria}{e.data ? ` · ${fmtDate(e.data)}` : ""}</p>
                      </div>
                      <p className="font-bold text-slate-900">{fmtBRL(e.valor)}</p>
                      <button onClick={() => deleteExpense.mutate(e.id)} className="text-slate-200 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3.5 py-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-sm font-semibold text-slate-700">Total</span>
                    <span className="text-sm font-bold text-slate-900">{fmtBRL(totalGasto)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Checklist */}
          {tab === "checklist" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex gap-2">
                  <input value={checkItem} onChange={e => setCheckItem(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && checkItem.trim()) addCheck.mutate(checkItem.trim()); }} placeholder="Adicionar item (ex: Passaporte, Câmera...)" className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <button onClick={() => { if (checkItem.trim()) addCheck.mutate(checkItem.trim()); }} disabled={!checkItem.trim()} className="flex items-center gap-2 bg-primary text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-40">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {checklist.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                  <ListChecks className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-slate-400 text-sm">Nenhum item no checklist</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {checklist.map((c: any, idx: number) => (
                    <div key={c.id} className={cn("flex items-center gap-3 px-4 py-3.5 group hover:bg-slate-50 transition-colors", idx > 0 && "border-t border-slate-100")}>
                      <button onClick={() => toggleCheck.mutate({ cid: c.id, concluido: !c.concluido })} className={cn("w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all", c.concluido ? "bg-emerald-500 border-emerald-500" : "border-slate-300 hover:border-primary")}>
                        {c.concluido && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <span className={cn("flex-1 text-sm", c.concluido ? "text-slate-400 line-through" : "text-slate-900")}>{c.item}</span>
                      <button onClick={() => deleteCheck.mutate(c.id)} className="text-slate-200 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                    <p className="text-xs text-slate-500">{concluidos} de {checklist.length} concluídos</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Roteiro */}
          {tab === "roteiro" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Adicionar ao roteiro</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <input type="number" min="1" value={roteiroForm.dia} onChange={e => setRoteiroForm(f => ({ ...f, dia: e.target.value }))} placeholder="Dia" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input value={roteiroForm.titulo} onChange={e => setRoteiroForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título *" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input type="time" value={roteiroForm.hora} onChange={e => setRoteiroForm(f => ({ ...f, hora: e.target.value }))} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <button onClick={() => { if (!roteiroForm.titulo) { toast({ title: "Preencha o título", variant: "destructive" }); return; } addRoteiro.mutate({ dia: parseInt(roteiroForm.dia), titulo: roteiroForm.titulo, hora: roteiroForm.hora, descricao: roteiroForm.descricao }); }} disabled={addRoteiro.isPending} className="flex items-center justify-center gap-2 bg-primary text-white rounded-xl px-3 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>
              </div>

              {roteiro.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                  <Route className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-slate-400 text-sm">Roteiro vazio — comece planejando seu dia a dia</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(roteiroByDay).sort(([a], [b]) => Number(a) - Number(b)).map(([dia, items]) => (
                    <div key={dia} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <p className="text-sm font-bold text-slate-800">Dia {dia}</p>
                      </div>
                      {(items as any[]).map((r: any, idx: number) => (
                        <div key={r.id} className={cn("flex items-start gap-3 px-4 py-3.5 group hover:bg-slate-50 transition-colors", idx > 0 && "border-t border-slate-100")}>
                          <div className="w-12 text-xs font-medium text-slate-400 pt-0.5 flex-shrink-0">{r.hora || "—"}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">{r.titulo}</p>
                            {r.descricao && <p className="text-xs text-slate-500 mt-0.5">{r.descricao}</p>}
                          </div>
                          <button onClick={() => deleteRoteiro.mutate(r.id)} className="text-slate-200 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
