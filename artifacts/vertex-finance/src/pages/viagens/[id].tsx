import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  ArrowLeft, Calendar, DollarSign, Plus, Trash2, Check, X,
  MapPin, ListChecks, ReceiptText, Route, Camera, Eye, Star,
  Clock, Navigation, Tag, FileText, Globe, Sparkles, ChevronDown,
  BookOpen, Flag, CheckCircle2, Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const getApiBase = () => import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/[^/]*$/, "");
const apiUrl = (path: string) => `${getApiBase()}/api${path}`;

function fmtBRL(v: string | null | number) {
  if (v === null || v === undefined || v === "") return "R$ 0,00";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: string | null) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function daysBetween(a: string | null, b: string | null) {
  if (!a || !b) return null;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1;
}

const STATUS_OPTIONS = [
  { value: "planejando",   label: "Planejando",    color: "bg-blue-100 text-blue-700" },
  { value: "confirmada",   label: "Confirmada",    color: "bg-emerald-100 text-emerald-700" },
  { value: "em_andamento", label: "Em andamento",  color: "bg-amber-100 text-amber-700" },
  { value: "concluida",    label: "Concluída",     color: "bg-slate-100 text-slate-600" },
  { value: "cancelada",    label: "Cancelada",     color: "bg-rose-100 text-rose-700" },
];
function getStatus(v: string) { return STATUS_OPTIONS.find(s => s.value === v) ?? STATUS_OPTIONS[0]; }

const DESTINO_EMOJI: Record<string, string> = {
  "paris":"🗼","nova york":"🗽","miami":"🌊","japão":"⛩️","portugal":"🇵🇹",
  "italia":"🍕","cancun":"🏖️","disney":"🏰","canadá":"🍁","default":"✈️",
};
function getEmoji(d: string) {
  const l = (d ?? "").toLowerCase();
  for (const k of Object.keys(DESTINO_EMOJI)) if (l.includes(k)) return DESTINO_EMOJI[k];
  return DESTINO_EMOJI.default;
}

const CATEGORIAS_LUGAR = [
  { value: "ponto_turistico", label: "Ponto turístico", emoji: "🏛️" },
  { value: "restaurante",     label: "Restaurante",     emoji: "🍽️" },
  { value: "hotel",           label: "Hotel / Hospedagem", emoji: "🏨" },
  { value: "bar",             label: "Bar / Café",      emoji: "☕" },
  { value: "museu",           label: "Museu",           emoji: "🎨" },
  { value: "parque",          label: "Parque / Natureza", emoji: "🌿" },
  { value: "compras",         label: "Compras",         emoji: "🛍️" },
  { value: "transporte",      label: "Transporte",      emoji: "🚗" },
  { value: "praia",           label: "Praia",           emoji: "🏖️" },
  { value: "outro",           label: "Outro",           emoji: "📍" },
];
function getCatEmoji(cat: string) {
  return CATEGORIAS_LUGAR.find(c => c.value === cat)?.emoji ?? "📍";
}
function getCatLabel(cat: string) {
  return CATEGORIAS_LUGAR.find(c => c.value === cat)?.label ?? cat;
}

const EXPENSE_CATS = ["hospedagem","voos","alimentação","transporte","passeios","compras","outros"];
const TIPO_ROTEIRO = ["atividade","refeição","transporte","hotel","compras","outro"];

type TabId = "visao-geral" | "roteiro" | "lugares" | "mapa" | "despesas" | "checklist" | "memorias";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "visao-geral", label: "Visão Geral", icon: Eye },
  { id: "roteiro",     label: "Roteiro",     icon: Route },
  { id: "lugares",     label: "Lugares",     icon: MapPin },
  { id: "mapa",        label: "Mapa",        icon: Globe },
  { id: "despesas",    label: "Despesas",    icon: ReceiptText },
  { id: "checklist",   label: "Checklist",   icon: ListChecks },
  { id: "memorias",    label: "Memórias",    icon: Camera },
];

interface Props { id: string; }

