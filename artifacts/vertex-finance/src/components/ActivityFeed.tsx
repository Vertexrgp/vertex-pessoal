import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, RefreshCw, CheckCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const getApiBase = () =>
  import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/[^/]*$/, "");
const apiUrl = (path: string) => `${getApiBase()}/api${path}`;

type EventLog = {
  id: number;
  tipo: string;
  origem: string;
  descricao: string | null;
  payload: unknown;
  lido: boolean;
  createdAt: string;
};

// ─── Metadata per event type ──────────────────────────────────────────────────

const EVENT_META: Record<string, { label: string; emoji: string; color: string }> = {
  TASK_CREATED:          { label: "Tarefa criada",       emoji: "📝", color: "bg-indigo-100 text-indigo-700" },
  TASK_COMPLETED:        { label: "Tarefa concluída",    emoji: "✅", color: "bg-emerald-100 text-emerald-700" },
  TASK_POSTPONED:        { label: "Tarefa postergada",   emoji: "⏰", color: "bg-amber-100 text-amber-700" },
  EXPENSE_CREATED:       { label: "Despesa registrada",  emoji: "💸", color: "bg-rose-100 text-rose-700" },
  RECURRING_TRIGGERED:   { label: "Recorrência ativada", emoji: "🔁", color: "bg-purple-100 text-purple-700" },
  WORKOUT_CREATED:       { label: "Treino planejado",    emoji: "🏋️", color: "bg-blue-100 text-blue-700" },
  WORKOUT_COMPLETED:     { label: "Treino concluído",    emoji: "🏆", color: "bg-emerald-100 text-emerald-700" },
  TRAVEL_CREATED:        { label: "Viagem criada",       emoji: "✈️", color: "bg-sky-100 text-sky-700" },
  TRAVEL_EXPENSE_CREATED:{ label: "Despesa de viagem",   emoji: "🌍", color: "bg-orange-100 text-orange-700" },
  GOAL_UPDATED:          { label: "Meta atualizada",     emoji: "🎯", color: "bg-teal-100 text-teal-700" },
};

const MODULE_LABEL: Record<string, string> = {
  agenda:      "Agenda",
  financeiro:  "Financeiro",
  performance: "Performance",
  viagens:     "Viagens",
  patrimonio:  "Patrimônio",
  cartoes:     "Cartões",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "agora mesmo";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

export function ActivityFeed({ onClose, sidebarWidth }: { onClose: () => void; sidebarWidth: number }) {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading, refetch } = useQuery<EventLog[]>({
    queryKey: ["events"],
    queryFn: () => fetch(apiUrl("/events")).then((r) => r.json()),
    refetchInterval: 15_000,
  });

  const markReadMutation = useMutation({
    mutationFn: () => fetch(apiUrl("/events/mark-read"), { method: "PUT" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events-unread"] });
    },
  });

  const unread = events.filter((e) => !e.lido).length;

  return (
    <div
      className="fixed top-0 bottom-0 z-50 flex flex-col bg-white border-r border-slate-200 shadow-2xl"
      style={{ left: sidebarWidth, width: 340 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Zap className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Atividade</p>
            <p className="text-[11px] text-slate-400">Eventos entre módulos</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400"
            title="Atualizar"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {unread > 0 && (
            <button
              onClick={() => markReadMutation.mutate()}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400"
              title="Marcar tudo como lido"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {events.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-[11px] text-slate-600">{events.length} eventos</span>
          </div>
          {unread > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[11px] text-rose-600 font-semibold">{unread} não lidos</span>
            </div>
          )}
        </div>
      )}

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm">Carregando...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-6">
            <div className="text-3xl mb-3">⚡</div>
            <p className="text-sm font-semibold text-slate-600">Nenhuma atividade ainda</p>
            <p className="text-xs text-slate-400 mt-1">
              Quando você criar tarefas, registrar despesas ou concluir treinos, tudo aparecerá aqui
            </p>
          </div>
        ) : (
          <div className="py-3">
            {events.map((event, i) => {
              const meta = EVENT_META[event.tipo] ?? { label: event.tipo, emoji: "📋", color: "bg-slate-100 text-slate-600" };
              const isNew = !event.lido;
              const showDateSep =
                i === 0 ||
                new Date(event.createdAt).toDateString() !==
                  new Date(events[i - 1].createdAt).toDateString();

              return (
                <div key={event.id}>
                  {showDateSep && (
                    <div className="flex items-center gap-2 px-4 py-2">
                      <div className="flex-1 h-px bg-slate-100" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {new Date(event.createdAt).toLocaleDateString("pt-BR", {
                          weekday: "short", day: "numeric", month: "short",
                        })}
                      </span>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>
                  )}
                  <div className={cn(
                    "flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors",
                    isNew && "bg-indigo-50/40"
                  )}>
                    {/* Emoji + timeline line */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-base">
                        {meta.emoji}
                      </div>
                      {i < events.length - 1 && (
                        <div className="w-px h-4 bg-slate-200" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs font-semibold text-slate-800 leading-snug",
                            isNew && "font-bold"
                          )}>
                            {event.descricao || meta.label}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold", meta.color)}>
                              {meta.label}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {MODULE_LABEL[event.origem] ?? event.origem}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isNew && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {timeAgo(event.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
        <p className="text-[10px] text-slate-400 text-center">
          Eventos dos módulos: Agenda · Financeiro · Performance · Viagens
        </p>
      </div>
    </div>
  );
}

// ─── Hook: unread count ────────────────────────────────────────────────────────

export function useUnreadEventCount() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["events-unread"],
    queryFn: () =>
      fetch(`${getApiBase()}/api/events/unread-count`).then((r) => r.json()),
    refetchInterval: 15_000,
  });
  return data?.count ?? 0;
}
