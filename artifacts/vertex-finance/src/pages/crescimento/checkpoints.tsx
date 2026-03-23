import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { goalsApi, checkpointsApi, type Goal, type Checkpoint } from "@/lib/crescimento-api";
import {
  Layers, Plus, CheckCircle2, Circle, Trash2, CalendarDays,
  Loader2, X, ChevronDown, Flag, Clock, AlertCircle, Filter,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";

const STATUS_CP = {
  pendente:    { label: "Pendente",    dot: "bg-slate-300",   badge: "bg-slate-100 text-slate-600" },
  em_andamento:{ label: "Em andamento",dot: "bg-blue-400",    badge: "bg-blue-100 text-blue-700" },
  concluido:   { label: "Concluído",   dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  bloqueado:   { label: "Bloqueado",   dot: "bg-rose-400",    badge: "bg-rose-100 text-rose-700" },
};

function fmtData(d: string | null) {
  if (!d) return null;
  try { return format(new Date(d + "T00:00:00"), "dd MMM yyyy", { locale: ptBR }); } catch { return d; }
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
    </div>
  );
}

function AddModal({
  goals,
  onSave,
  onClose,
  saving,
  defaultGoalId,
}: {
  goals: Goal[];
  onSave: (d: { goalId: number; titulo: string; descricao: string; data: string; status: string }) => void;
  onClose: () => void;
  saving: boolean;
  defaultGoalId?: number;
}) {
  const [goalId, setGoalId] = useState(defaultGoalId ?? goals[0]?.id ?? 0);
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
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Meta vinculada *</label>
            <select value={goalId} onChange={(e) => setGoalId(parseInt(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {goals.map((g) => <option key={g.id} value={g.id}>{g.titulo}</option>)}
            </select>
          </div>
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
            disabled={saving || !titulo.trim() || !goalId}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Criar Checkpoint
          </button>
        </div>
      </div>
    </div>
  );
}

type PrazoFiltro = "todos" | "esta_semana" | "este_mes" | "atrasado";

function prazoLabel(f: PrazoFiltro) {
  const map: Record<PrazoFiltro, string> = {
    todos: "Todos os prazos", esta_semana: "Esta semana", este_mes: "Este mês", atrasado: "Atrasado",
  };
  return map[f];
}

function matchPrazo(cp: Checkpoint, f: PrazoFiltro) {
  if (f === "todos") return true;
  if (!cp.data) return f === "todos";
  const d = new Date(cp.data + "T00:00:00");
  const now = new Date();
  if (f === "atrasado") return d < now && cp.status !== "concluido" && !cp.concluido;
  if (f === "esta_semana") {
    const end = new Date(now); end.setDate(end.getDate() + (7 - end.getDay()));
    return d <= end && d >= now;
  }
  if (f === "este_mes") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return true;
}

export default function CheckpointsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);

  const [filterGoal, setFilterGoal] = useState<number | "todos">("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterPrazo, setFilterPrazo] = useState<PrazoFiltro>("todos");

  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ["goals"], queryFn: goalsApi.list });
  const { data: checkpoints = [], isLoading } = useQuery<Checkpoint[]>({
    queryKey: ["checkpoints"],
    queryFn: () => checkpointsApi.list(),
  });

  const create = useMutation({
    mutationFn: checkpointsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["checkpoints"] }); setModal(false); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Checkpoint> }) => checkpointsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checkpoints"] }),
  });

  const remove = useMutation({
    mutationFn: checkpointsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checkpoints"] }),
  });

  const goalsMap = Object.fromEntries(goals.map((g) => [g.id, g]));

  const filtered = checkpoints.filter((cp) => {
    if (filterGoal !== "todos" && cp.goalId !== filterGoal) return false;
    if (filterStatus !== "todos" && cp.status !== filterStatus) return false;
    if (!matchPrazo(cp, filterPrazo)) return false;
    return true;
  });

  const totalConcluidos = checkpoints.filter((c) => c.status === "concluido" || c.concluido).length;
  const totalAtrasados = checkpoints.filter((c) => c.data && new Date(c.data + "T00:00:00") < new Date() && c.status !== "concluido" && !c.concluido).length;
  const totalEmAndamento = checkpoints.filter((c) => c.status === "em_andamento").length;

  const hasFilters = filterGoal !== "todos" || filterStatus !== "todos" || filterPrazo !== "todos";

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Crescimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-indigo-500" /> Checkpoints
            </h1>
            <p className="text-sm text-slate-400 mt-1">Marcos obrigatórios que validam progresso real. Um checkpoint não é uma tarefa.</p>
          </div>
          <button
            onClick={() => setModal(true)}
            disabled={goals.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Checkpoint
          </button>
        </div>

        {/* Stats */}
        {checkpoints.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-slate-900">{checkpoints.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">Total</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-emerald-700">{totalConcluidos}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Concluídos</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-blue-700">{totalEmAndamento}</p>
              <p className="text-xs text-blue-600 mt-0.5">Em andamento</p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-rose-700">{totalAtrasados}</p>
              <p className="text-xs text-rose-600 mt-0.5">Atrasados</p>
            </div>
          </div>
        )}

        {/* Filters */}
        {checkpoints.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Filter className="w-3.5 h-3.5" /> Filtros:</span>

            {/* By Goal */}
            <select
              value={filterGoal}
              onChange={(e) => setFilterGoal(e.target.value === "todos" ? "todos" : parseInt(e.target.value))}
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              <option value="todos">Todas as metas</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.titulo}</option>)}
            </select>

            {/* By Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              <option value="todos">Todos os status</option>
              {Object.entries(STATUS_CP).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </select>

            {/* By Prazo */}
            <select
              value={filterPrazo}
              onChange={(e) => setFilterPrazo(e.target.value as PrazoFiltro)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              {(["todos", "esta_semana", "este_mes", "atrasado"] as PrazoFiltro[]).map((f) => (
                <option key={f} value={f}>{prazoLabel(f)}</option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={() => { setFilterGoal("todos"); setFilterStatus("todos"); setFilterPrazo("todos"); }}
                className="text-xs text-slate-500 hover:text-rose-500 font-medium flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Limpar
              </button>
            )}

            <span className="text-xs text-slate-400 ml-auto">{filtered.length} de {checkpoints.length}</span>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : checkpoints.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4"><Layers className="w-7 h-7 text-indigo-400" /></div>
            <p className="font-semibold text-slate-700 mb-1">Nenhum checkpoint ainda</p>
            <p className="text-sm text-slate-400 mb-2">Checkpoints são marcos que validam se você está avançando de verdade.</p>
            <p className="text-xs text-slate-400 mb-5">
              <span className="font-semibold">Checkpoint</span> = marco mensurável — <span className="font-semibold">Tarefa</span> = ação executável (vai para a Agenda)
            </p>
            {goals.length > 0 ? (
              <button onClick={() => setModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
                <Plus className="w-4 h-4" /> Criar primeiro checkpoint
              </button>
            ) : (
              <Link href="/crescimento/metas" className="text-sm text-primary font-semibold hover:underline">→ Criar uma meta primeiro</Link>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
            <Filter className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-slate-500 font-medium">Nenhum checkpoint com esses filtros</p>
            <button onClick={() => { setFilterGoal("todos"); setFilterStatus("todos"); setFilterPrazo("todos"); }} className="mt-2 text-sm text-primary hover:underline font-medium">Limpar filtros</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((cp) => {
              const goal = goalsMap[cp.goalId];
              const st = STATUS_CP[cp.status as keyof typeof STATUS_CP] ?? STATUS_CP.pendente;
              const isAtrasado = cp.data && new Date(cp.data + "T00:00:00") < new Date() && cp.status !== "concluido" && !cp.concluido;
              return (
                <div
                  key={cp.id}
                  className={`bg-white border rounded-2xl p-5 shadow-sm ${cp.status === "concluido" || cp.concluido ? "border-emerald-200" : isAtrasado ? "border-rose-200" : "border-slate-200"}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Toggle */}
                    <button
                      onClick={() => {
                        const next = (cp.status === "concluido" || cp.concluido) ? "pendente" : "concluido";
                        update.mutate({ id: cp.id, data: { status: next, concluido: next === "concluido", progresso: next === "concluido" ? 100 : cp.progresso } });
                      }}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {cp.status === "concluido" || cp.concluido
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : <Circle className="w-5 h-5 text-slate-300 hover:text-indigo-400" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className={`font-semibold text-sm ${cp.status === "concluido" || cp.concluido ? "line-through text-slate-400" : "text-slate-900"}`}>{cp.titulo}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.badge}`}>{st.label}</span>
                        {isAtrasado && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-rose-100 text-rose-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Atrasado
                          </span>
                        )}
                      </div>

                      {cp.descricao && <p className="text-xs text-slate-500 mb-2">{cp.descricao}</p>}

                      {/* Progress bar (hidden for completed) */}
                      {cp.status !== "concluido" && !cp.concluido && (
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1">
                            <ProgressBar value={cp.progresso} color={goal?.cor ?? "#6366F1"} />
                          </div>
                          <span className="text-xs font-semibold text-slate-400 w-8 text-right">{cp.progresso}%</span>
                          <input
                            type="range" min={0} max={100} step={5}
                            value={cp.progresso}
                            onChange={(e) => update.mutate({ id: cp.id, data: { progresso: parseInt(e.target.value) } })}
                            className="w-20 accent-indigo-500"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Goal badge */}
                        {goal && (
                          <Link href={`/crescimento/metas/${goal.id}`} className="flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: goal.cor }}>
                            <Flag className="w-3 h-3" /> {goal.titulo}
                          </Link>
                        )}

                        {/* Date */}
                        {cp.data && (
                          <div className={`flex items-center gap-1.5 text-xs ${isAtrasado ? "text-rose-500" : cp.status === "concluido" ? "text-emerald-600" : "text-slate-400"}`}>
                            <CalendarDays className="w-3.5 h-3.5" />
                            {fmtData(cp.data)}
                          </div>
                        )}

                        {/* Status quick change */}
                        <select
                          value={cp.status}
                          onChange={(e) => {
                            const s = e.target.value;
                            update.mutate({ id: cp.id, data: { status: s, concluido: s === "concluido", progresso: s === "concluido" ? 100 : cp.progresso } });
                          }}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30"
                        >
                          {Object.entries(STATUS_CP).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <button onClick={() => remove.mutate(cp.id)} className="p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <AddModal
          goals={goals}
          saving={create.isPending}
          onClose={() => setModal(false)}
          onSave={create.mutate}
        />
      )}
    </AppLayout>
  );
}
