import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  goalsApi, checkpointsApi, visionApi, plannerTasksApi,
  type Goal, type Checkpoint, type VisionItem, type PlannerTask,
} from "@/lib/crescimento-api";
import {
  Flag, ChevronLeft, CheckCircle2, Circle, Layers, Star,
  ListTodo, BarChart2, Pencil, Trash2, Plus, X, Loader2,
  CalendarDays, AlertCircle, ArrowRight, TrendingUp, Clock,
  Tag, Zap, BookOpen, ExternalLink,
} from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CP = {
  pendente:    { label: "Pendente",    dot: "bg-slate-300",   badge: "bg-slate-100 text-slate-600" },
  em_andamento:{ label: "Em andamento",dot: "bg-blue-400",    badge: "bg-blue-100 text-blue-700" },
  concluido:   { label: "Concluído",   dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  bloqueado:   { label: "Bloqueado",   dot: "bg-rose-400",    badge: "bg-rose-100 text-rose-700" },
};

const TIPO_OPTS = [
  { value: "pessoal",      label: "Pessoal",      color: "bg-violet-100 text-violet-700" },
  { value: "profissional", label: "Profissional",  color: "bg-blue-100 text-blue-700" },
  { value: "financeiro",   label: "Financeiro",    color: "bg-emerald-100 text-emerald-700" },
  { value: "fisico",       label: "Físico",        color: "bg-rose-100 text-rose-700" },
];

const STATUS_META = [
  { value: "ativa",     label: "Ativa",     dot: "bg-emerald-500" },
  { value: "pausada",   label: "Pausada",   dot: "bg-amber-500" },
  { value: "concluida", label: "Concluída", dot: "bg-sky-500" },
  { value: "cancelada", label: "Cancelada", dot: "bg-slate-400" },
];

const PRIOR_OPTS = [
  { value: "alta",  label: "Alta",  color: "text-rose-600 bg-rose-50" },
  { value: "media", label: "Média", color: "text-amber-600 bg-amber-50" },
  { value: "baixa", label: "Baixa", color: "text-slate-500 bg-slate-100" },
];

function fmtData(d: string | null) {
  if (!d) return null;
  try { return format(new Date(d + "T00:00:00"), "dd MMM yyyy", { locale: ptBR }); } catch { return d; }
}

function tipoColor(tipo: string) {
  return TIPO_OPTS.find((t) => t.value === tipo)?.color ?? "bg-slate-100 text-slate-600";
}
function prioridadeColor(p: string) {
  return PRIOR_OPTS.find((o) => o.value === p)?.color ?? "text-slate-500 bg-slate-100";
}
function statusMetaDot(s: string) {
  return STATUS_META.find((x) => x.value === s)?.dot ?? "bg-slate-400";
}
function statusMetaLabel(s: string) {
  return STATUS_META.find((x) => x.value === s)?.label ?? s;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
    </div>
  );
}

