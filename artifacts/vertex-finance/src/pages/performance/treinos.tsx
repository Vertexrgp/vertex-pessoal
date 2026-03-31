import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PerformanceLayout } from "@/components/layout/PerformanceLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { getApiBase } from "@/lib/api-base";
import {
  Dumbbell, Zap, Play, CheckCircle2, Circle, Clock, TrendingUp,
  RefreshCw, Calendar, BarChart3, History, Target, AlertCircle, ChevronDown,
  ChevronUp, Flame, Trophy, Check, ArrowRight, Sparkles,
  Timer, Weight, RotateCcw, Star
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const API = getApiBase();
const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const GRUPO_COLORS: Record<string, string> = {
  peito: "text-rose-400 bg-rose-500/10",
  costas: "text-blue-400 bg-blue-500/10",
  ombro: "text-violet-400 bg-violet-500/10",
  bracos: "text-amber-400 bg-amber-500/10",
  pernas: "text-emerald-400 bg-emerald-500/10",
  gluteos: "text-pink-400 bg-pink-500/10",
  abdomen: "text-sky-400 bg-sky-500/10",
};

const PRIORIDADE_BORDER: Record<string, string> = {
  primario: "border-l-indigo-500",
  secundario: "border-l-slate-500",
  manutencao: "border-l-slate-700",
};

const FASE_META: Record<string, { label: string; color: string }> = {
  ganho_massa: { label: "Ganho de Massa", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  ajuste: { label: "Ajuste", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  refinamento: { label: "Refinamento", color: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
};

const SUGESTAO_STYLE: Record<string, string> = {
  aumentar_carga: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  reduzir_carga: "text-red-400 bg-red-500/10 border-red-500/30",
  manter_carga: "text-slate-400 bg-slate-500/10 border-slate-500/30",
};

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc: Record<string, T[]>, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

type SetLog = {
  id: number; logId: number; diaExercicioId: number | null;
  nomeExercicio: string; grupoMuscular: string | null;
  numeroSerie: number; cargaKg: string | null; reps: number | null; concluido: boolean;
  createdAt?: string;
};

type WorkoutLog = {
  id: number; diaId: number | null; data: string; duracaoMin: number | null;
  observacoes: string | null; concluido: boolean; createdAt?: string;
  dia?: { nome: string; focoPrincipal: string | null; letra: string } | null;
  series?: SetLog[];
};

type DayExercise = {
  id: number; diaId: number; exerciseId: number | null;
  nomeOverride: string | null; grupoMuscular: string | null;
  series: number; repsMin: number; repsMax: number; descansoSeg: number;
  ordem: number; prioridade: string; observacoes: string | null;
  exercicio?: { id: number; nome: string; grupoMuscular: string; tipo: string; nivel: string } | null;
};

type WorkoutDay = {
  id: number; planoId: number; nome: string; letra: string; diaSemana: string;
  focoPrincipal: string | null; musculos: string[] | null; ordem: number;
  exercicios: DayExercise[];
};

type WorkoutPlan = {
  id: number; nome: string; divisao: string; fase: string;
  frequenciaSemanal: number; objetivo: string | null; ativo: boolean;
  geradoPorIa: boolean; createdAt: string; dias: WorkoutDay[];
};

/* ─── PLANO TAB ────────────────────────────────────────────────────────── */
function PlanoTab() {
  const qc = useQueryClient();
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const { data: plano, isLoading } = useQuery<WorkoutPlan | null>({
    queryKey: ["workout-plan"],
    queryFn: async () => {
      const r = await fetch(`${API}/api/performance/treino/plano`);
      if (!r.ok) return null;
      return r.json();
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      await fetch(`${API}/api/performance/treino/seed-exercises`, { method: "POST" });
      const r = await fetch(`${API}/api/performance/treino/plano/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? "Erro ao gerar plano"); }
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workout-plan"] }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!plano) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
        <Dumbbell className="w-10 h-10 text-indigo-400" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-white">Nenhum plano ativo</h2>
        <p className="text-slate-400 max-w-sm text-sm leading-relaxed">
          Gere um plano personalizado com IA, baseado no seu objetivo físico e análise corporal.
          O sistema usará suas prioridades musculares para definir volume e exercícios.
        </p>
      </div>
      <button
        onClick={() => generate.mutate()}
        disabled={generate.isPending}
        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
      >
        {generate.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {generate.isPending ? "Gerando plano com IA..." : "Gerar Plano com IA"}
      </button>
      {generate.isError && (
        <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/20 max-w-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{(generate.error as Error)?.message}</span>
        </div>
      )}
    </div>
  );

  const fase = FASE_META[plano.fase] ?? { label: plano.fase, color: "bg-slate-500/15 text-slate-400 border-slate-500/30" };

  return (
    <div className="space-y-5">
      {/* Plan header */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 via-indigo-600/5 to-transparent border border-indigo-500/20 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${fase.color}`}>{fase.label}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50">Divisão {plano.divisao}</span>
              {plano.geradoPorIa && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-400 border border-violet-500/20">
                  <Sparkles className="w-3 h-3" /> Gerado por IA
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-white leading-snug">{plano.nome}</h2>
            {plano.objetivo && <p className="text-slate-400 text-sm leading-relaxed">{plano.objetivo}</p>}
            <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {plano.frequenciaSemanal}× por semana</span>
              <span className="flex items-center gap-1.5"><Dumbbell className="w-3.5 h-3.5" /> {plano.dias.length} treinos</span>
            </div>
          </div>
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg border border-indigo-500/30 transition-colors disabled:opacity-50"
          >
            {generate.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Regenerar
          </button>
        </div>
        {generate.isError && (
          <p className="mt-3 text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
            {(generate.error as Error)?.message}
          </p>
        )}
      </div>

      {/* Weekly calendar mini-view */}
      <div className="grid grid-cols-7 gap-1.5">
        {DIAS_SEMANA.map((dia) => {
          const treino = plano.dias.find(d => d.diaSemana === dia);
          const isSelected = treino && expandedDay === treino.id;
          return (
            <div
              key={dia}
              onClick={() => treino && setExpandedDay(isSelected ? null : treino.id)}
              className={`rounded-xl p-2 border text-center transition-all ${treino ? "cursor-pointer " + (isSelected ? "bg-indigo-500/20 border-indigo-400/50" : "bg-indigo-500/8 border-indigo-500/25 hover:bg-indigo-500/15") : "bg-slate-900/30 border-slate-800/50"}`}
            >
              <p className="text-xs text-slate-500 mb-1">{dia.slice(0, 3)}</p>
              {treino ? (
                <>
                  <p className="text-sm font-bold text-indigo-400">{treino.letra}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{treino.focoPrincipal?.split(" e ")[0] ?? "Treino"}</p>
                </>
              ) : (
                <p className="text-xs text-slate-600 mt-2">—</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Day detail cards */}
      <div className="space-y-3">
        {plano.dias.map((dia) => {
          const isOpen = expandedDay === dia.id;
          return (
            <div key={dia.id} className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden transition-all">
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors text-left"
                onClick={() => setExpandedDay(isOpen ? null : dia.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-indigo-400">{dia.letra}</span>
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{dia.nome}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{dia.diaSemana} · {dia.exercicios.length} exercícios</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex gap-1 flex-wrap max-w-[160px]">
                    {(dia.musculos ?? []).slice(0, 3).map((m) => (
                      <span key={m} className="px-1.5 py-0.5 rounded text-xs bg-slate-700/60 text-slate-300">{m}</span>
                    ))}
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-800 divide-y divide-slate-800/50">
                  {dia.exercicios.map((ex) => {
                    const nome = ex.nomeOverride ?? ex.exercicio?.nome ?? "Exercício";
                    const isCompost = ex.exercicio?.tipo === "composto";
                    const borderClass = PRIORIDADE_BORDER[ex.prioridade] ?? "border-l-slate-700";
                    const grupoKey = ex.grupoMuscular ?? ex.exercicio?.grupoMuscular ?? "";
                    const grupoClass = GRUPO_COLORS[grupoKey] ?? "text-slate-400 bg-slate-700/50";
                    return (
                      <div key={ex.id} className={`flex items-start gap-3 p-3.5 pl-4 border-l-2 ${borderClass}`}>
                        <span className="text-xs text-slate-600 w-5 text-center shrink-0 mt-1">{ex.ordem}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-white">{nome}</p>
                            {isCompost && (
                              <span className="px-1.5 py-0 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">composto</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                            <span className="font-semibold text-slate-300">{ex.series} séries</span>
                            <span>{ex.repsMin}–{ex.repsMax} reps</span>
                            <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{ex.descansoSeg}s descanso</span>
                          </div>
                          {ex.observacoes && <p className="text-xs text-slate-600 mt-1 italic">{ex.observacoes}</p>}
                        </div>
                        {grupoKey && (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${grupoClass}`}>{grupoKey}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── SET ROW ──────────────────────────────────────────────────────────── */
function SetRow({ set, onUpdate }: { set: SetLog; onUpdate: (data: Partial<SetLog>) => void }) {
  const [carga, setCarga] = useState(set.cargaKg ?? "");
  const [reps, setReps] = useState(set.reps?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const handleDone = async () => {
    setSaving(true);
    await onUpdate({ cargaKg: carga || null, reps: reps ? Number(reps) : null, concluido: !set.concluido });
    setSaving(false);
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${set.concluido ? "bg-emerald-500/5" : "hover:bg-slate-800/20"}`}>
      <span className="text-xs font-medium text-slate-600 w-5 text-center shrink-0 font-mono">{set.numeroSerie}</span>
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center gap-1.5 bg-slate-800/70 rounded-lg border border-slate-700/50 px-2.5 py-1.5">
          <Weight className="w-3 h-3 text-slate-500" />
          <input
            type="number"
            value={carga}
            onChange={e => { setCarga(e.target.value); onUpdate({ cargaKg: e.target.value || null }); }}
            placeholder="kg"
            className="w-12 bg-transparent text-sm text-white outline-none text-center placeholder:text-slate-600"
          />
        </div>
        <span className="text-slate-600 text-xs font-medium">×</span>
        <div className="flex items-center gap-1.5 bg-slate-800/70 rounded-lg border border-slate-700/50 px-2.5 py-1.5">
          <RotateCcw className="w-3 h-3 text-slate-500" />
          <input
            type="number"
            value={reps}
            onChange={e => { setReps(e.target.value); onUpdate({ reps: e.target.value ? Number(e.target.value) : null }); }}
            placeholder="reps"
            className="w-10 bg-transparent text-sm text-white outline-none text-center placeholder:text-slate-600"
          />
        </div>
      </div>
      <button
        onClick={handleDone}
        disabled={saving}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${set.concluido ? "bg-emerald-500 text-white shadow-emerald-500/30 shadow-lg" : "bg-slate-800 text-slate-500 hover:bg-slate-700 border border-slate-700"}`}
      >
        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

/* ─── TREINAR HOJE TAB ─────────────────────────────────────────────────── */
function TreinarHojeTab() {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [activeLogId, setActiveLogId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: plano } = useQuery<WorkoutPlan | null>({
    queryKey: ["workout-plan"],
    queryFn: async () => { const r = await fetch(`${API}/api/performance/treino/plano`); if (!r.ok) return null; return r.json(); },
  });

  const { data: logs } = useQuery<WorkoutLog[]>({
    queryKey: ["workout-logs"],
    queryFn: async () => { const r = await fetch(`${API}/api/performance/treino/logs`); return r.json(); },
  });

  const { data: activeLog, refetch: refetchLog } = useQuery<WorkoutLog>({
    queryKey: ["workout-log-detail", activeLogId],
    queryFn: async () => { const r = await fetch(`${API}/api/performance/treino/logs/${activeLogId}`); return r.json(); },
    enabled: activeLogId !== null,
    refetchInterval: false,
  });

  useEffect(() => {
    const todayLog = logs?.find(l => l.data === today && !l.concluido);
    if (todayLog && activeLogId === null) {
      setActiveLogId(todayLog.id);
      setStartTime(Date.now() - elapsed * 1000);
    }
  }, [logs]);

  useEffect(() => {
    if (startTime !== null && !activeLog?.concluido) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTime, activeLog?.concluido]);

  const startWorkout = useMutation({
    mutationFn: async (diaId: number) => {
      const r = await fetch(`${API}/api/performance/treino/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diaId, planoId: plano?.id, data: today }),
      });
      if (!r.ok) throw new Error("Erro ao iniciar treino");
      return r.json();
    },
    onSuccess: (data) => {
      setActiveLogId(data.id);
      setStartTime(Date.now());
      setElapsed(0);
      qc.invalidateQueries({ queryKey: ["workout-logs"] });
      setTimeout(() => refetchLog(), 200);
    },
  });

  const finishWorkout = useMutation({
    mutationFn: async () => {
      const dur = Math.round(elapsed / 60);
      await fetch(`${API}/api/performance/treino/logs/${activeLogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concluido: true, duracaoMin: Math.max(1, dur) }),
      });
    },
    onSuccess: () => {
      if (timerRef.current) clearInterval(timerRef.current);
      qc.invalidateQueries({ queryKey: ["workout-logs"] });
      qc.invalidateQueries({ queryKey: ["workout-progressao"] });
      qc.invalidateQueries({ queryKey: ["workout-sugestoes"] });
      setActiveLogId(null);
      setStartTime(null);
    },
  });

  const updateSet = useMutation({
    mutationFn: async ({ setId, data }: { setId: number; data: Partial<SetLog> }) => {
      const r = await fetch(`${API}/api/performance/treino/sets/${setId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return r.json();
    },
    onSuccess: () => refetchLog(),
  });

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const dayOfWeekIdx = new Date().getDay();
  const todayDayOfWeek = DIAS_SEMANA[dayOfWeekIdx === 0 ? 6 : dayOfWeekIdx - 1];
  const todayDia = plano?.dias.find(d => d.diaSemana === todayDayOfWeek);

  if (!plano) return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <AlertCircle className="w-12 h-12 text-slate-600" />
      <div>
        <p className="text-slate-400 font-medium">Nenhum plano ativo</p>
        <p className="text-slate-500 text-sm mt-1">Crie um plano primeiro na aba <strong className="text-slate-400">Plano</strong>.</p>
      </div>
    </div>
  );

  /* Active workout tracker */
  if (activeLogId && activeLog) {
    const sets = activeLog.series ?? [];
    const grouped = groupBy(sets, s => s.nomeExercicio);
    const completedSets = sets.filter(s => s.concluido).length;
    const totalSets = sets.length;
    const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

    return (
      <div className="space-y-4">
        {/* Active header */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> Treino em andamento
              </p>
              <p className="font-semibold text-white text-sm">{activeLog.dia?.nome ?? "Treino Livre"}</p>
              <p className="text-3xl font-mono text-emerald-400 font-bold tracking-tight">{formatTime(elapsed)}</p>
            </div>
            <div className="text-right space-y-2">
              <div className="text-2xl font-bold text-white">{progressPct}%</div>
              <div className="w-28 h-2 rounded-full bg-slate-700/60 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="text-xs text-slate-500">{completedSets}/{totalSets} séries</div>
            </div>
          </div>
          <button
            onClick={() => finishWorkout.mutate()}
            disabled={finishWorkout.isPending}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {finishWorkout.isPending ? "Finalizando..." : "Concluir Treino"}
          </button>
        </div>

        {/* Exercise groups */}
        {Object.entries(grouped).map(([exNome, exSets]) => {
          const allDone = exSets.every(s => s.concluido);
          const grupoKey = exSets[0]?.grupoMuscular ?? "";
          const grupoClass = GRUPO_COLORS[grupoKey] ?? "text-slate-400 bg-slate-700/50";
          return (
            <div key={exNome} className={`rounded-xl border overflow-hidden transition-all ${allDone ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-800 bg-slate-900/50"}`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2.5">
                  {allDone
                    ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                    : <Circle className="w-4.5 h-4.5 text-slate-600" />
                  }
                  <span className="font-medium text-sm text-white">{exNome}</span>
                </div>
                {grupoKey && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${grupoClass}`}>{grupoKey}</span>
                )}
              </div>
              <div className="divide-y divide-slate-800/40">
                {exSets.map((s) => (
                  <SetRow key={s.id} set={s} onUpdate={(data) => updateSet.mutate({ setId: s.id, data })} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* Day selection */
  const completedToday = logs?.find(l => l.data === today && l.concluido);

  return (
    <div className="space-y-5">
      {completedToday && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
          <Trophy className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Treino de hoje concluído! 🎉</p>
            <p className="text-xs text-slate-400 mt-0.5">{completedToday.dia?.nome ?? "Treino"}{completedToday.duracaoMin ? ` · ${completedToday.duracaoMin} min` : ""}</p>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Selecionar treino para iniciar</h3>
        <div className="space-y-2.5">
          {plano.dias.map((dia) => {
            const isToday = dia.diaSemana === todayDayOfWeek;
            return (
              <div
                key={dia.id}
                className={`rounded-xl border p-4 transition-all ${isToday ? "border-indigo-500/40 bg-indigo-500/8" : "border-slate-800 bg-slate-900/30"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${isToday ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-slate-800 text-slate-400 border border-slate-700"}`}>
                      {dia.letra}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-white text-sm">{dia.nome}</p>
                        {isToday && <span className="text-xs text-indigo-400 bg-indigo-500/15 px-1.5 py-0 rounded border border-indigo-500/20">Hoje</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{dia.diaSemana} · {dia.exercicios.length} exercícios</p>
                    </div>
                  </div>
                  <button
                    onClick={() => startWorkout.mutate(dia.id)}
                    disabled={startWorkout.isPending}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isToday ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"}`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Iniciar
                  </button>
                </div>
                {dia.exercicios.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {dia.exercicios.slice(0, 5).map((ex) => (
                      <span key={ex.id} className="text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/40">
                        {ex.nomeOverride ?? ex.exercicio?.nome ?? "—"}
                      </span>
                    ))}
                    {dia.exercicios.length > 5 && <span className="text-xs text-slate-600">+{dia.exercicios.length - 5}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── HISTÓRICO TAB ────────────────────────────────────────────────────── */
function HistoricoTab() {
  const { data: logs = [], isLoading } = useQuery<WorkoutLog[]>({
    queryKey: ["workout-logs"],
    queryFn: async () => { const r = await fetch(`${API}/api/performance/treino/logs`); return r.json(); },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!logs.length) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
      <History className="w-12 h-12 text-slate-600" />
      <div>
        <p className="text-slate-400 font-medium">Nenhum treino registrado</p>
        <p className="text-slate-500 text-sm mt-1">Inicie seu primeiro treino na aba <strong className="text-slate-400">Hoje</strong>.</p>
      </div>
    </div>
  );

  const grouped = groupBy(logs, l => {
    try {
      const d = parseISO(l.data);
      const diff = differenceInDays(new Date(), d);
      if (diff === 0) return "Hoje";
      if (diff === 1) return "Ontem";
      if (diff < 7) return "Esta semana";
      if (diff < 14) return "Semana passada";
      return format(d, "MMMM yyyy", { locale: ptBR });
    } catch { return "Outros"; }
  });

  const totalConcluidos = logs.filter(l => l.concluido).length;
  const totalMin = logs.filter(l => l.duracaoMin).reduce((a, l) => a + (l.duracaoMin ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-center">
          <p className="text-2xl font-bold text-white">{logs.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total de sessões</p>
        </div>
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">{totalConcluidos}</p>
          <p className="text-xs text-slate-500 mt-1">Concluídos</p>
        </div>
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-center">
          <p className="text-2xl font-bold text-indigo-400">{totalMin > 0 ? `${Math.round(totalMin / Math.max(1, logs.filter(l => l.duracaoMin).length))}` : "—"}</p>
          <p className="text-xs text-slate-500 mt-1">Min. médio</p>
        </div>
      </div>

      {/* Log list by period */}
      {Object.entries(grouped).map(([period, periodLogs]) => (
        <div key={period}>
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2.5">{period}</h3>
          <div className="space-y-2">
            {periodLogs.map((log) => (
              <div
                key={log.id}
                className={`rounded-xl border p-4 ${log.concluido ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {log.concluido
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      : <Circle className="w-5 h-5 text-amber-400 shrink-0" />
                    }
                    <div>
                      <p className="font-medium text-white text-sm">{log.dia?.nome ?? "Treino Livre"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(() => { try { return format(parseISO(log.data), "EEEE, dd/MM/yyyy", { locale: ptBR }); } catch { return log.data; } })()}
                        {log.duracaoMin ? ` · ${log.duracaoMin} min` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium ${log.concluido ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border border-amber-500/20"}`}>
                    {log.concluido ? "✓ Concluído" : "Em andamento"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── PROGRESSÃO TAB ───────────────────────────────────────────────────── */
function ProgressaoTab() {
  const [selectedEx, setSelectedEx] = useState<string | null>(null);

  const { data: progressao = {}, isLoading } = useQuery<Record<string, { grupo: string; entradas: { data: string; maxCarga: number; avgReps: number }[] }>>({
    queryKey: ["workout-progressao"],
    queryFn: async () => { const r = await fetch(`${API}/api/performance/treino/progressao`); return r.json(); },
  });

  const { data: sugestoes = [] } = useQuery<{ exercicio: string; acao: string; motivo: string; novaCarga?: number }[]>({
    queryKey: ["workout-sugestoes"],
    queryFn: async () => { const r = await fetch(`${API}/api/performance/treino/sugestoes-progressao`); return r.json(); },
  });

  const exerciseNames = Object.keys(progressao);
  const sel = selectedEx ?? exerciseNames[0] ?? null;
  const exData = sel ? progressao[sel] : null;

  const chartData = exData?.entradas.map(e => ({
    data: (() => { try { return format(parseISO(e.data), "dd/MM", { locale: ptBR }); } catch { return e.data; } })(),
    carga: e.maxCarga,
    reps: e.avgReps,
  })) ?? [];

  const sugestao = sugestoes.find(s => s.exercicio === sel);
  const upSugestoes = sugestoes.filter(s => s.acao === "aumentar_carga");

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!exerciseNames.length) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
      <BarChart3 className="w-12 h-12 text-slate-600" />
      <div>
        <p className="text-slate-400 font-medium">Sem dados de progressão</p>
        <p className="text-slate-500 text-sm mt-1">Complete algumas sessões com cargas registradas para ver sua evolução aqui.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Suggestions */}
      {upSugestoes.length > 0 && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <h3 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Progressão Automática
          </h3>
          <div className="space-y-2">
            {upSugestoes.slice(0, 3).map((s) => (
              <div key={s.exercicio} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${SUGESTAO_STYLE[s.acao]}`}>
                <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{s.exercicio}</p>
                  <p className="text-xs opacity-75 mt-0.5">{s.motivo}</p>
                </div>
                {s.novaCarga && <span className="shrink-0 text-sm font-bold">{s.novaCarga}kg</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exercise selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {exerciseNames.map((name) => (
          <button
            key={name}
            onClick={() => setSelectedEx(name)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${sel === name ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20 shadow-lg" : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-300"}`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Chart */}
      {exData && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white">{sel}</h3>
              <p className="text-xs text-slate-500 mt-0.5 capitalize">{exData.grupo} · {exData.entradas.length} sessões registradas</p>
            </div>
            {sugestao && (
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${SUGESTAO_STYLE[sugestao.acao]}`}>
                {sugestao.acao === "aumentar_carga" ? "↑ Aumentar" : sugestao.acao === "reduzir_carga" ? "↓ Reduzir" : "→ Manter"}
              </span>
            )}
          </div>

          {chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="data" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px", fontSize: "12px", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                  labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
                  formatter={(v: any, name: string) => [name === "carga" ? `${v} kg` : `${v} reps`, name === "carga" ? "Carga máx." : "Reps médio"]}
                />
                <Line type="monotone" dataKey="carga" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: "#6366f1", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#818cf8" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-28 flex items-center justify-center text-slate-500 text-sm bg-slate-800/30 rounded-lg">
              Registre ao menos 2 sessões para ver a evolução
            </div>
          )}

          {/* Stats */}
          {exData.entradas.length >= 2 && (() => {
            const first = exData.entradas[0].maxCarga;
            const last = exData.entradas[exData.entradas.length - 1].maxCarga;
            const diff = Math.round((last - first) * 10) / 10;
            const pct = first > 0 ? ((diff / first) * 100).toFixed(1) : "0";
            return (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Início", value: `${first}kg`, sub: null, color: "text-white" },
                  { label: "Atual", value: `${last}kg`, sub: null, color: "text-white" },
                  { label: "Evolução", value: `${diff >= 0 ? "+" : ""}${diff}kg`, sub: `${diff >= 0 ? "+" : ""}${pct}%`, color: diff >= 0 ? "text-emerald-400" : "text-red-400" },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className={`rounded-lg p-3 text-center ${diff >= 0 && label === "Evolução" ? "bg-emerald-500/10" : diff < 0 && label === "Evolução" ? "bg-red-500/10" : "bg-slate-800/50"}`}>
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className={`text-lg font-bold ${color}`}>{value}</p>
                    {sub && <p className={`text-xs ${color} opacity-75`}>{sub}</p>}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* All exercises table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300">Todos os Exercícios</h3>
        </div>
        <div className="divide-y divide-slate-800/50">
          {exerciseNames.map((name) => {
            const data = progressao[name];
            if (!data?.entradas.length) return null;
            const last = data.entradas[data.entradas.length - 1];
            const prev = data.entradas.length >= 2 ? data.entradas[data.entradas.length - 2] : null;
            const delta = prev ? Math.round((last.maxCarga - prev.maxCarga) * 10) / 10 : null;
            const sug = sugestoes.find(s => s.exercicio === name);
            return (
              <button
                key={name}
                onClick={() => setSelectedEx(name)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/30 transition-colors ${sel === name ? "bg-slate-800/40" : ""}`}
              >
                <div>
                  <p className="text-sm font-medium text-white">{name}</p>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">{data.grupo} · {data.entradas.length} sessões</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{last.maxCarga}kg</p>
                    {delta !== null && delta !== 0 && (
                      <p className={`text-xs ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>{delta > 0 ? "+" : ""}{delta}kg</p>
                    )}
                  </div>
                  {sug?.acao === "aumentar_carga" && <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />}
                  <ArrowRight className="w-3.5 h-3.5 text-slate-700" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN ─────────────────────────────────────────────────────────────── */
const TABS = [
  { id: "plano", label: "Plano", icon: Calendar },
  { id: "hoje", label: "Hoje", icon: Dumbbell },
  { id: "historico", label: "Histórico", icon: History },
  { id: "progressao", label: "Progressão", icon: TrendingUp },
] as const;

type TabId = typeof TABS[number]["id"];

export default function TreinosPage() {
  const [tab, setTab] = useState<TabId>("plano");

  return (
    <AppLayout>
      <PerformanceLayout>
        <div className="min-h-screen bg-[#0A0A0A] p-5">
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Dumbbell className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Sistema de Treino</h1>
                <p className="text-xs text-slate-500 mt-0.5">Geração IA · Tracker · Progressão automática</p>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-slate-900/80 rounded-xl p-1 border border-slate-800">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            {tab === "plano" && <PlanoTab />}
            {tab === "hoje" && <TreinarHojeTab />}
            {tab === "historico" && <HistoricoTab />}
            {tab === "progressao" && <ProgressaoTab />}
          </div>
        </div>
      </PerformanceLayout>
    </AppLayout>
  );
}