export default function ViagemDetailPage({ id }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, nav] = useLocation();
  const [tab, setTab] = useState<TabId>("visao-geral");
  const tripId = id;

  // ── Forms ────────────────────────────────────────────────────────────────
  const [lugarForm, setLugarForm] = useState({
    nome: "", endereco: "", categoria: "ponto_turistico", descricao: "",
    notas: "", horario: "", comoChegar: "", prioridade: "media", status: "planejado",
  });
  const [showLugarForm, setShowLugarForm] = useState(false);

  const [roteiroForm, setRoteiroForm] = useState({ dia: "1", titulo: "", hora: "", descricao: "", tipo: "atividade", lugarId: "" });
  const [expenseForm, setExpenseForm] = useState({ descricao: "", valor: "", categoria: "outros", data: "" });
  const [checkItem, setCheckItem] = useState("");
  const [checkFase, setCheckFase] = useState("antes");
  const [memoriaForm, setMemoriaForm] = useState({ titulo: "", conteudo: "", data: "", dia: "", tipo: "nota" });
  const [showMemForm, setShowMemForm] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["viagem-detail", tripId],
    queryFn: () => fetch(apiUrl(`/viagens/trips/${tripId}`)).then(r => r.json()),
    enabled: !!tripId,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const inv = () => qc.invalidateQueries({ queryKey: ["viagem-detail", tripId] });

  const addLugar     = useMutation({ mutationFn: (b: any) => fetch(apiUrl(`/viagens/trips/${tripId}/lugares`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json()), onSuccess: () => { inv(); setShowLugarForm(false); setLugarForm({ nome:"", endereco:"", categoria:"ponto_turistico", descricao:"", notas:"", horario:"", comoChegar:"", prioridade:"media", status:"planejado" }); toast({ title: "Lugar adicionado" }); } });
  const updateLugar  = useMutation({ mutationFn: ({ id, ...b }: any) => fetch(apiUrl(`/viagens/lugares/${id}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json()), onSuccess: inv });
  const deleteLugar  = useMutation({ mutationFn: (id: number) => fetch(apiUrl(`/viagens/lugares/${id}`), { method: "DELETE" }).then(r => r.json()), onSuccess: inv });
  const addRoteiro   = useMutation({ mutationFn: (b: any) => fetch(apiUrl(`/viagens/trips/${tripId}/roteiro`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json()), onSuccess: () => { inv(); setRoteiroForm({ dia: "1", titulo: "", hora: "", descricao: "", tipo: "atividade", lugarId: "" }); toast({ title: "Adicionado ao roteiro" }); } });
  const delRoteiro   = useMutation({ mutationFn: (id: number) => fetch(apiUrl(`/viagens/roteiro/${id}`), { method: "DELETE" }).then(r => r.json()), onSuccess: inv });
  const addExpense   = useMutation({ mutationFn: (b: any) => fetch(apiUrl(`/viagens/trips/${tripId}/expenses`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json()), onSuccess: () => { inv(); setExpenseForm({ descricao:"", valor:"", categoria:"outros", data:"" }); toast({ title: "Despesa registrada" }); } });
  const delExpense   = useMutation({ mutationFn: (id: number) => fetch(apiUrl(`/viagens/expenses/${id}`), { method: "DELETE" }).then(r => r.json()), onSuccess: inv });
  const addCheck     = useMutation({ mutationFn: ({ item, fase }: any) => fetch(apiUrl(`/viagens/trips/${tripId}/checklist`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item, fase }) }).then(r => r.json()), onSuccess: () => { inv(); setCheckItem(""); } });
  const toggleCheck  = useMutation({ mutationFn: ({ cid, concluido }: any) => fetch(apiUrl(`/viagens/checklist/${cid}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ concluido }) }).then(r => r.json()), onSuccess: inv });
  const delCheck     = useMutation({ mutationFn: (id: number) => fetch(apiUrl(`/viagens/checklist/${id}`), { method: "DELETE" }).then(r => r.json()), onSuccess: inv });
  const addMemoria   = useMutation({ mutationFn: (b: any) => fetch(apiUrl(`/viagens/trips/${tripId}/memorias`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json()), onSuccess: () => { inv(); setShowMemForm(false); setMemoriaForm({ titulo:"", conteudo:"", data:"", dia:"", tipo:"nota" }); toast({ title: "Memória registrada" }); } });
  const delMemoria   = useMutation({ mutationFn: (id: number) => fetch(apiUrl(`/viagens/memorias/${id}`), { method: "DELETE" }).then(r => r.json()), onSuccess: inv });

  if (isLoading) return <AppLayout><div className="flex items-center justify-center py-32 text-slate-400">Carregando...</div></AppLayout>;
  if (!data?.trip) return <AppLayout><div className="text-center py-24 text-slate-500">Viagem não encontrada.</div></AppLayout>;

  const { trip, expenses = [], checklist = [], roteiro = [], lugares = [], memorias = [] } = data;
  const st = getStatus(trip.status);
  const totalGasto = expenses.reduce((s: number, e: any) => s + Number(e.valor), 0);
  const orcamento = trip.orcamento ? Number(trip.orcamento) : null;
  const progresso = orcamento ? Math.min(100, (totalGasto / orcamento) * 100) : null;
  const concluidos = checklist.filter((c: any) => c.concluido).length;
  const dias = daysBetween(trip.dataInicio, trip.dataFim);
  const lugaresVisitados = lugares.filter((l: any) => l.status === "visitado").length;

  // Group roteiro by day
  const roteiroByDay: Record<number, any[]> = {};
  roteiro.forEach((r: any) => { if (!roteiroByDay[r.dia]) roteiroByDay[r.dia] = []; roteiroByDay[r.dia].push(r); });

  // Checklist by phase
  const checklistAntes    = checklist.filter((c: any) => c.fase === "antes");
  const checklistDurante  = checklist.filter((c: any) => c.fase === "durante");

  return (
    <AppLayout>
      {/* Back */}
      <button onClick={() => nav("/viagens")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-5">
        <ArrowLeft className="w-4 h-4" /> Minhas Viagens
      </button>

      {/* Hero header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="h-2 bg-gradient-to-r from-orange-400 via-primary to-sky-500" />
        <div className="p-6">
          <div className="flex items-start gap-5">
            <div className="text-5xl flex-shrink-0">{getEmoji(trip.destino)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl font-display font-bold text-slate-900">{trip.destino}</h1>
                <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", st.color)}>{st.label}</span>
              </div>
              {(trip.dataInicio || trip.dataFim) && (
                <p className="text-sm text-slate-500 flex items-center gap-2 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {fmtDate(trip.dataInicio)}{trip.dataFim ? ` → ${fmtDate(trip.dataFim)}` : ""}
                  {dias && <span className="text-primary font-semibold">{dias} dias</span>}
                </p>
              )}
              {trip.descricao && <p className="text-sm text-slate-500 mt-1">{trip.descricao}</p>}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-100">
            <KpiMini label="Orçamento"    value={orcamento ? fmtBRL(orcamento) : "—"} />
            <KpiMini label="Gasto"        value={fmtBRL(totalGasto)}  color={orcamento && totalGasto > orcamento ? "text-rose-600" : "text-slate-900"} />
            <KpiMini label="Saldo"        value={orcamento ? fmtBRL(orcamento - totalGasto) : "—"} color={orcamento ? (orcamento - totalGasto >= 0 ? "text-emerald-600" : "text-rose-600") : ""} />
            <KpiMini label="Lugares"      value={`${lugaresVisitados}/${lugares.length}`} />
            <KpiMini label="Checklist"    value={`${concluidos}/${checklist.length}`} />
          </div>

          {/* Budget bar */}
          {orcamento && progresso !== null && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500 font-medium">Uso do orçamento</span>
                <span className={cn("font-bold", progresso > 100 ? "text-rose-600" : "text-emerald-600")}>{progresso.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", progresso > 100 ? "bg-rose-500" : progresso > 80 ? "bg-amber-400" : "bg-emerald-500")} style={{ width: `${Math.min(progresso, 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const counts: Record<string, string | number> = {
            "roteiro": roteiro.length, "lugares": lugares.length, "despesas": expenses.length,
            "checklist": `${concluidos}/${checklist.length}`, "memorias": memorias.length,
          };
          const count = counts[t.id];
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap flex-shrink-0",
                tab === t.id ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {count !== undefined && Number(String(count).split("/")[0]) > 0 && (
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-medium", tab === t.id ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── VISÃO GERAL ────────────────────────────────────────────────────────── */}
      {tab === "visao-geral" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Quick summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Resumo da viagem</h3>
            <div className="space-y-3 text-sm">
              <Row icon={Calendar} label="Período" value={`${fmtDate(trip.dataInicio) || "—"} → ${fmtDate(trip.dataFim) || "—"}${dias ? ` (${dias} dias)` : ""}`} />
              <Row icon={Globe} label="Destino" value={`${trip.cidade ? trip.cidade + ", " : ""}${trip.pais || trip.destino}`} />
              <Row icon={DollarSign} label="Orçamento" value={orcamento ? fmtBRL(orcamento) : "Não definido"} />
              <Row icon={ReceiptText} label="Total gasto" value={fmtBRL(totalGasto)} />
              <Row icon={MapPin} label="Lugares salvos" value={`${lugares.length} (${lugaresVisitados} visitados)`} />
              <Row icon={ListChecks} label="Checklist" value={`${concluidos} de ${checklist.length} concluídos`} />
            </div>
          </div>

          {/* Top lugares */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Lugares prioritários</h3>
            {lugares.length === 0 ? (
              <EmptyState icon={MapPin} msg="Nenhum lugar salvo ainda" action="Adicione lugares na aba Lugares" />
            ) : (
              <div className="space-y-2">
                {lugares.filter((l: any) => l.prioridade === "alta").slice(0, 5).map((l: any) => (
                  <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <span className="text-lg flex-shrink-0">{getCatEmoji(l.categoria)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{l.nome}</p>
                      <p className="text-xs text-slate-500 truncate">{getCatLabel(l.categoria)}</p>
                    </div>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0", l.status === "visitado" ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-600")}>
                      {l.status === "visitado" ? "✓ Visitado" : "Planejado"}
                    </span>
                  </div>
                ))}
                {lugares.filter((l: any) => l.prioridade !== "alta").length > 0 && lugares.filter((l: any) => l.prioridade === "alta").length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">Nenhum lugar de alta prioridade</p>
                )}
              </div>
            )}
          </div>

          {/* Despesas por categoria */}
          {expenses.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 md:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Despesas por categoria</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(expenses.reduce((acc: any, e: any) => { acc[e.categoria] = (acc[e.categoria] || 0) + Number(e.valor); return acc; }, {})).map(([cat, val]) => (
                  <div key={cat} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 capitalize mb-1">{cat}</p>
                    <p className="text-sm font-bold text-slate-900">{fmtBRL(val as number)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ROTEIRO ────────────────────────────────────────────────────────────── */}
      {tab === "roteiro" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Adicionar ao roteiro</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Dia</label>
                <input type="number" min="1" value={roteiroForm.dia} onChange={e => setRoteiroForm(f => ({ ...f, dia: e.target.value }))} className={INPUT} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Horário</label>
                <input type="time" value={roteiroForm.hora} onChange={e => setRoteiroForm(f => ({ ...f, hora: e.target.value }))} className={INPUT} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tipo</label>
                <select value={roteiroForm.tipo} onChange={e => setRoteiroForm(f => ({ ...f, tipo: e.target.value }))} className={INPUT}>
                  {TIPO_ROTEIRO.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Título *</label>
                <input value={roteiroForm.titulo} onChange={e => setRoteiroForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Visita ao Museu Nacional" className={INPUT} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Vincular lugar</label>
                <select value={roteiroForm.lugarId} onChange={e => setRoteiroForm(f => ({ ...f, lugarId: e.target.value }))} className={INPUT}>
                  <option value="">— Sem vínculo —</option>
                  {lugares.map((l: any) => <option key={l.id} value={l.id}>{getCatEmoji(l.categoria)} {l.nome}</option>)}
                </select>
              </div>
            </div>
            <input value={roteiroForm.descricao} onChange={e => setRoteiroForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição / notas..." className={cn(INPUT, "w-full mb-3")} />
            <button
              onClick={() => {
                if (!roteiroForm.titulo || !roteiroForm.dia) { toast({ title: "Título e dia são obrigatórios", variant: "destructive" }); return; }
                addRoteiro.mutate({ ...roteiroForm, dia: parseInt(roteiroForm.dia), lugarId: roteiroForm.lugarId ? parseInt(roteiroForm.lugarId) : null });
              }}
              disabled={addRoteiro.isPending}
              className={BTN_PRIMARY}
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>

          {roteiro.length === 0 ? (
            <EmptyState icon={Route} msg="Roteiro vazio" action="Planeje seu itinerário dia a dia" />
          ) : (
            <div className="space-y-4">
              {Object.entries(roteiroByDay).sort(([a], [b]) => Number(a) - Number(b)).map(([dia, items]) => (
                <div key={dia} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{dia}</div>
                    <p className="text-sm font-bold text-slate-800">Dia {dia}</p>
                    <span className="text-xs text-slate-400 ml-auto">{(items as any[]).length} atividade{(items as any[]).length !== 1 ? "s" : ""}</span>
                  </div>
                  {(items as any[]).sort((a, b) => (a.hora || "") < (b.hora || "") ? -1 : 1).map((r: any, idx: number) => {
                    const lugar = lugares.find((l: any) => l.id === r.lugarId);
                    return (
                      <div key={r.id} className={cn("flex items-start gap-4 px-5 py-4 group hover:bg-slate-50 transition-colors", idx > 0 && "border-t border-slate-100")}>
                        <div className="text-xs font-mono text-slate-400 pt-0.5 w-10 flex-shrink-0">{r.hora || "—"}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-slate-900">{r.titulo}</p>
                            <span className="text-[10px] text-slate-400 capitalize bg-slate-100 px-1.5 py-0.5 rounded">{r.tipo}</span>
                          </div>
                          {r.descricao && <p className="text-xs text-slate-500">{r.descricao}</p>}
                          {lugar && (
                            <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {lugar.nome}
                            </p>
                          )}
                        </div>
                        <button onClick={() => delRoteiro.mutate(r.id)} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LUGARES ────────────────────────────────────────────────────────────── */}
      {tab === "lugares" && (
        <div className="space-y-4">
          <button onClick={() => setShowLugarForm(s => !s)} className={BTN_PRIMARY}>
            <Plus className="w-4 h-4" /> Adicionar lugar
          </button>

          {showLugarForm && (
            <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Novo Lugar</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className={LABEL}>Nome *</label>
                  <input value={lugarForm.nome} onChange={e => setLugarForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Torre Eiffel" className={cn(INPUT, "w-full")} />
                </div>
                <div>
                  <label className={LABEL}>Categoria</label>
                  <select value={lugarForm.categoria} onChange={e => setLugarForm(f => ({ ...f, categoria: e.target.value }))} className={cn(INPUT, "w-full")}>
                    {CATEGORIAS_LUGAR.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Prioridade</label>
                  <select value={lugarForm.prioridade} onChange={e => setLugarForm(f => ({ ...f, prioridade: e.target.value }))} className={cn(INPUT, "w-full")}>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL}>Endereço</label>
                  <input value={lugarForm.endereco} onChange={e => setLugarForm(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua, bairro, cidade" className={cn(INPUT, "w-full")} />
                </div>
                <div>
                  <label className={LABEL}>Horário de funcionamento</label>
                  <input value={lugarForm.horario} onChange={e => setLugarForm(f => ({ ...f, horario: e.target.value }))} placeholder="Ex: 9h às 18h" className={cn(INPUT, "w-full")} />
                </div>
                <div>
                  <label className={LABEL}>Como chegar</label>
                  <input value={lugarForm.comoChegar} onChange={e => setLugarForm(f => ({ ...f, comoChegar: e.target.value }))} placeholder="Metro, táxi, caminhada..." className={cn(INPUT, "w-full")} />
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL}>Descrição</label>
                  <textarea value={lugarForm.descricao} onChange={e => setLugarForm(f => ({ ...f, descricao: e.target.value }))} rows={2} placeholder="O que há de especial neste lugar?" className={cn(INPUT, "w-full resize-none")} />
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL}>Notas pessoais</label>
                  <input value={lugarForm.notas} onChange={e => setLugarForm(f => ({ ...f, notas: e.target.value }))} placeholder="Dicas, observações..." className={cn(INPUT, "w-full")} />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowLugarForm(false)} className={BTN_GHOST}>Cancelar</button>
                <button
                  onClick={() => { if (!lugarForm.nome) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; } addLugar.mutate(lugarForm); }}
                  disabled={addLugar.isPending}
                  className={BTN_PRIMARY}
                >
                  {addLugar.isPending ? "Salvando..." : "Salvar lugar"}
                </button>
              </div>
            </div>
          )}

          {lugares.length === 0 ? (
            <EmptyState icon={MapPin} msg="Nenhum lugar salvo" action="Adicione restaurantes, museus, pontos turísticos e mais" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lugares.map((l: any) => (
                <LugarCard key={l.id} lugar={l} onMarkVisited={() => updateLugar.mutate({ id: l.id, ...l, status: l.status === "visitado" ? "planejado" : "visitado" })} onDelete={() => deleteLugar.mutate(l.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MAPA ───────────────────────────────────────────────────────────────── */}
      {tab === "mapa" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl border border-sky-200 p-6 text-center">
            <Globe className="w-10 h-10 text-sky-400 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 mb-1">Mapa interativo</h3>
            <p className="text-sm text-slate-500 mb-4">Em breve com mapa completo. Por agora, veja seus lugares organizados abaixo.</p>
          </div>

          <div className="space-y-3">
            {["alta","media","baixa"].map(prio => {
              const filtered = lugares.filter((l: any) => l.prioridade === prio);
              if (filtered.length === 0) return null;
              return (
                <div key={prio} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Flag className={cn("w-3.5 h-3.5", prio === "alta" ? "text-rose-500" : prio === "media" ? "text-amber-500" : "text-slate-400")} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{prio === "alta" ? "Alta" : prio === "media" ? "Média" : "Baixa"} prioridade</span>
                    <span className="ml-auto text-xs text-slate-400">{filtered.length}</span>
                  </div>
                  {filtered.map((l: any, idx: number) => (
                    <div key={l.id} className={cn("flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors", idx > 0 && "border-t border-slate-100")}>
                      <span className="text-xl flex-shrink-0">{getCatEmoji(l.categoria)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{l.nome}</p>
                        {l.endereco && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{l.endereco}</p>}
                        {l.horario && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{l.horario}</p>}
                      </div>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0", l.status === "visitado" ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-600")}>
                        {l.status === "visitado" ? "✓" : "Planejado"}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DESPESAS ───────────────────────────────────────────────────────────── */}
      {tab === "despesas" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Registrar despesa</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="md:col-span-1">
                <label className={LABEL}>Descrição *</label>
                <input value={expenseForm.descricao} onChange={e => setExpenseForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Jantar no restaurante" className={cn(INPUT, "w-full")} />
              </div>
              <div>
                <label className={LABEL}>Valor (R$) *</label>
                <input type="number" value={expenseForm.valor} onChange={e => setExpenseForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" className={cn(INPUT, "w-full")} />
              </div>
              <div>
                <label className={LABEL}>Categoria</label>
                <select value={expenseForm.categoria} onChange={e => setExpenseForm(f => ({ ...f, categoria: e.target.value }))} className={cn(INPUT, "w-full")}>
                  {EXPENSE_CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Data</label>
                <input type="date" value={expenseForm.data} onChange={e => setExpenseForm(f => ({ ...f, data: e.target.value }))} className={cn(INPUT, "w-full")} />
              </div>
            </div>
            <button
              onClick={() => {
                if (!expenseForm.descricao || !expenseForm.valor) { toast({ title: "Preencha descrição e valor", variant: "destructive" }); return; }
                addExpense.mutate({ ...expenseForm, valor: parseFloat(expenseForm.valor) });
              }}
              disabled={addExpense.isPending}
              className={cn(BTN_PRIMARY, "mt-3")}
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>

          {expenses.length === 0 ? (
            <EmptyState icon={ReceiptText} msg="Nenhuma despesa registrada" action="Registre os gastos da viagem" />
          ) : (
            <>
              <div className="space-y-2">
                {expenses.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 group hover:border-slate-300 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{e.descricao}</p>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">{e.categoria}{e.data ? ` · ${fmtDate(e.data)}` : ""}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{fmtBRL(e.valor)}</p>
                    <button onClick={() => delExpense.mutate(e.id)} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-sm font-bold text-slate-700">Total</span>
                  <span className="text-sm font-bold text-slate-900">{fmtBRL(totalGasto)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── CHECKLIST ──────────────────────────────────────────────────────────── */}
      {tab === "checklist" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  value={checkItem}
                  onChange={e => setCheckItem(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && checkItem.trim()) addCheck.mutate({ item: checkItem.trim(), fase: checkFase }); }}
                  placeholder="Adicionar item (ex: Passaporte, seguro viagem...)"
                  className={cn(INPUT, "w-full")}
                />
              </div>
              <select value={checkFase} onChange={e => setCheckFase(e.target.value)} className={cn(INPUT, "w-32 flex-shrink-0")}>
                <option value="antes">Antes</option>
                <option value="durante">Durante</option>
              </select>
              <button
                onClick={() => { if (checkItem.trim()) addCheck.mutate({ item: checkItem.trim(), fase: checkFase }); }}
                disabled={!checkItem.trim()}
                className={cn(BTN_PRIMARY, "flex-shrink-0")}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {[{ fase: "antes", label: "Antes da viagem", items: checklistAntes }, { fase: "durante", label: "Durante a viagem", items: checklistDurante }].map(({ fase, label, items }) => (
            items.length > 0 && (
              <div key={fase} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="text-xs text-slate-400">{items.filter((c: any) => c.concluido).length}/{items.length}</p>
                </div>
                {items.map((c: any, idx: number) => (
                  <div key={c.id} className={cn("flex items-center gap-3 px-5 py-3.5 group hover:bg-slate-50 transition-colors", idx > 0 && "border-t border-slate-100")}>
                    <button
                      onClick={() => toggleCheck.mutate({ cid: c.id, concluido: !c.concluido })}
                      className={cn("w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all", c.concluido ? "bg-emerald-500 border-emerald-500" : "border-slate-300 hover:border-primary")}
                    >
                      {c.concluido && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <span className={cn("flex-1 text-sm", c.concluido ? "text-slate-400 line-through" : "text-slate-900")}>{c.item}</span>
                    <button onClick={() => delCheck.mutate(c.id)} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )
          ))}

          {checklist.length === 0 && <EmptyState icon={ListChecks} msg="Checklist vazio" action="Adicione itens para antes e durante a viagem" />}
        </div>
      )}

      {/* ── MEMÓRIAS ───────────────────────────────────────────────────────────── */}
      {tab === "memorias" && (
        <div className="space-y-4">
          <button onClick={() => setShowMemForm(s => !s)} className={BTN_PRIMARY}>
            <Plus className="w-4 h-4" /> Nova memória
          </button>

          {showMemForm && (
            <div className="bg-white rounded-2xl border border-primary/20 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Registrar memória</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className={LABEL}>Tipo</label>
                  <select value={memoriaForm.tipo} onChange={e => setMemoriaForm(f => ({ ...f, tipo: e.target.value }))} className={cn(INPUT, "w-full")}>
                    <option value="nota">📝 Nota</option>
                    <option value="momento">✨ Momento especial</option>
                    <option value="aprendizado">💡 Aprendizado</option>
                    <option value="foto">📸 Foto / lembrança</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Data</label>
                  <input type="date" value={memoriaForm.data} onChange={e => setMemoriaForm(f => ({ ...f, data: e.target.value }))} className={cn(INPUT, "w-full")} />
                </div>
                <div>
                  <label className={LABEL}>Dia da viagem</label>
                  <input type="number" min="1" value={memoriaForm.dia} onChange={e => setMemoriaForm(f => ({ ...f, dia: e.target.value }))} placeholder="Ex: 3" className={cn(INPUT, "w-full")} />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={LABEL}>Título *</label>
                  <input value={memoriaForm.titulo} onChange={e => setMemoriaForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Pôr do sol na Torre Eiffel" className={cn(INPUT, "w-full")} />
                </div>
                <div>
                  <label className={LABEL}>Descrição / sentimentos</label>
                  <textarea value={memoriaForm.conteudo} onChange={e => setMemoriaForm(f => ({ ...f, conteudo: e.target.value }))} rows={3} placeholder="Descreva o momento, como você se sentiu..." className={cn(INPUT, "w-full resize-none")} />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowMemForm(false)} className={BTN_GHOST}>Cancelar</button>
                <button
                  onClick={() => { if (!memoriaForm.titulo) { toast({ title: "Título obrigatório", variant: "destructive" }); return; } addMemoria.mutate(memoriaForm); }}
                  disabled={addMemoria.isPending}
                  className={BTN_PRIMARY}
                >
                  Salvar memória
                </button>
              </div>
            </div>
          )}

          {memorias.length === 0 ? (
            <EmptyState icon={Camera} msg="Nenhuma memória registrada" action="Registre momentos especiais, aprendizados e sentimentos da viagem" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memorias.map((m: any) => {
                const tipoEmoji: Record<string, string> = { nota: "📝", momento: "✨", aprendizado: "💡", foto: "📸" };
                return (
                  <div key={m.id} className="bg-white rounded-2xl border border-slate-200 p-5 group hover:border-slate-300 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{tipoEmoji[m.tipo] ?? "📝"}</span>
                        <h4 className="font-semibold text-slate-900 text-sm">{m.titulo}</h4>
                      </div>
                      <button onClick={() => delMemoria.mutate(m.id)} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {m.conteudo && <p className="text-sm text-slate-600 leading-relaxed mb-3">{m.conteudo}</p>}
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {m.data && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(m.data)}</span>}
                      {m.dia && <span>Dia {m.dia}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const INPUT = "border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
const LABEL = "block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5";
const BTN_PRIMARY = "flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors";
const BTN_GHOST = "px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors";

function KpiMini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={cn("text-base font-bold", color ?? "text-slate-900")}>{value}</p>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-slate-400 mr-2">{label}:</span>
        <span className="text-sm text-slate-700 font-medium">{value}</span>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, msg, action }: { icon: React.ElementType; msg: string; action?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 bg-white rounded-2xl border border-slate-200 border-dashed">
      <Icon className="w-8 h-8 text-slate-300 mb-3" />
      <p className="text-sm font-medium text-slate-500 mb-1">{msg}</p>
      {action && <p className="text-xs text-slate-400 text-center max-w-xs">{action}</p>}
    </div>
  );
}

function LugarCard({ lugar, onMarkVisited, onDelete }: { lugar: any; onMarkVisited: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const visited = lugar.status === "visitado";
  const prioColor = { alta: "border-l-rose-400", media: "border-l-amber-400", baixa: "border-l-slate-200" }[lugar.prioridade as string] ?? "border-l-slate-200";

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 border-l-4 overflow-hidden group transition-all hover:shadow-sm", prioColor)}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{getCatEmoji(lugar.categoria)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-slate-900 text-sm leading-tight">{lugar.nome}</h4>
              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{getCatLabel(lugar.categoria)}</span>
            </div>
            {lugar.endereco && <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{lugar.endereco}</p>}
            {lugar.horario && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{lugar.horario}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onMarkVisited}
              className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full transition-all", visited ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600")}
            >
              {visited ? <><Check className="w-3 h-3" /> Visitado</> : "Marcar"}
            </button>
          </div>
        </div>

        {(lugar.descricao || lugar.notas || lugar.comoChegar) && (
          <button onClick={() => setExpanded(s => !s)} className="mt-2 flex items-center gap-1 text-[10px] text-primary hover:underline">
            <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
            {expanded ? "Menos" : "Mais detalhes"}
          </button>
        )}

        {expanded && (
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            {lugar.descricao && <p className="text-xs text-slate-600">{lugar.descricao}</p>}
            {lugar.comoChegar && <p className="text-xs text-slate-500 flex items-start gap-1"><Navigation className="w-3 h-3 flex-shrink-0 mt-0.5 text-slate-400" />{lugar.comoChegar}</p>}
            {lugar.notas && <p className="text-xs text-slate-400 italic">{lugar.notas}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/50">
        <span className={cn("text-[10px] font-semibold", { alta: "text-rose-600", media: "text-amber-600", baixa: "text-slate-400" }[lugar.prioridade] ?? "text-slate-400")}>
          {lugar.prioridade === "alta" ? "⭐ Alta prioridade" : lugar.prioridade === "media" ? "Média prioridade" : "Baixa prioridade"}
        </span>
        <button onClick={onDelete} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