function AddCheckpointModal({
  goalId,
  onSave,
  onClose,
  saving,
}: {
  goalId: number;
  onSave: (d: { goalId: number; titulo: string; descricao: string; data: string; status: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState("");
  const [status, setStatus] = useState("pendente");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Novo Checkpoint</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Marco *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Patrimônio R$ 100k atingido" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data prevista</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {Object.entries(STATUS_CP).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button
            onClick={() => titulo.trim() && onSave({ goalId, titulo, descricao, data, status })}
            disabled={saving || !titulo.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}

function AddTarefaModal({
  goalId,
  checkpoints,
  onSave,
  onClose,
  saving,
}: {
  goalId: number;
  checkpoints: Checkpoint[];
  onSave: (d: { titulo: string; goalId: number; checkpointId?: number; prioridade: string; semanaInicio: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [titulo, setTitulo] = useState("");
  const [cpId, setCpId] = useState<number | "">("");
  const [prioridade, setPrioridade] = useState("media");
  const semanaInicio = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Criar tarefa na Agenda</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-xs text-indigo-700 font-medium flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            A tarefa será adicionada ao Planejamento Semanal desta semana.
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título da tarefa *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O que precisa ser feito?" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Checkpoint (opcional)</label>
              <select value={cpId} onChange={(e) => setCpId(e.target.value ? parseInt(e.target.value) : "")} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Nenhum</option>
                {checkpoints.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prioridade</label>
              <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {PRIOR_OPTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button
            onClick={() => titulo.trim() && onSave({ titulo, goalId, checkpointId: cpId || undefined, prioridade, semanaInicio })}
            disabled={saving || !titulo.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Criar tarefa
          </button>
        </div>
      </div>
    </div>
  );
}

type Tab = "visao" | "checkpoints" | "tarefas" | "vision";

export default function MetaDetailPage({ id }: { id?: string }) {
  const goalId = parseInt(id ?? "0");
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("visao");
  const [addCp, setAddCp] = useState(false);
  const [addTarefa, setAddTarefa] = useState(false);
  const [editProgress, setEditProgress] = useState<{ id: number; progresso: number } | null>(null);

  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ["goals"], queryFn: goalsApi.list });
  const goal = goals.find((g) => g.id === goalId);

  const { data: checkpoints = [], isLoading: cpLoading } = useQuery<Checkpoint[]>({
    queryKey: ["checkpoints", goalId],
    queryFn: () => checkpointsApi.list(goalId),
    enabled: !!goalId,
  });

  const { data: tarefas = [], isLoading: tLoading } = useQuery<PlannerTask[]>({
    queryKey: ["planner-goal", goalId],
    queryFn: () => plannerTasksApi.listByGoal(goalId),
    enabled: tab === "tarefas" && !!goalId,
  });

  const { data: visionItems = [] } = useQuery<VisionItem[]>({
    queryKey: ["vision"],
    queryFn: visionApi.list,
    enabled: tab === "vision",
  });

  const goalVisionItems = visionItems.filter((v) => v.goalId === goalId);

  const createCp = useMutation({
    mutationFn: checkpointsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["checkpoints", goalId] }); setAddCp(false); },
  });

  const updateCp = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Checkpoint> }) => checkpointsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checkpoints", goalId] }),
  });

  const removeCp = useMutation({
    mutationFn: checkpointsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checkpoints", goalId] }),
  });

  const createTarefa = useMutation({
    mutationFn: plannerTasksApi.createLinked,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["planner-goal", goalId] }); setAddTarefa(false); },
  });

  const removeTarefa = useMutation({
    mutationFn: plannerTasksApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planner-goal", goalId] }),
  });

  const updateGoalProgress = useMutation({
    mutationFn: (prog: number) => goalsApi.update(goalId, { progresso: prog }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  if (!goal && goals.length > 0) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center py-20">
          <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-slate-500 font-semibold">Meta não encontrada</p>
          <Link href="/crescimento/metas" className="mt-3 text-sm text-primary hover:underline font-medium">← Voltar para Metas</Link>
        </div>
      </AppLayout>
    );
  }

  const TABS = [
    { key: "visao" as Tab,       label: "Visão Geral",  icon: BarChart2 },
    { key: "checkpoints" as Tab, label: "Checkpoints",  icon: Layers },
    { key: "tarefas" as Tab,     label: "Tarefas",      icon: ListTodo },
    { key: "vision" as Tab,      label: "Vision Board", icon: Star },
  ];

  const cpConcluidos = checkpoints.filter((c) => c.status === "concluido" || c.concluido).length;
  const cpPct = checkpoints.length ? Math.round((cpConcluidos / checkpoints.length) * 100) : 0;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Back */}
        <Link href="/crescimento/metas" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary font-medium w-fit">
          <ChevronLeft className="w-4 h-4" /> Metas
        </Link>

        {/* Header */}
        {goal ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: goal.cor + "22" }}>
                <Flag className="w-7 h-7" style={{ color: goal.cor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tipoColor(goal.tipo)}`}>{TIPO_OPTS.find(t => t.value === goal.tipo)?.label}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${prioridadeColor(goal.prioridade)}`}>{PRIOR_OPTS.find(p => p.value === goal.prioridade)?.label}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <span className={`w-2 h-2 rounded-full ${statusMetaDot(goal.status)}`} />
                    {statusMetaLabel(goal.status)}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-1">{goal.titulo}</h1>
                {goal.descricao && <p className="text-sm text-slate-500">{goal.descricao}</p>}
                {goal.prazo && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                    <CalendarDays className="w-3.5 h-3.5" /> Prazo: {fmtData(goal.prazo)}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-3xl font-bold" style={{ color: goal.cor }}>{goal.progresso}%</p>
                <p className="text-xs text-slate-400">progresso</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-4 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Progresso geral</span>
                <button
                  onClick={() => {
                    const v = prompt("Novo progresso (0–100):", String(goal.progresso));
                    if (v !== null) { const n = parseInt(v); if (!isNaN(n)) updateGoalProgress.mutate(Math.min(100, Math.max(0, n))); }
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Editar
                </button>
              </div>
              <ProgressBar value={goal.progresso} color={goal.cor} />
            </div>

            {/* Checkpoint summary */}
            {checkpoints.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-slate-900">{checkpoints.length}</p>
                  <p className="text-xs text-slate-400">Checkpoints</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-emerald-700">{cpConcluidos}</p>
                  <p className="text-xs text-emerald-600">Concluídos</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{cpPct}%</p>
                  <p className="text-xs text-blue-600">Marcos ok</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl h-36 animate-pulse" />
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-1 justify-center ${tab === key ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── Visão Geral ── */}
        {tab === "visao" && goal && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" /> Sobre a Meta</h3>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Tipo</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tipoColor(goal.tipo)}`}>{TIPO_OPTS.find(t => t.value === goal.tipo)?.label}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Status</span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className={`w-2 h-2 rounded-full ${statusMetaDot(goal.status)}`} />
                    {statusMetaLabel(goal.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500">Prioridade</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${prioridadeColor(goal.prioridade)}`}>{PRIOR_OPTS.find(p => p.value === goal.prioridade)?.label}</span>
                </div>
                {goal.prazo && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-500">Prazo</span>
                    <span className="font-medium text-slate-700">{fmtData(goal.prazo)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-500" /> Progresso dos Checkpoints</h3>
              {checkpoints.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-400">Nenhum checkpoint ainda.</p>
                  <button onClick={() => setTab("checkpoints")} className="mt-2 text-xs text-primary hover:underline font-medium">+ Criar checkpoint</button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {checkpoints.slice(0, 5).map((cp) => {
                    const st = STATUS_CP[cp.status as keyof typeof STATUS_CP] ?? STATUS_CP.pendente;
                    return (
                      <div key={cp.id} className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} />
                        <span className={`text-sm flex-1 truncate ${cp.concluido || cp.status === "concluido" ? "line-through text-slate-400" : "text-slate-700"}`}>{cp.titulo}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.badge}`}>{st.label}</span>
                      </div>
                    );
                  })}
                  {checkpoints.length > 5 && (
                    <button onClick={() => setTab("checkpoints")} className="text-xs text-primary hover:underline font-medium mt-1 text-left">
                      + {checkpoints.length - 5} mais →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Checkpoints ── */}
        {tab === "checkpoints" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">Marcos obrigatórios da jornada. Cada checkpoint valida progresso real.</p>
              <button
                onClick={() => setAddCp(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Novo Checkpoint
              </button>
            </div>

            {cpLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
            ) : checkpoints.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-3">
                  <Layers className="w-6 h-6 text-indigo-400" />
                </div>
                <p className="font-semibold text-slate-700 mb-1">Nenhum checkpoint ainda</p>
                <p className="text-sm text-slate-400 mb-4">Defina marcos mensuráveis que validam seu progresso real.</p>
                <button onClick={() => setAddCp(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
                  <Plus className="w-4 h-4" /> Criar primeiro checkpoint
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {checkpoints.map((cp) => {
                  const st = STATUS_CP[cp.status as keyof typeof STATUS_CP] ?? STATUS_CP.pendente;
                  const isAtrasado = cp.data && new Date(cp.data) < new Date() && cp.status !== "concluido" && !cp.concluido;
                  return (
                    <div key={cp.id} className={`bg-white border rounded-2xl p-5 shadow-sm ${cp.status === "concluido" || cp.concluido ? "border-emerald-200" : isAtrasado ? "border-rose-200" : "border-slate-200"}`}>
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => {
                            const next = cp.status === "concluido" ? "pendente" : "concluido";
                            updateCp.mutate({ id: cp.id, data: { status: next, concluido: next === "concluido", progresso: next === "concluido" ? 100 : cp.progresso } });
                          }}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {cp.status === "concluido" || cp.concluido
                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            : <Circle className="w-5 h-5 text-slate-300 hover:text-indigo-400" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-semibold text-sm ${cp.status === "concluido" || cp.concluido ? "line-through text-slate-400" : "text-slate-900"}`}>{cp.titulo}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.badge}`}>{st.label}</span>
                          </div>
                          {cp.descricao && <p className="text-xs text-slate-500 mt-0.5">{cp.descricao}</p>}

                          {/* Progresso bar */}
                          {cp.status !== "concluido" && !cp.concluido && (
                            <div className="mt-3 flex items-center gap-3">
                              <div className="flex-1">
                                <ProgressBar value={cp.progresso} color={goal?.cor ?? "#6366F1"} />
                              </div>
                              <span className="text-xs font-semibold text-slate-500 w-8 text-right">{cp.progresso}%</span>
                              <input
                                type="range" min={0} max={100} step={5}
                                value={cp.progresso}
                                onChange={(e) => updateCp.mutate({ id: cp.id, data: { progresso: parseInt(e.target.value) } })}
                                className="w-20 accent-indigo-500"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            {cp.data && (
                              <div className={`flex items-center gap-1.5 text-xs ${isAtrasado ? "text-rose-500" : cp.status === "concluido" ? "text-emerald-600" : "text-slate-400"}`}>
                                <CalendarDays className="w-3.5 h-3.5" />
                                {isAtrasado ? "Atrasado · " : ""}{fmtData(cp.data)}
                              </div>
                            )}
                            {/* Status quick change */}
                            <select
                              value={cp.status}
                              onChange={(e) => {
                                const s = e.target.value;
                                updateCp.mutate({ id: cp.id, data: { status: s, concluido: s === "concluido", progresso: s === "concluido" ? 100 : cp.progresso } });
                              }}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30"
                            >
                              {Object.entries(STATUS_CP).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <button onClick={() => removeCp.mutate(cp.id)} className="p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tarefas ── */}
        {tab === "tarefas" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-500">Ações executáveis vinculadas a esta meta. Aparecem no Planejamento Semanal da Agenda.</p>
              </div>
              <button
                onClick={() => setAddTarefa(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Criar tarefa
              </button>
            </div>

            {tLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
            ) : tarefas.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-3">
                  <ListTodo className="w-6 h-6 text-indigo-400" />
                </div>
                <p className="font-semibold text-slate-700 mb-1">Nenhuma tarefa ainda</p>
                <p className="text-sm text-slate-400 mb-4">Tarefas são ações executáveis que avançam os checkpoints desta meta.</p>
                <button onClick={() => setAddTarefa(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
                  <Plus className="w-4 h-4" /> Criar primeira tarefa
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-indigo-50 rounded-xl text-xs text-indigo-700 font-medium flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  As tarefas abaixo aparecem no <Link href="/agenda/planejamento-semanal" className="underline">Planejamento Semanal</Link>.
                </div>
                {tarefas.map((t) => {
                  const priColor = PRIOR_OPTS.find(p => p.value === t.prioridade)?.color ?? "text-slate-500 bg-slate-100";
                  const cp = checkpoints.find(c => c.id === t.checkpointId);
                  return (
                    <div key={t.id} className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-sm ${t.status === "concluido" ? "border-emerald-200" : ""}`}>
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {t.status === "concluido"
                            ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                            : <Circle className="w-4 h-4 text-slate-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${t.status === "concluido" ? "line-through text-slate-400" : "text-slate-900"}`}>{t.titulo}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priColor}`}>{PRIOR_OPTS.find(p => p.value === t.prioridade)?.label}</span>
                            {cp && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Layers className="w-3 h-3" /> {cp.titulo}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">Semana de {fmtData(t.semanaInicio)}</span>
                          </div>
                        </div>
                        <button onClick={() => removeTarefa.mutate(t.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Vision Board ── */}
        {tab === "vision" && (
          <div>
            {goalVisionItems.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-3">
                  <Star className="w-6 h-6 text-amber-400" />
                </div>
                <p className="font-semibold text-slate-700 mb-1">Nenhum item do Vision Board</p>
                <p className="text-sm text-slate-400 mb-4">Adicione frases e referências vinculadas a esta meta no Vision Board.</p>
                <Link href="/crescimento/vision-board" className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
                  <ExternalLink className="w-4 h-4" /> Abrir Vision Board
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goalVisionItems.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm" style={{ borderLeftColor: item.cor, borderLeftWidth: 3 }}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.cor + "22" }}>
                        {item.tipo === "frase" ? <BookOpen className="w-4 h-4" style={{ color: item.cor }} /> : <Tag className="w-4 h-4" style={{ color: item.cor }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900">{item.titulo}</p>
                        <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{item.conteudo}</p>
                        <span className="text-xs text-slate-400 mt-2 block">{item.categoria}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {addCp && (
        <AddCheckpointModal
          goalId={goalId}
          saving={createCp.isPending}
          onClose={() => setAddCp(false)}
          onSave={createCp.mutate}
        />
      )}

      {addTarefa && goal && (
        <AddTarefaModal
          goalId={goalId}
          checkpoints={checkpoints}
          saving={createTarefa.isPending}
          onClose={() => setAddTarefa(false)}
          onSave={createTarefa.mutate}
        />
      )}
    </AppLayout>
  );
}
