import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  ArrowLeft, Calendar, DollarSign, Plus, Trash2, Check, X,
  MapPin, ListChecks, ReceiptText, Route, Camera, Eye, Star,
  Clock, Navigation, Tag, FileText, Globe, Sparkles, ChevronDown,
  BookOpen, Flag, CheckCircle2, Circle, ExternalLink, Zap, ArrowUpDown,
  Link2, LocateFixed, SortAsc, BrainCircuit, ArrowUp, ArrowDown,
  CalendarDays, Timer, BarChart3, ChevronRight, AlertCircle, RefreshCw,
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
  const BLANK_LUGAR = {
    nome: "", endereco: "", cidade: "", pais: "", bairro: "", categoria: "ponto_turistico",
    descricao: "", notas: "", horario: "", comoChegar: "", linkExterno: "",
    prioridade: "media", status: "planejado", lat: "", lng: "",
    diaViagem: "", ordemRoteiro: "", duracaoEstimada: "",
  };
  const [lugarForm, setLugarForm] = useState(BLANK_LUGAR);
  const [showLugarForm, setShowLugarForm] = useState(false);
  const [numDiasGerar, setNumDiasGerar] = useState("");
  const [showRoteiroManual, setShowRoteiroManual] = useState(false);

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

  const addLugar     = useMutation({ mutationFn: (b: any) => fetch(apiUrl(`/viagens/trips/${tripId}/lugares`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json()), onSuccess: () => { inv(); setShowLugarForm(false); setLugarForm(BLANK_LUGAR); toast({ title: "Lugar adicionado" }); } });
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
  const gerarRoteiro = useMutation({
    mutationFn: (numDias?: number) => fetch(apiUrl(`/viagens/trips/${tripId}/roteiro-inteligente`), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(numDias ? { numDias } : {}),
    }).then(r => r.json()),
    onSuccess: (result) => {
      inv();
      toast({ title: `Roteiro gerado!`, description: `${result.stats?.totalLugares ?? 0} lugares distribuídos em ${result.stats?.numDias ?? 0} dias` });
    },
    onError: () => toast({ title: "Erro ao gerar roteiro", variant: "destructive" }),
  });
  const limparRoteiro = useMutation({
    mutationFn: () => fetch(apiUrl(`/viagens/trips/${tripId}/limpar-roteiro`), { method: "POST" }).then(r => r.json()),
    onSuccess: () => { inv(); toast({ title: "Roteiro limpo", description: "Os dias foram removidos de todos os lugares" }); },
  });
  const moverDia = useMutation({
    mutationFn: ({ lugarId, diaViagem }: { lugarId: number; diaViagem: number | null }) =>
      fetch(apiUrl(`/viagens/lugares/${lugarId}`), {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diaViagem }),
      }).then(r => r.json()),
    onSuccess: inv,
  });
  const reordenar = useMutation({
    mutationFn: ({ lugarId, ordemRoteiro }: { lugarId: number; ordemRoteiro: number }) =>
      fetch(apiUrl(`/viagens/lugares/${lugarId}`), {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordemRoteiro }),
      }).then(r => r.json()),
    onSuccess: inv,
  });

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

      {/* ── ROTEIRO INTELIGENTE ────────────────────────────────────────────────── */}
      {tab === "roteiro" && (() => {
        const lugaresComDia    = lugares.filter((l: any) => l.diaViagem);
        const lugaresSemDia    = lugares.filter((l: any) => !l.diaViagem);
        const diasUnicos       = [...new Set(lugaresComDia.map((l: any) => l.diaViagem as number))].sort((a, b) => a - b);
        const totalMinutos     = lugaresComDia.reduce((s: number, l: any) => s + (l.duracaoEstimada || 90), 0);
        const totalHoras       = (totalMinutos / 60).toFixed(1);
        const visitados        = lugaresComDia.filter((l: any) => l.status === "visitado").length;
        const temRoteiro       = lugaresComDia.length > 0;

        return (
          <div className="space-y-5">

            {/* ── Painel de controle ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BrainCircuit className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">Roteiro Inteligente</h3>
                    {temRoteiro && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        ✓ Gerado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    O sistema distribui seus lugares automaticamente entre os dias da viagem, respeitando prioridade, duração estimada e proximidade geográfica (bairro/região).
                  </p>

                  {/* Stats row */}
                  {temRoteiro && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Dias</p>
                        <p className="text-base font-bold text-slate-900">{diasUnicos.length}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Lugares</p>
                        <p className="text-base font-bold text-slate-900">{lugaresComDia.length}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Tempo total</p>
                        <p className="text-base font-bold text-slate-900">{totalHoras}h</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Visitados</p>
                        <p className={cn("text-base font-bold", visitados > 0 ? "text-emerald-600" : "text-slate-900")}>{visitados}/{lugaresComDia.length}</p>
                      </div>
                    </div>
                  )}

                  {/* Action bar */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Num dias override */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="1" max="60"
                        value={numDiasGerar}
                        onChange={e => setNumDiasGerar(e.target.value)}
                        placeholder={dias ? String(dias) : "Nº dias"}
                        className={cn(INPUT, "w-24 py-2")}
                      />
                      <button
                        onClick={() => {
                          if (lugares.length === 0) { toast({ title: "Sem lugares", description: "Adicione lugares antes de gerar o roteiro", variant: "destructive" }); return; }
                          gerarRoteiro.mutate(numDiasGerar ? parseInt(numDiasGerar) : undefined);
                        }}
                        disabled={gerarRoteiro.isPending}
                        className={cn(BTN_PRIMARY, "gap-2")}
                      >
                        {gerarRoteiro.isPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <BrainCircuit className="w-4 h-4" />
                        )}
                        {gerarRoteiro.isPending ? "Gerando..." : temRoteiro ? "Regerar roteiro" : "Gerar roteiro"}
                      </button>
                    </div>
                    {temRoteiro && (
                      <button
                        onClick={() => limparRoteiro.mutate()}
                        disabled={limparRoteiro.isPending}
                        className={cn(BTN_GHOST, "text-rose-500 border-rose-200 hover:bg-rose-50 text-xs px-3 py-2")}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Limpar dias
                      </button>
                    )}
                  </div>

                  {lugaresSemDia.length > 0 && lugares.length > 0 && (
                    <p className="text-xs text-amber-600 flex items-center gap-1.5 mt-3">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {lugaresSemDia.length} lugar{lugaresSemDia.length !== 1 ? "es" : ""} ainda sem dia definido. Gere o roteiro para distribuí-los.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Como funciona (quando vazio) ───────────────────────────── */}
            {!temRoteiro && lugares.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-8 text-center">
                <Route className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700 mb-1">Nenhum lugar cadastrado</h3>
                <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">Adicione lugares na aba Lugares. Quanto mais informações (bairro, duração estimada, prioridade), melhor será o roteiro gerado.</p>
                <button onClick={() => setTab("lugares")} className={BTN_PRIMARY}>
                  <MapPin className="w-4 h-4" /> Ir para Lugares
                </button>
              </div>
            )}

            {!temRoteiro && lugares.length > 0 && (
              <div className="bg-gradient-to-br from-primary/5 to-sky-50 rounded-2xl border border-primary/20 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Como o algoritmo funciona
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { step: "1", title: "Agrupa por proximidade", desc: "Lugares do mesmo bairro/região ficam no mesmo dia para minimizar deslocamento." },
                    { step: "2", title: "Respeita prioridade", desc: "Lugares de alta prioridade são alocados primeiro, garantindo que não fiquem de fora." },
                    { step: "3", title: "Distribui por duração", desc: "Usa a duração estimada de cada lugar para não sobrecarregar um único dia." },
                    { step: "4", title: "Ordena por período", desc: "Cafés de manhã, museus e pontos turísticos no meio do dia, restaurantes e bares à noite." },
                  ].map(s => (
                    <div key={s.step} className="flex items-start gap-3 bg-white/80 rounded-xl p-3.5 border border-primary/10">
                      <div className="w-6 h-6 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.step}</div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 mb-0.5">{s.title}</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-white/60 rounded-xl p-4 border border-primary/10">
                  <p className="text-xs font-semibold text-slate-600 mb-2">
                    Você tem <span className="text-primary font-bold">{lugares.length}</span> lugar{lugares.length !== 1 ? "es" : ""} cadastrado{lugares.length !== 1 ? "s" : ""}.
                    {dias && <> A viagem tem <span className="text-primary font-bold">{dias}</span> dias. Isso dá ~<span className="text-primary font-bold">{Math.ceil(lugares.length / dias)}</span> lugar{Math.ceil(lugares.length / dias) !== 1 ? "es" : ""} por dia.</>}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Timer className="w-3.5 h-3.5" /> Dica: defina a duração estimada de cada lugar (em minutos) para uma distribuição mais precisa.
                  </div>
                </div>
              </div>
            )}

            {/* ── Roteiro gerado — dia a dia ─────────────────────────────── */}
            {temRoteiro && (
              <div className="space-y-4">
                {diasUnicos.map((dia: number) => {
                  const lugaresNoDia = lugaresComDia
                    .filter((l: any) => l.diaViagem === dia)
                    .sort((a: any, b: any) => (a.ordemRoteiro ?? 99) - (b.ordemRoteiro ?? 99));

                  const totalMinDia = lugaresNoDia.reduce((s: number, l: any) => s + (l.duracaoEstimada || 90), 0);
                  const visitadosDia = lugaresNoDia.filter((l: any) => l.status === "visitado").length;
                  const pctVisitado = lugaresNoDia.length > 0 ? Math.round((visitadosDia / lugaresNoDia.length) * 100) : 0;

                  return (
                    <div key={dia} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      {/* Day header */}
                      <div className="px-5 py-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                            {dia}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-slate-900">Dia {dia}</p>
                              <span className="text-[10px] text-slate-500">{lugaresNoDia.length} lugar{lugaresNoDia.length !== 1 ? "es" : ""}</span>
                              <span className="text-[10px] text-slate-400">·</span>
                              <span className="text-[10px] text-slate-500 flex items-center gap-1"><Timer className="w-3 h-3" />{(totalMinDia / 60).toFixed(1)}h</span>
                            </div>
                            {/* Progress bar */}
                            {visitadosDia > 0 && (
                              <div className="flex items-center gap-2 mt-1.5">
                                <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pctVisitado}%` }} />
                                </div>
                                <span className="text-[9px] font-semibold text-emerald-600">{pctVisitado}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lugares list */}
                      {lugaresNoDia.map((l: any, idx: number) => {
                        const visited = l.status === "visitado";
                        const isFirst = idx === 0;
                        const isLast = idx === lugaresNoDia.length - 1;

                        return (
                          <div key={l.id} className={cn(
                            "flex items-start gap-3 px-5 py-4 group hover:bg-slate-50/80 transition-colors",
                            idx > 0 && "border-t border-slate-100"
                          )}>
                            {/* Ordem badge */}
                            <div className={cn(
                              "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 transition-all",
                              visited ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-300 text-slate-500"
                            )}>
                              {visited ? <Check className="w-3.5 h-3.5" /> : (l.ordemRoteiro || idx + 1)}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 flex-wrap mb-0.5">
                                <span className="text-base">{getCatEmoji(l.categoria)}</span>
                                <p className={cn("text-sm font-semibold leading-tight", visited ? "text-slate-400 line-through" : "text-slate-900")}>
                                  {l.nome}
                                </p>
                                {l.prioridade === "alta" && !visited && (
                                  <span className="text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-semibold">⭐ Alta</span>
                                )}
                                {l.bairro && (
                                  <span className="text-[9px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded font-medium">{l.bairro}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                {l.duracaoEstimada && (
                                  <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{l.duracaoEstimada}min</span>
                                )}
                                {l.horario && (
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{l.horario}</span>
                                )}
                                {l.comoChegar && (
                                  <span className="flex items-center gap-1"><Navigation className="w-3 h-3" />{l.comoChegar}</span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                              {/* Marcar visitado */}
                              <button
                                onClick={() => updateLugar.mutate({ id: l.id, ...l, status: visited ? "planejado" : "visitado" })}
                                className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all text-[10px]",
                                  visited ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600")}
                                title={visited ? "Desmarcar" : "Marcar como visitado"}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              {/* Mover para cima */}
                              {!isFirst && (
                                <button
                                  onClick={() => {
                                    const prev = lugaresNoDia[idx - 1];
                                    reordenar.mutate({ lugarId: l.id, ordemRoteiro: (prev.ordemRoteiro || idx) });
                                    reordenar.mutate({ lugarId: prev.id, ordemRoteiro: (l.ordemRoteiro || idx + 1) });
                                  }}
                                  className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:bg-primary/10 hover:text-primary flex items-center justify-center"
                                  title="Mover para cima"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {/* Mover para baixo */}
                              {!isLast && (
                                <button
                                  onClick={() => {
                                    const next = lugaresNoDia[idx + 1];
                                    reordenar.mutate({ lugarId: l.id, ordemRoteiro: (next.ordemRoteiro || idx + 2) });
                                    reordenar.mutate({ lugarId: next.id, ordemRoteiro: (l.ordemRoteiro || idx + 1) });
                                  }}
                                  className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:bg-primary/10 hover:text-primary flex items-center justify-center"
                                  title="Mover para baixo"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {/* Mover de dia */}
                              <select
                                value={l.diaViagem ?? ""}
                                onChange={e => moverDia.mutate({ lugarId: l.id, diaViagem: e.target.value ? parseInt(e.target.value) : null })}
                                className="text-[10px] border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30 text-slate-500 bg-white"
                                title="Mover para outro dia"
                              >
                                {diasUnicos.map((d: number) => (
                                  <option key={d} value={d}>Dia {d}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Sem dia */}
                {lugaresSemDia.length > 0 && (
                  <div className="bg-amber-50 rounded-2xl border border-amber-200 border-dashed overflow-hidden">
                    <div className="px-5 py-3 border-b border-amber-100 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <p className="text-xs font-bold text-amber-700">Sem dia definido ({lugaresSemDia.length})</p>
                      <button onClick={() => gerarRoteiro.mutate(numDiasGerar ? parseInt(numDiasGerar) : undefined)} className="ml-auto text-[10px] font-semibold text-primary hover:underline">
                        Redistribuir
                      </button>
                    </div>
                    {lugaresSemDia.map((l: any, idx: number) => (
                      <div key={l.id} className={cn("flex items-center gap-3 px-5 py-3 group", idx > 0 && "border-t border-amber-100")}>
                        <span className="text-base">{getCatEmoji(l.categoria)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{l.nome}</p>
                          <p className="text-[10px] text-slate-400">{getCatLabel(l.categoria)}{l.prioridade === "alta" ? " · ⭐ Alta" : ""}</p>
                        </div>
                        <select
                          value=""
                          onChange={e => moverDia.mutate({ lugarId: l.id, diaViagem: e.target.value ? parseInt(e.target.value) : null })}
                          className="text-[10px] border border-amber-200 rounded-lg px-2 py-1 focus:outline-none bg-white text-slate-600"
                        >
                          <option value="">Alocar no dia...</option>
                          {diasUnicos.map((d: number) => <option key={d} value={d}>Dia {d}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Roteiro manual (colapsável) ────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setShowRoteiroManual(s => !s)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <FileText className="w-4 h-4 text-slate-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">Notas de roteiro manual</p>
                  <p className="text-xs text-slate-400">Adicione anotações livres, eventos especiais ou itens que não são lugares</p>
                </div>
                <div className="flex items-center gap-2">
                  {roteiro.length > 0 && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{roteiro.length}</span>}
                  <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", showRoteiroManual && "rotate-180")} />
                </div>
              </button>

              {showRoteiroManual && (
                <div className="border-t border-slate-100 p-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className={LABEL}>Dia</label>
                      <input type="number" min="1" value={roteiroForm.dia} onChange={e => setRoteiroForm(f => ({ ...f, dia: e.target.value }))} className={cn(INPUT, "w-full")} />
                    </div>
                    <div>
                      <label className={LABEL}>Horário</label>
                      <input type="time" value={roteiroForm.hora} onChange={e => setRoteiroForm(f => ({ ...f, hora: e.target.value }))} className={cn(INPUT, "w-full")} />
                    </div>
                    <div>
                      <label className={LABEL}>Tipo</label>
                      <select value={roteiroForm.tipo} onChange={e => setRoteiroForm(f => ({ ...f, tipo: e.target.value }))} className={cn(INPUT, "w-full")}>
                        {TIPO_ROTEIRO.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className={LABEL}>Título *</label>
                      <input value={roteiroForm.titulo} onChange={e => setRoteiroForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Show de jazz às 21h" className={cn(INPUT, "w-full")} />
                    </div>
                    <div>
                      <label className={LABEL}>Vincular lugar</label>
                      <select value={roteiroForm.lugarId} onChange={e => setRoteiroForm(f => ({ ...f, lugarId: e.target.value }))} className={cn(INPUT, "w-full")}>
                        <option value="">— Sem vínculo —</option>
                        {lugares.map((l: any) => <option key={l.id} value={l.id}>{getCatEmoji(l.categoria)} {l.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  <input value={roteiroForm.descricao} onChange={e => setRoteiroForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Observações..." className={cn(INPUT, "w-full mb-3")} />
                  <button
                    onClick={() => {
                      if (!roteiroForm.titulo || !roteiroForm.dia) { toast({ title: "Título e dia são obrigatórios", variant: "destructive" }); return; }
                      addRoteiro.mutate({ ...roteiroForm, dia: parseInt(roteiroForm.dia), lugarId: roteiroForm.lugarId ? parseInt(roteiroForm.lugarId) : null });
                    }}
                    disabled={addRoteiro.isPending}
                    className={BTN_PRIMARY}
                  >
                    <Plus className="w-4 h-4" /> Adicionar nota
                  </button>

                  {roteiro.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {Object.entries(roteiroByDay).sort(([a], [b]) => Number(a) - Number(b)).map(([dia, items]) => (
                        <div key={dia} className="bg-slate-50 rounded-xl overflow-hidden">
                          <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">{dia}</div>
                            <p className="text-xs font-bold text-slate-600">Dia {dia}</p>
                          </div>
                          {(items as any[]).sort((a, b) => (a.hora || "") < (b.hora || "") ? -1 : 1).map((r: any, idx: number) => (
                            <div key={r.id} className={cn("flex items-center gap-3 px-4 py-2.5 group hover:bg-slate-100 transition-colors", idx > 0 && "border-t border-slate-200")}>
                              <p className="text-[10px] font-mono text-slate-400 w-10 flex-shrink-0">{r.hora || "—"}</p>
                              <p className="text-xs font-medium text-slate-800 flex-1">{r.titulo}</p>
                              <span className="text-[9px] text-slate-400 bg-white px-1.5 py-0.5 rounded capitalize">{r.tipo}</span>
                              <button onClick={() => delRoteiro.mutate(r.id)} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                <Trash2 className="w-3 h-3" />
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
        );
      })()}

      {/* ── LUGARES ────────────────────────────────────────────────────────────── */}
      {tab === "lugares" && (
        <div className="space-y-4">
          <button onClick={() => setShowLugarForm(s => !s)} className={BTN_PRIMARY}>
            <Plus className="w-4 h-4" /> Adicionar lugar
          </button>

          {showLugarForm && (
            <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Novo Lugar</h3>
              <p className="text-xs text-slate-400 mb-5">Todos os campos são salvos e usados para gerar rotas no mapa</p>

              {/* Seção 1: Identificação */}
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Identificação</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                </div>
              </div>

              {/* Seção 2: Localização */}
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500 mb-3">Localização</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className={LABEL}>Endereço completo</label>
                    <input value={lugarForm.endereco} onChange={e => setLugarForm(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua, número, bairro" className={cn(INPUT, "w-full")} />
                  </div>
                  <div>
                    <label className={LABEL}>Bairro / Região <span className="text-sky-400 normal-case font-normal">(usado para agrupar no roteiro)</span></label>
                    <input value={lugarForm.bairro} onChange={e => setLugarForm(f => ({ ...f, bairro: e.target.value }))} placeholder="Ex: Montmartre, Centro" className={cn(INPUT, "w-full")} />
                  </div>
                  <div>
                    <label className={LABEL}>Cidade</label>
                    <input value={lugarForm.cidade} onChange={e => setLugarForm(f => ({ ...f, cidade: e.target.value }))} placeholder="Ex: Paris" className={cn(INPUT, "w-full")} />
                  </div>
                  <div>
                    <label className={LABEL}>País</label>
                    <input value={lugarForm.pais} onChange={e => setLugarForm(f => ({ ...f, pais: e.target.value }))} placeholder="Ex: França" className={cn(INPUT, "w-full")} />
                  </div>
                  <div>
                    <label className={LABEL}>Latitude <span className="text-slate-300 normal-case font-normal">(para mapa)</span></label>
                    <input type="number" step="0.0000001" value={lugarForm.lat} onChange={e => setLugarForm(f => ({ ...f, lat: e.target.value }))} placeholder="Ex: 48.8584" className={cn(INPUT, "w-full")} />
                  </div>
                  <div>
                    <label className={LABEL}>Longitude <span className="text-slate-300 normal-case font-normal">(para mapa)</span></label>
                    <input type="number" step="0.0000001" value={lugarForm.lng} onChange={e => setLugarForm(f => ({ ...f, lng: e.target.value }))} placeholder="Ex: 2.2945" className={cn(INPUT, "w-full")} />
                  </div>
                </div>
              </div>

              {/* Seção 3: Planejamento */}
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3">Planejamento & Rota</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className={LABEL}>Prioridade</label>
                    <select value={lugarForm.prioridade} onChange={e => setLugarForm(f => ({ ...f, prioridade: e.target.value }))} className={cn(INPUT, "w-full")}>
                      <option value="alta">⭐ Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Duração estimada <span className="text-slate-300 normal-case font-normal">(min)</span></label>
                    <input type="number" min="1" value={lugarForm.duracaoEstimada} onChange={e => setLugarForm(f => ({ ...f, duracaoEstimada: e.target.value }))} placeholder="Ex: 90" className={cn(INPUT, "w-full")} />
                  </div>
                  <div>
                    <label className={LABEL}>Horário de funcionamento</label>
                    <input value={lugarForm.horario} onChange={e => setLugarForm(f => ({ ...f, horario: e.target.value }))} placeholder="9h às 18h" className={cn(INPUT, "w-full")} />
                  </div>
                </div>
                <p className="text-[10px] text-emerald-600 flex items-center gap-1 mt-2">
                  <Timer className="w-3 h-3" /> O Roteiro Inteligente usa prioridade + duração para distribuir os lugares pelos dias sem sobrecarregar.
                </p>
              </div>

              {/* Seção 4: Detalhes */}
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Detalhes</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Como chegar</label>
                    <input value={lugarForm.comoChegar} onChange={e => setLugarForm(f => ({ ...f, comoChegar: e.target.value }))} placeholder="Metrô, táxi, caminhada..." className={cn(INPUT, "w-full")} />
                  </div>
                  <div>
                    <label className={LABEL}>Link externo <span className="text-slate-300 normal-case font-normal">(Google Maps, site...)</span></label>
                    <input value={lugarForm.linkExterno} onChange={e => setLugarForm(f => ({ ...f, linkExterno: e.target.value }))} placeholder="https://maps.google.com/..." className={cn(INPUT, "w-full")} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={LABEL}>Descrição</label>
                    <textarea value={lugarForm.descricao} onChange={e => setLugarForm(f => ({ ...f, descricao: e.target.value }))} rows={2} placeholder="O que há de especial neste lugar?" className={cn(INPUT, "w-full resize-none")} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={LABEL}>Notas pessoais</label>
                    <input value={lugarForm.notas} onChange={e => setLugarForm(f => ({ ...f, notas: e.target.value }))} placeholder="Dicas, observações, recomendações..." className={cn(INPUT, "w-full")} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowLugarForm(false)} className={BTN_GHOST}>Cancelar</button>
                <button
                  onClick={() => {
                    if (!lugarForm.nome) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
                    addLugar.mutate({
                      ...lugarForm,
                      lat: lugarForm.lat ? parseFloat(lugarForm.lat) : null,
                      lng: lugarForm.lng ? parseFloat(lugarForm.lng) : null,
                      diaViagem: lugarForm.diaViagem ? parseInt(lugarForm.diaViagem) : null,
                      ordemRoteiro: lugarForm.ordemRoteiro ? parseInt(lugarForm.ordemRoteiro) : 0,
                      duracaoEstimada: lugarForm.duracaoEstimada ? parseInt(lugarForm.duracaoEstimada) : null,
                    });
                  }}
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
        <div className="space-y-5">

          {/* Status bar: preparação Google Maps */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-sky-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-slate-900">Integração com Google Maps</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Fase 2</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">A estrutura está preparada: seus lugares têm campos de lat/lng, endereço, cidade, país e link externo. Quando ativarmos a API do Google Maps, o mapa interativo aparece automaticamente aqui.</p>
                <div className="flex flex-wrap gap-2">
                  <IntegrationBadge icon={LocateFixed} label="Geocoding API" status="pronto" />
                  <IntegrationBadge icon={Route} label="Directions API" status="pronto" />
                  <IntegrationBadge icon={MapPin} label="Places API" status="pronto" />
                  <IntegrationBadge icon={Zap} label="Rota otimizada" status="pronto" />
                </div>
              </div>
            </div>
          </div>

          {/* Rota otimizada - preview */}
          {lugares.length > 1 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">Otimização de rota</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Fase 2</span>
                </div>
                <button
                  disabled
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-400 rounded-lg cursor-not-allowed"
                  title="Disponível após integração com Google Directions API"
                >
                  <SortAsc className="w-3.5 h-3.5" /> Otimizar rota
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Com {lugares.length} lugares cadastrados, a otimização de rota vai sugerir a ordem ideal para minimizar deslocamento e aproveitar melhor cada dia.
              </p>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 border-dashed">
                <p className="text-xs font-semibold text-slate-500 mb-3">Como vai funcionar:</p>
                <div className="space-y-2">
                  {["Coletar coordenadas de cada lugar via Geocoding API", "Calcular distâncias com Google Directions API", "Sugerir sequência otimizada por dia", "Permitir ajuste manual da ordem"].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</div>
                      <p className="text-xs text-slate-600">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Lugares por dia */}
          {lugares.length === 0 ? (
            <EmptyState icon={MapPin} msg="Nenhum lugar salvo ainda" action="Adicione lugares na aba Lugares com coordenadas para ativar o mapa" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{lugares.length} lugares cadastrados</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <LocateFixed className="w-3.5 h-3.5" />
                  {lugares.filter((l: any) => l.lat && l.lng).length} com coordenadas
                </div>
              </div>

              {/* Por dia */}
              {(() => {
                const comDia = lugares.filter((l: any) => l.diaViagem);
                const semDia = lugares.filter((l: any) => !l.diaViagem);
                const diasUnicos = [...new Set(comDia.map((l: any) => l.diaViagem))].sort((a: any, b: any) => a - b);

                return (
                  <div className="space-y-3">
                    {diasUnicos.map((dia: any) => {
                      const lugaresNoDia = comDia
                        .filter((l: any) => l.diaViagem === dia)
                        .sort((a: any, b: any) => (a.ordemRoteiro ?? 99) - (b.ordemRoteiro ?? 99));

                      return (
                        <div key={dia} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                          <div className="px-5 py-3 bg-gradient-to-r from-primary/5 to-transparent border-b border-slate-100 flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {dia}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">Dia {dia}</p>
                              <p className="text-[10px] text-slate-400">{lugaresNoDia.length} lugar{lugaresNoDia.length !== 1 ? "es" : ""} planejado{lugaresNoDia.length !== 1 ? "s" : ""}</p>
                            </div>
                            {lugaresNoDia.length > 1 && (
                              <button
                                disabled
                                className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg cursor-not-allowed"
                                title="Disponível na Fase 2"
                              >
                                <ArrowUpDown className="w-3 h-3" /> Otimizar dia
                              </button>
                            )}
                          </div>

                          {/* Linha de rota visual */}
                          <div className="px-5 py-3">
                            {lugaresNoDia.map((l: any, idx: number) => {
                              const gmapsUrl = buildGmapsUrl(l);
                              const directionsUrl = buildDirectionsUrl(l);
                              return (
                                <div key={l.id} className="relative">
                                  {idx < lugaresNoDia.length - 1 && (
                                    <div className="absolute left-3.5 top-10 w-0.5 h-4 bg-slate-200" />
                                  )}
                                  <div className="flex items-start gap-3 py-2">
                                    {/* Ordem indicator */}
                                    <div className={cn(
                                      "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                                      l.status === "visitado" ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-300 text-slate-600"
                                    )}>
                                      {l.status === "visitado" ? <Check className="w-3.5 h-3.5" /> : (l.ordemRoteiro || idx + 1)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-base">{getCatEmoji(l.categoria)}</span>
                                            <p className="text-sm font-semibold text-slate-900">{l.nome}</p>
                                            {l.prioridade === "alta" && <span className="text-[9px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-semibold">⭐ Alta</span>}
                                          </div>
                                          {l.endereco && (
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                              <MapPin className="w-3 h-3 flex-shrink-0" />
                                              {[l.endereco, l.cidade, l.pais].filter(Boolean).join(", ")}
                                            </p>
                                          )}
                                          {l.horario && (
                                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                              <Clock className="w-3 h-3 flex-shrink-0" />{l.horario}
                                            </p>
                                          )}
                                          {(l.lat && l.lng) && (
                                            <p className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                                              <LocateFixed className="w-3 h-3" /> {Number(l.lat).toFixed(4)}, {Number(l.lng).toFixed(4)}
                                            </p>
                                          )}
                                        </div>
                                        {/* Action buttons */}
                                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                                          <a
                                            href={gmapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors whitespace-nowrap"
                                          >
                                            <ExternalLink className="w-3 h-3" /> Abrir no mapa
                                          </a>
                                          <a
                                            href={directionsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                                          >
                                            <Navigation className="w-3 h-3" /> Como chegar
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Lugares sem dia definido */}
                    {semDia.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-200 border-dashed overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sem dia definido</p>
                          <span className="ml-auto text-xs text-slate-400">{semDia.length}</span>
                        </div>
                        {semDia.map((l: any, idx: number) => {
                          const gmapsUrl = buildGmapsUrl(l);
                          const directionsUrl = buildDirectionsUrl(l);
                          return (
                            <div key={l.id} className={cn("flex items-start gap-3 px-5 py-3.5", idx > 0 && "border-t border-slate-100")}>
                              <span className="text-xl flex-shrink-0">{getCatEmoji(l.categoria)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-700">{l.nome}</p>
                                {l.endereco && <p className="text-xs text-slate-500">{[l.endereco, l.cidade].filter(Boolean).join(", ")}</p>}
                                <p className="text-[10px] text-slate-400 mt-0.5">Defina o dia na aba Lugares para incluir no roteiro por dia</p>
                              </div>
                              <div className="flex gap-1.5">
                                <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold px-2 py-1 rounded bg-sky-50 text-sky-600 hover:bg-sky-100">Mapa</a>
                                <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold px-2 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100">Rota</a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
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

function buildGmapsUrl(l: any): string {
  if (l.lat && l.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`;
  }
  const q = [l.nome, l.endereco, l.cidade, l.pais].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function buildDirectionsUrl(l: any): string {
  const dest = l.lat && l.lng ? `${l.lat},${l.lng}` : encodeURIComponent([l.nome, l.endereco, l.cidade, l.pais].filter(Boolean).join(", "));
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
}

function IntegrationBadge({ icon: Icon, label, status }: { icon: React.ElementType; label: string; status: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
      <Icon className="w-3 h-3 text-emerald-500" />
      <span className="text-[10px] font-semibold text-emerald-700">{label}</span>
      <span className="text-[9px] text-emerald-500 capitalize">· {status}</span>
    </div>
  );
}

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
  const gmapsUrl = buildGmapsUrl(lugar);
  const directionsUrl = buildDirectionsUrl(lugar);
  const locationLine = [lugar.endereco, lugar.cidade, lugar.pais].filter(Boolean).join(", ");
  const hasCoords = !!(lugar.lat && lugar.lng);

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 border-l-4 overflow-hidden group transition-all hover:shadow-sm", prioColor)}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{getCatEmoji(lugar.categoria)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-bold text-slate-900 text-sm leading-tight">{lugar.nome}</h4>
              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{getCatLabel(lugar.categoria)}</span>
              {lugar.diaViagem && (
                <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">Dia {lugar.diaViagem}</span>
              )}
            </div>
            {locationLine && <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" />{locationLine}</p>}
            {lugar.horario && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3 flex-shrink-0" />{lugar.horario}</p>}
            {hasCoords && <p className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5"><LocateFixed className="w-3 h-3" />Com coordenadas</p>}
          </div>
          <button
            onClick={onMarkVisited}
            className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full transition-all flex-shrink-0", visited ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600")}
          >
            {visited ? <><Check className="w-3 h-3" /> Visitado</> : "Marcar"}
          </button>
        </div>

        {/* Map action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Abrir no mapa
          </a>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
          >
            <Navigation className="w-3 h-3" /> Como chegar
          </a>
          {lugar.linkExterno && (
            <a
              href={lugar.linkExterno}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Link2 className="w-3 h-3" /> Site
            </a>
          )}
        </div>

        {(lugar.descricao || lugar.notas || lugar.comoChegar) && (
          <button onClick={() => setExpanded(s => !s)} className="mt-2.5 flex items-center gap-1 text-[10px] text-primary hover:underline">
            <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
            {expanded ? "Menos detalhes" : "Ver detalhes"}
          </button>
        )}

        {expanded && (
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            {lugar.descricao && <p className="text-xs text-slate-600">{lugar.descricao}</p>}
            {lugar.comoChegar && (
              <p className="text-xs text-slate-500 flex items-start gap-1">
                <Navigation className="w-3 h-3 flex-shrink-0 mt-0.5 text-slate-400" />{lugar.comoChegar}
              </p>
            )}
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
