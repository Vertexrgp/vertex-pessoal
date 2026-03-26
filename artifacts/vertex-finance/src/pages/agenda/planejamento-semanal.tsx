import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Plus, ChevronLeft, ChevronRight, Grip, Trash2, Copy,
  ArrowRight, X, Clock, CheckCircle2, Circle, Pencil,
  MoreHorizontal, AlertTriangle, CalendarClock, StickyNote,
  Inbox, CheckSquare, Star, Target, Sparkles, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { emitEvent } from "@/lib/emit-event";
import { EVENT_TYPES } from "@/lib/event-bus";
import { getApiBase } from "@/lib/api-base";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const apiUrl = (path: string) => `${getApiBase()}/api${path}`;

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d;
}
function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }
function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const d1 = monday.getDate(), d2 = sunday.getDate();
  const m1 = MESES_FULL[monday.getMonth()], m2 = MESES_FULL[sunday.getMonth()];
  if (monday.getMonth() === sunday.getMonth()) return `${d1} – ${d2} de ${m1} ${sunday.getFullYear()}`;
  return `${d1} de ${m1} – ${d2} de ${m2} ${sunday.getFullYear()}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIAS = [
  { id: "segunda", label: "Segunda-feira", short: "SEG", mini: "Seg" },
  { id: "terca",   label: "Terça-feira",   short: "TER", mini: "Ter" },
  { id: "quarta",  label: "Quarta-feira",  short: "QUA", mini: "Qua" },
  { id: "quinta",  label: "Quinta-feira",  short: "QUI", mini: "Qui" },
  { id: "sexta",   label: "Sexta-feira",   short: "SEX", mini: "Sex" },
  { id: "sabado",  label: "Sábado",        short: "SÁB", mini: "Sáb" },
  { id: "domingo", label: "Domingo",       short: "DOM", mini: "Dom" },
];

const PRIORIDADES = [
  { value: "alta",  label: "Alta",  dot: "bg-rose-500",    text: "text-rose-600",    pill: "bg-rose-100 text-rose-700" },
  { value: "media", label: "Média", dot: "bg-amber-400",   text: "text-amber-600",   pill: "bg-amber-100 text-amber-700" },
  { value: "baixa", label: "Baixa", dot: "bg-emerald-400", text: "text-emerald-600", pill: "bg-emerald-100 text-emerald-700" },
];

const CATEGORIAS = ["trabalho", "pessoal", "saude", "financeiro", "estudo", "outros"];

const CAT_EMOJI: Record<string, string> = {
  trabalho: "💼", pessoal: "🧘", saude: "🏋️", financeiro: "💰", estudo: "📚", outros: "📌",
};

const getPrio = (v: string) => PRIORIDADES.find((p) => p.value === v) || PRIORIDADES[1];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: number;
  semanaInicio: string;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  categoria: string | null;
  estimativaTempo: string | null;
  status: string;
  diaSemana: string | null;
  scheduledDate: string | null;
  startTime: string | null;
  endTime: string | null;
  recurringSeriesId: number | null;
  isRecurringException: boolean;
  ordem: number;
  observacao: string | null;
  postergadaCount: number;
  isFoco: boolean;
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Diária",
  weekdays: "Dias úteis",
  weekly: "Semanal",
  monthly: "Mensal",
  custom: "Personalizado",
};

const RECURRENCE_ICONS: Record<string, string> = {
  daily: "↻",
  weekdays: "↻",
  weekly: "↻",
  monthly: "↻",
  custom: "↻",
};

// ─── Helper: determine which day column a task belongs to ────────────────────
function getTaskDayId(task: Task, weekDates: Date[]): string | null {
  if (task.scheduledDate) {
    const idx = weekDates.findIndex((d) => toDateStr(d) === task.scheduledDate);
    if (idx >= 0) return DIAS[idx].id;
    return null;
  }
  return task.diaSemana;
}

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

function MiniCalendar({
  selected,
  onSelect,
  onClear,
}: {
  selected: string | null;
  onSelect: (date: string) => void;
  onClear: () => void;
}) {
  const today = new Date();
  const todayStr = toDateStr(today);
  const [viewDate, setViewDate] = useState(() => {
    if (selected) return new Date(selected + "T12:00:00");
    return today;
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDow = new Date(year, month, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: Date[] = [];
  for (let i = startOffset; i > 0; i--) {
    days.push(new Date(year, month, 1 - i));
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  while (days.length % 7 !== 0) {
    days.push(new Date(year, month + 1, days.length - startOffset - daysInMonth + 1));
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-[272px]">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
        <span className="text-sm font-semibold text-slate-800">
          {MESES_FULL[month]} {year}
        </span>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
          <div key={d} className="text-[10px] font-bold text-slate-400 text-center py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, i) => {
          const str = toDateStr(d);
          const isCurrentMonth = d.getMonth() === month;
          const isToday = str === todayStr;
          const isSelected = str === selected;
          return (
            <button
              key={i}
              onClick={() => onSelect(str)}
              className={cn(
                "w-8 h-8 text-xs rounded-lg mx-auto flex items-center justify-center transition-colors font-medium",
                isSelected
                  ? "bg-primary text-white font-bold shadow-sm"
                  : isToday
                  ? "bg-primary/10 text-primary font-semibold"
                  : isCurrentMonth
                  ? "text-slate-700 hover:bg-slate-100"
                  : "text-slate-300 hover:bg-slate-50"
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex justify-between items-center border-t border-slate-100 pt-3">
        <button
          onClick={() => onSelect(todayStr)}
          className="text-xs text-primary font-semibold hover:underline"
        >
          Hoje
        </button>
        {selected && (
          <button
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
          >
            Remover data
          </button>
        )}
      </div>
    </div>
  );
}

// ─── TaskRow ─────────────────────────────────────────────────────────────────
// Horizontal planner-style task row — used inside day blocks

function TaskRow({
  task,
  onComplete, onDelete, onDuplicate, onMoveNext, onPostpone, onEdit,
  overlay = false,
}: {
  task: Task;
  onComplete: () => void; onDelete: () => void; onDuplicate: () => void;
  onMoveNext: () => void; onPostpone: () => void; onEdit: () => void;
  overlay?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const prio = getPrio(task.prioridade);
  const done = task.status === "concluida";
  const postponed = task.status === "postergada";

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id.toString(),
    disabled: overlay,
  });

  const style = overlay ? {} : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2.5 py-2 px-3 rounded-xl transition-all select-none",
        overlay ? "bg-white shadow-xl border border-slate-200 rotate-1" : "hover:bg-slate-50/80",
        done && "opacity-50"
      )}
    >
      {/* Drag handle */}
      {!overlay && (
        <button
          {...attributes} {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-400 cursor-grab touch-none flex-shrink-0 transition-opacity"
        >
          <Grip className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Priority dot */}
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", prio.dot, (done || postponed) && "opacity-40")} />

      {/* Checkbox */}
      <button
        onClick={onComplete}
        className={cn("flex-shrink-0 transition-colors", done ? "text-emerald-500" : "text-slate-300 hover:text-emerald-400")}
      >
        {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
      </button>

      {/* Title */}
      <span className={cn(
        "flex-1 text-sm font-medium leading-snug min-w-0",
        done ? "line-through text-slate-400" : postponed ? "text-slate-500" : "text-slate-800"
      )}>
        {task.titulo}
      </span>

      {/* Postergada badge */}
      {postponed && (
        <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">
          <AlertTriangle className="w-2.5 h-2.5" />
          Postergada{task.postergadaCount > 0 ? ` (${task.postergadaCount}x)` : ""}
        </span>
      )}

      {/* Recurring badge */}
      {task.recurringSeriesId && !task.isRecurringException && (
        <span title="Tarefa recorrente" className="flex-shrink-0 text-indigo-400 text-[11px] font-bold select-none">↻</span>
      )}

      {/* Time */}
      {task.startTime && (
        <span className="flex-shrink-0 text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
          {task.startTime}{task.endTime ? `–${task.endTime}` : ""}
        </span>
      )}

      {/* Meta */}
      <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 text-xs">
        {task.estimativaTempo && !task.startTime && (
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" /> {task.estimativaTempo}
          </span>
        )}
        {task.categoria && <span className="text-sm">{CAT_EMOJI[task.categoria] || "📌"}</span>}
      </div>

      {/* Menu */}
      {!overlay && (
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }}
            className="p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 w-48 text-sm">
                <button onClick={() => { onEdit(); setMenu(false); }} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 w-full text-left text-slate-700">
                  <Pencil className="w-3.5 h-3.5 text-slate-400" /> Editar
                </button>
                <button onClick={() => { onDuplicate(); setMenu(false); }} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 w-full text-left text-slate-700">
                  <Copy className="w-3.5 h-3.5 text-slate-400" /> Duplicar
                </button>
                <button onClick={() => { onMoveNext(); setMenu(false); }} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 w-full text-left text-slate-700">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" /> Próxima semana
                </button>
                <button onClick={() => { onPostpone(); setMenu(false); }} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-amber-50 w-full text-left text-amber-700">
                  <CalendarClock className="w-3.5 h-3.5" /> Marcar postergada
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button onClick={() => { onDelete(); setMenu(false); }} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-rose-50 w-full text-left text-rose-600">
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SideTaskRow ───────────────────────────────────────────────────────────────
// Compact draggable row used inside the right panel (pool / postergadas / concluídas)

function SideTaskRow({
  task,
  onComplete, onDelete, onDuplicate, onMoveNext, onPostpone, onEdit,
  overlay = false,
}: {
  task: Task;
  onComplete: () => void; onDelete: () => void; onDuplicate: () => void;
  onMoveNext: () => void; onPostpone: () => void; onEdit: () => void;
  overlay?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const prio = getPrio(task.prioridade);
  const done = task.status === "concluida";
  const postponed = task.status === "postergada";

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id.toString(),
    disabled: overlay,
  });

  const style = overlay ? {} : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2.5 py-2.5 px-3 rounded-xl transition-all select-none",
        overlay ? "bg-white shadow-xl border border-slate-200 rotate-1" : "hover:bg-slate-50",
        done && "opacity-50"
      )}
    >
      {/* Drag handle */}
      {!overlay && (
        <button
          {...attributes} {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-400 cursor-grab touch-none flex-shrink-0 mt-0.5 transition-opacity"
        >
          <Grip className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Priority dot */}
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1.5", prio.dot, done && "opacity-40")} />

      {/* Checkbox */}
      <button onClick={onComplete} className={cn("flex-shrink-0 mt-0.5 transition-colors", done ? "text-emerald-500" : "text-slate-300 hover:text-emerald-400")}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium leading-snug", done ? "line-through text-slate-400" : "text-slate-800")}>
          {task.titulo}
        </p>
        {postponed && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mt-1">
            <AlertTriangle className="w-2.5 h-2.5" />
            Postergada{task.postergadaCount > 0 ? ` (${task.postergadaCount}x)` : ""}
          </span>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.estimativaTempo && (
            <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
              <Clock className="w-3 h-3" />{task.estimativaTempo}
            </span>
          )}
          {task.categoria && (
            <span className="text-[11px] text-slate-400">{CAT_EMOJI[task.categoria]} {task.categoria}</span>
          )}
        </div>
      </div>

      {/* Menu */}
      {!overlay && (
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }}
            className="p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 w-48 text-sm">
                <button onClick={() => { onEdit(); setMenu(false); }} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 w-full text-left text-slate-700">
                  <Pencil className="w-3.5 h-3.5 text-slate-400" /> Editar
                </button>
                <button onClick={() => { onDuplicate(); setMenu(false); }} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 w-full text-left text-slate-700">
                  <Copy className="w-3.5 h-3.5 text-slate-400" /> Duplicar
                </button>
                <button onClick={() => { onMoveNext(); setMenu(false); }} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 w-full text-left text-slate-700">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" /> Próxima semana
                </button>
                <button onClick={() => { onPostpone(); setMenu(false); }} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-amber-50 w-full text-left text-amber-700">
                  <CalendarClock className="w-3.5 h-3.5" /> Marcar postergada
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button onClick={() => { onDelete(); setMenu(false); }} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-rose-50 w-full text-left text-rose-600">
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DayBlock ─────────────────────────────────────────────────────────────────
// One full horizontal row per day — the physical agenda feel

function DayBlock({
  day, date, tasks, isToday,
  onAddTask, onComplete, onDelete, onDuplicate, onMoveNext, onPostpone, onEdit,
}: {
  day: typeof DIAS[0];
  date: Date;
  tasks: Task[];
  isToday: boolean;
  onAddTask: () => void;
  onComplete: (id: number) => void;
  onDelete: (task: Task) => void;
  onDuplicate: (id: number) => void;
  onMoveNext: (id: number) => void;
  onPostpone: (id: number) => void;
  onEdit: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day.id });

  // Sort: alta first, then media, then baixa — concluídas always at bottom
  const active = tasks
    .filter((t) => t.status !== "concluida" && t.status !== "proxima_semana")
    .sort((a, b) => {
      const pa = a.prioridade === "alta" ? 0 : a.prioridade === "media" ? 1 : 2;
      const pb = b.prioridade === "alta" ? 0 : b.prioridade === "media" ? 1 : 2;
      return pa !== pb ? pa - pb : a.ordem - b.ordem;
    });
  const done = tasks.filter((t) => t.status === "concluida");
  const all = [...active, ...done];
  const taskIds = all.map((t) => t.id.toString());

  const isWeekend = day.id === "sabado" || day.id === "domingo";

  return (
    <div
      className={cn(
        "flex border-b border-slate-100 last:border-b-0 transition-colors min-h-[90px]",
        isToday ? "bg-primary/[0.025]" : isWeekend ? "bg-slate-50/40" : "bg-white",
        isOver && "bg-primary/5"
      )}
    >
      {/* Left: Day label column */}
      <div
        className={cn(
          "w-[110px] flex-shrink-0 px-5 py-4 flex flex-col",
          isToday ? "border-r-2 border-primary/30" : "border-r border-slate-100"
        )}
      >
        <span className={cn(
          "text-[9px] font-black uppercase tracking-[0.15em]",
          isToday ? "text-primary" : isWeekend ? "text-slate-300" : "text-slate-400"
        )}>
          {day.short}
        </span>
        <span className={cn(
          "text-3xl font-bold leading-none mt-1 tabular-nums",
          isToday ? "text-primary" : isWeekend ? "text-slate-400" : "text-slate-700"
        )}>
          {date.getDate()}
        </span>
        <span className={cn(
          "text-[11px] font-medium mt-1",
          isToday ? "text-primary/60" : "text-slate-300"
        )}>
          {MESES[date.getMonth()]}
        </span>
        {isToday && (
          <span className="mt-2 text-[9px] bg-primary text-white rounded-full px-2 py-0.5 font-bold self-start">
            Hoje
          </span>
        )}
      </div>

      {/* Right: Task area */}
      <div ref={setNodeRef} className="flex-1 py-2.5 pr-4 pl-3 min-w-0">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {all.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onComplete={() => onComplete(task.id)}
              onDelete={() => onDelete(task)}
              onDuplicate={() => onDuplicate(task.id)}
              onMoveNext={() => onMoveNext(task.id)}
              onPostpone={() => onPostpone(task.id)}
              onEdit={() => onEdit(task)}
            />
          ))}
        </SortableContext>

        {/* Drop placeholder */}
        {isOver && all.length === 0 && (
          <div className="my-1 py-2.5 px-3 border-2 border-dashed border-primary/30 rounded-xl text-center text-xs text-primary/60 font-semibold">
            Solte aqui
          </div>
        )}
        {isOver && all.length > 0 && (
          <div className="mt-1 py-1.5 px-3 border border-dashed border-primary/30 rounded-lg text-[11px] text-primary/60 text-center">
            + Adicionar aqui
          </div>
        )}

        {/* Add task */}
        <button
          onClick={onAddTask}
          className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-primary transition-colors py-1 px-3 rounded-lg hover:bg-slate-50 w-fit"
        >
          <Plus className="w-3 h-3" />
          Adicionar tarefa
        </button>
      </div>
    </div>
  );
}

// ─── FocoDoDia ────────────────────────────────────────────────────────────────

function FocoDoDia({ tasks, todayId, onComplete, onToggleFoco }: {
  tasks: Task[];
  todayId: string | null;
  onComplete: (id: number) => void;
  onToggleFoco: (id: number, current: boolean) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const calcScore = (t: Task): number => {
    let s = 0;
    if (t.isFoco) s += 1000;
    if (t.scheduledDate === toDateStr(new Date()) || t.diaSemana === todayId) s += 100;
    if (t.status === "postergada") s += 50;
    if (t.prioridade === "alta") s += 30;
    else if (t.prioridade === "media") s += 15;
    return s;
  };

  const focusTasks = [...tasks]
    .filter((t) => t.status !== "concluida" && t.status !== "proxima_semana")
    .sort((a, b) => calcScore(b) - calcScore(a))
    .slice(0, 3);

  const hasManualFocus = focusTasks.some((t) => t.isFoco);

  const rankColors = [
    { bg: "bg-indigo-600", text: "text-white" },
    { bg: "bg-slate-300", text: "text-slate-700" },
    { bg: "bg-slate-200", text: "text-slate-600" },
  ];

  const prioBorderColor = (p: string) =>
    p === "alta" ? "border-l-rose-500" : p === "media" ? "border-l-amber-400" : "border-l-emerald-400";

  const prioBg = (p: string) =>
    p === "alta" ? "bg-rose-50/70" : p === "media" ? "bg-amber-50/60" : "bg-emerald-50/40";

  return (
    <div className="mb-4 flex-shrink-0">
      {/* Section header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-slate-900">Foco do Dia</span>
          </div>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-semibold text-indigo-600">
            <Sparkles className="w-3 h-3" />
            {hasManualFocus ? "personalizado" : "automático"}
          </span>
          <span className="text-[11px] text-slate-400">
            {focusTasks.length === 0
              ? "Sem tarefas pendentes"
              : `${focusTasks.length} tarefa${focusTasks.length > 1 ? "s" : ""} principal${focusTasks.length > 1 ? "is" : ""}`}
          </span>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Focus cards */}
      {!collapsed && (
        focusTasks.length === 0 ? (
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-xl flex-shrink-0">🎉</div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Sem tarefas pendentes para hoje</p>
              <p className="text-xs text-slate-400 mt-0.5">Adicione tarefas ou desfrute do tempo livre</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${focusTasks.length}, 1fr)` }}>
            {focusTasks.map((task, i) => {
              const rank = rankColors[i] ?? rankColors[2];
              return (
                <div
                  key={task.id}
                  className={cn(
                    "relative flex flex-col gap-2.5 rounded-2xl border-l-[4px] border border-slate-200/80 p-4 bg-white shadow-sm transition-all",
                    prioBorderColor(task.prioridade),
                    prioBg(task.prioridade),
                    task.isFoco && "ring-2 ring-indigo-300/60 border-indigo-200"
                  )}
                >
                  {/* Rank + title + action buttons */}
                  <div className="flex items-start gap-2.5">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-black mt-0.5",
                      rank.bg, rank.text
                    )}>
                      {i + 1}
                    </div>
                    <p className="flex-1 text-sm font-semibold text-slate-900 leading-snug">
                      {task.titulo}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onToggleFoco(task.id, task.isFoco)}
                        title={task.isFoco ? "Remover foco manual" : "Fixar como foco"}
                        className={cn(
                          "p-1.5 rounded-lg transition-all",
                          task.isFoco
                            ? "text-indigo-500 bg-indigo-100 hover:bg-indigo-200"
                            : "text-slate-300 hover:text-indigo-400 hover:bg-slate-100"
                        )}
                      >
                        <Star className={cn("w-3.5 h-3.5", task.isFoco && "fill-indigo-500")} />
                      </button>
                      <button
                        onClick={() => onComplete(task.id)}
                        title="Marcar como concluída"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-2 flex-wrap pl-8">
                    {task.categoria && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span>{CAT_EMOJI[task.categoria] ?? "📌"}</span>
                        <span className="capitalize">{task.categoria}</span>
                      </span>
                    )}
                    {task.estimativaTempo && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        {task.estimativaTempo}
                      </span>
                    )}
                    {task.status === "postergada" && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                        Postergada{task.postergadaCount > 0 ? ` (${task.postergadaCount}x)` : ""}
                      </span>
                    )}
                    {task.isFoco && (
                      <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-indigo-500" /> Fixado
                      </span>
                    )}
                    {!task.isFoco && (task.scheduledDate === toDateStr(new Date()) || task.diaSemana === todayId) && (
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-semibold rounded-full">
                        Hoje
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

// ─── SidePanel ────────────────────────────────────────────────────────────────

type SideTab = "pool" | "postergadas" | "concluidas" | "notas";

function SidePanel({
  tasks, notes, onNotesChange, onAddTask,
  onComplete, onDelete, onDuplicate, onMoveNext, onPostpone, onEdit,
  panelWidth,
}: {
  tasks: Task[];
  notes: string;
  onNotesChange: (v: string) => void;
  onAddTask: () => void;
  onComplete: (id: number) => void;
  onDelete: (task: Task) => void;
  onDuplicate: (id: number) => void;
  onMoveNext: (id: number) => void;
  onPostpone: (id: number) => void;
  onEdit: (task: Task) => void;
  panelWidth: number;
}) {
  const [tab, setTab] = useState<SideTab>("pool");
  const { setNodeRef, isOver } = useDroppable({ id: "pool" });

  const poolTasks = tasks.filter((t) => !t.diaSemana && !t.scheduledDate && t.status !== "proxima_semana" && t.status !== "postergada" && t.status !== "concluida");
  const postponed = tasks.filter((t) => t.status === "postergada");
  const done = tasks.filter((t) => t.status === "concluida");

  const currentTasks =
    tab === "pool" ? poolTasks :
    tab === "postergadas" ? postponed :
    tab === "concluidas" ? done :
    [];

  const taskIds = currentTasks.map((t) => t.id.toString());

  const Tab = ({ id, label, icon: Icon, count }: { id: SideTab; label: string; icon: React.ElementType; count: number }) => (
    <button
      onClick={() => setTab(id)}
      className={cn(
        "flex flex-col items-center gap-1 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide rounded-xl transition-all flex-1",
        tab === id
          ? "bg-white text-slate-800 shadow-sm"
          : "text-slate-400 hover:text-slate-600"
      )}
    >
      <div className="flex items-center gap-1">
        <Icon className="w-3.5 h-3.5" />
        {count > 0 && (
          <span className={cn(
            "text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center",
            tab === id ? "bg-primary text-white" : "bg-slate-200 text-slate-500"
          )}>
            {count}
          </span>
        )}
      </div>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex-shrink-0 flex flex-col border-l border-slate-100 bg-slate-50/40" style={{ width: panelWidth }}>
      {/* Panel header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-900">Tarefas da Semana</p>
          <button
            onClick={onAddTask}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-[11px] font-bold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3 h-3" /> Nova
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          <Tab id="pool" label="A fazer" icon={Inbox} count={poolTasks.length} />
          <Tab id="postergadas" label="Posterg." icon={AlertTriangle} count={postponed.length} />
          <Tab id="concluidas" label="Feitas" icon={CheckSquare} count={done.length} />
          <Tab id="notas" label="Notas" icon={StickyNote} count={0} />
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {tab !== "notas" ? (
          tab === "pool" ? (
            <div ref={setNodeRef} className={cn("p-3 min-h-full", isOver && "bg-primary/5")}>
              <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5">
                  {currentTasks.map((task) => (
                    <SideTaskRow
                      key={task.id}
                      task={task}
                      onComplete={() => onComplete(task.id)}
                      onDelete={() => onDelete(task.id)}
                      onDuplicate={() => onDuplicate(task.id)}
                      onMoveNext={() => onMoveNext(task.id)}
                      onPostpone={() => onPostpone(task.id)}
                      onEdit={() => onEdit(task)}
                    />
                  ))}
                </div>
              </SortableContext>
              {currentTasks.length === 0 && (
                <div className={cn(
                  "text-center py-10 border-2 border-dashed rounded-2xl transition-colors",
                  isOver ? "border-primary/40 bg-primary/5" : "border-slate-200"
                )}>
                  <p className="text-sm font-semibold text-slate-400">
                    {isOver ? "Solte para desalocar" : "Tudo alocado!"}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    {isOver ? "" : "Arraste tarefas dos dias para cá"}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3">
              <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5">
                  {currentTasks.map((task) => (
                    <SideTaskRow
                      key={task.id}
                      task={task}
                      onComplete={() => onComplete(task.id)}
                      onDelete={() => onDelete(task.id)}
                      onDuplicate={() => onDuplicate(task.id)}
                      onMoveNext={() => onMoveNext(task.id)}
                      onPostpone={() => onPostpone(task.id)}
                      onEdit={() => onEdit(task)}
                    />
                  ))}
                </div>
              </SortableContext>
              {currentTasks.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-sm font-semibold text-slate-400">
                    {tab === "postergadas" ? "Nenhuma tarefa postergada" : "Nenhuma tarefa concluída"}
                  </p>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="p-4 h-full flex flex-col">
            <p className="text-xs font-semibold text-slate-500 mb-2">Notas da semana</p>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Anotações, lembretes, foco da semana..."
              className="flex-1 w-full text-sm text-slate-700 placeholder-slate-300 bg-white border border-slate-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-3 border-t border-slate-100 bg-white">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>{poolTasks.length + tasks.filter((t) => (!!t.diaSemana || !!t.scheduledDate) && t.status === "pendente").length} pendentes</span>
          <span className="text-emerald-600 font-semibold">{done.length} concluídas</span>
          {postponed.length > 0 && <span className="text-amber-600 font-semibold">{postponed.length} postergadas</span>}
        </div>
      </div>
    </div>
  );
}

// ─── TaskModal ─────────────────────────────────────────────────────────────────

const PT_DIAS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function formatDatePT(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${PT_DIAS_SHORT[d.getDay()]}, ${d.getDate()} de ${MESES_FULL[d.getMonth()]} de ${d.getFullYear()}`;
}

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Não repetir" },
  { value: "daily", label: "Todos os dias" },
  { value: "weekdays", label: "Dias úteis (seg–sex)" },
  { value: "weekly", label: "Semanalmente" },
  { value: "monthly", label: "Mensalmente" },
  { value: "custom", label: "Personalizado" },
];

const DOW_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export interface TaskFormData extends Partial<Task> {
  recurrenceType?: string;
  recurrenceInterval?: number;
  recurrenceDays?: number[];
  recurrenceEndDate?: string | null;
}

function TaskModal({
  initial, defaultDate, onClose, onSave,
}: {
  initial?: Task | null;
  defaultDate?: string | null;
  onClose: () => void;
  onSave: (data: TaskFormData) => void;
}) {
  const [form, setForm] = useState({
    titulo: initial?.titulo || "",
    descricao: initial?.descricao || "",
    prioridade: initial?.prioridade || "media",
    categoria: initial?.categoria || "",
    estimativaTempo: initial?.estimativaTempo || "",
    scheduledDate: initial?.scheduledDate || defaultDate || null as string | null,
    startTime: initial?.startTime || "",
    endTime: initial?.endTime || "",
    observacao: initial?.observacao || "",
    recurrenceType: "none",
    recurrenceInterval: 1,
    recurrenceDays: [] as number[],
    recurrenceEndDate: null as string | null,
  });
  const [showCal, setShowCal] = useState(false);
  const [showEndCal, setShowEndCal] = useState(false);

  const isEditing = !!initial;
  const hasRecurrence = !isEditing && form.recurrenceType !== "none";

  const handleSaveClick = () => {
    if (!form.titulo.trim()) return;
    onSave({
      titulo: form.titulo,
      descricao: form.descricao || null,
      prioridade: form.prioridade,
      categoria: form.categoria || null,
      estimativaTempo: form.estimativaTempo || null,
      scheduledDate: form.scheduledDate || null,
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      observacao: form.observacao || null,
      recurrenceType: form.recurrenceType,
      recurrenceInterval: form.recurrenceInterval,
      recurrenceDays: form.recurrenceDays,
      recurrenceEndDate: form.recurrenceEndDate,
    });
  };

  const toggleDow = (dow: number) => {
    setForm((f) => ({
      ...f,
      recurrenceDays: f.recurrenceDays.includes(dow)
        ? f.recurrenceDays.filter((d) => d !== dow)
        : [...f.recurrenceDays, dow].sort(),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <p className="text-base font-bold text-slate-900">{initial ? "Editar tarefa" : "Nova tarefa"}</p>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Título</label>
            <input
              autoFocus
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="O que precisa ser feito?"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              onKeyDown={(e) => { if (e.key === "Enter" && form.titulo.trim() && !hasRecurrence) handleSaveClick(); }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Detalhes, contexto, referências..."
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Priority / Category / Time estimate */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Prioridade</label>
              <select value={form.prioridade} onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Categoria</label>
              <select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">—</option>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Estimativa</label>
              <input value={form.estimativaTempo} onChange={(e) => setForm((f) => ({ ...f, estimativaTempo: e.target.value }))} placeholder="30min" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          {/* Time fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hora início</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hora fim</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* ── Date picker (only for non-recurring or editing) ── */}
          {(!hasRecurrence) && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alocar para o dia</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCal((v) => !v)}
                  className={cn(
                    "w-full flex items-center gap-2.5 border rounded-xl px-3.5 py-2.5 text-sm transition-all text-left",
                    showCal
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-slate-200 hover:border-slate-300",
                    form.scheduledDate ? "text-slate-800" : "text-slate-400"
                  )}
                >
                  <CalendarClock className={cn("w-4 h-4 flex-shrink-0", form.scheduledDate ? "text-primary" : "text-slate-300")} />
                  <span className="flex-1">
                    {form.scheduledDate ? formatDatePT(form.scheduledDate) : "Não alocada"}
                  </span>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", showCal && "rotate-180")} />
                </button>

                {showCal && (
                  <div className="absolute z-50 bottom-full mb-1.5 left-0">
                    <div className="fixed inset-0 z-0" onClick={() => setShowCal(false)} />
                    <div className="relative z-10">
                      <MiniCalendar
                        selected={form.scheduledDate}
                        onSelect={(date) => {
                          setForm((f) => ({ ...f, scheduledDate: date }));
                          setShowCal(false);
                        }}
                        onClear={() => {
                          setForm((f) => ({ ...f, scheduledDate: null }));
                          setShowCal(false);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Recurrence (new tasks only) ── */}
          {!isEditing && (
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">Repetição</label>

              <select
                value={form.recurrenceType}
                onChange={(e) => setForm((f) => ({ ...f, recurrenceType: e.target.value, recurrenceDays: [] }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {RECURRENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* Custom days */}
              {form.recurrenceType === "custom" && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-2">Dias da semana</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {DOW_LABELS.map((label, dow) => (
                      <button
                        key={dow}
                        type="button"
                        onClick={() => toggleDow(dow)}
                        className={cn(
                          "w-9 h-9 rounded-lg text-xs font-semibold transition-colors border",
                          form.recurrenceDays.includes(dow)
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-slate-600 border-slate-200 hover:border-primary/50"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly interval */}
              {form.recurrenceType === "weekly" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">A cada</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={form.recurrenceInterval}
                    onChange={(e) => setForm((f) => ({ ...f, recurrenceInterval: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <span className="text-xs text-slate-600">semana(s)</span>
                </div>
              )}

              {/* Start date for recurrence */}
              {hasRecurrence && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Data de início</p>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCal((v) => !v)}
                      className={cn(
                        "w-full flex items-center gap-2.5 border rounded-xl px-3 py-2 text-sm transition-all text-left",
                        showCal ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-slate-300",
                        form.scheduledDate ? "text-slate-800" : "text-slate-400"
                      )}
                    >
                      <CalendarClock className={cn("w-3.5 h-3.5 flex-shrink-0", form.scheduledDate ? "text-primary" : "text-slate-300")} />
                      <span className="flex-1 text-xs">
                        {form.scheduledDate ? formatDatePT(form.scheduledDate) : "Escolha a data de início"}
                      </span>
                    </button>
                    {showCal && (
                      <div className="absolute z-50 bottom-full mb-1.5 left-0">
                        <div className="fixed inset-0 z-0" onClick={() => setShowCal(false)} />
                        <div className="relative z-10">
                          <MiniCalendar
                            selected={form.scheduledDate}
                            onSelect={(date) => { setForm((f) => ({ ...f, scheduledDate: date })); setShowCal(false); }}
                            onClear={() => { setForm((f) => ({ ...f, scheduledDate: null })); setShowCal(false); }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* End date for recurrence */}
              {hasRecurrence && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 mb-1.5">Data de término (opcional)</p>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEndCal((v) => !v)}
                      className={cn(
                        "w-full flex items-center gap-2.5 border rounded-xl px-3 py-2 text-sm transition-all text-left",
                        showEndCal ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-slate-300",
                        form.recurrenceEndDate ? "text-slate-800" : "text-slate-400"
                      )}
                    >
                      <CalendarClock className={cn("w-3.5 h-3.5 flex-shrink-0", form.recurrenceEndDate ? "text-primary" : "text-slate-300")} />
                      <span className="flex-1 text-xs">
                        {form.recurrenceEndDate ? formatDatePT(form.recurrenceEndDate) : "Sem data de término"}
                      </span>
                    </button>
                    {showEndCal && (
                      <div className="absolute z-50 bottom-full mb-1.5 left-0">
                        <div className="fixed inset-0 z-0" onClick={() => setShowEndCal(false)} />
                        <div className="relative z-10">
                          <MiniCalendar
                            selected={form.recurrenceEndDate}
                            onSelect={(date) => { setForm((f) => ({ ...f, recurrenceEndDate: date })); setShowEndCal(false); }}
                            onClear={() => { setForm((f) => ({ ...f, recurrenceEndDate: null })); setShowEndCal(false); }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Observations */}
          {isEditing && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observações</label>
              <textarea
                value={form.observacao}
                onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                placeholder="Anotações adicionais..."
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          )}
        </div>

        <div className="px-6 pb-5 pt-3 flex gap-3 border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={handleSaveClick}
            disabled={!form.titulo.trim() || (hasRecurrence && !form.scheduledDate)}
            className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-40"
          >
            {initial ? "Salvar alterações" : hasRecurrence ? "Criar recorrência" : "Criar tarefa"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RecurringActionDialog ────────────────────────────────────────────────────

function RecurringActionDialog({
  mode,
  onCancel,
  onSingle,
  onFuture,
  onAll,
}: {
  mode: "edit" | "delete";
  onCancel: () => void;
  onSingle: () => void;
  onFuture: () => void;
  onAll: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
            <span className="text-indigo-500 text-lg font-bold">↻</span>
          </div>
          <p className="text-base font-bold text-slate-900 mb-1">Tarefa recorrente</p>
          <p className="text-sm text-slate-500">
            {mode === "edit"
              ? "Como você quer salvar as alterações?"
              : "Quais ocorrências você quer excluir?"}
          </p>
        </div>
        <div className="space-y-2">
          <button
            onClick={onSingle}
            className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <p className="text-sm font-semibold text-slate-800">Só esta ocorrência</p>
            <p className="text-xs text-slate-500">Afeta apenas este item específico</p>
          </button>
          <button
            onClick={onFuture}
            className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <p className="text-sm font-semibold text-slate-800">Esta e as próximas</p>
            <p className="text-xs text-slate-500">Afeta a partir desta data em diante</p>
          </button>
          <button
            onClick={onAll}
            className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50 transition-colors"
          >
            <p className="text-sm font-semibold text-slate-800">Toda a série</p>
            <p className="text-xs text-slate-500">Afeta todas as ocorrências</p>
          </button>
        </div>
        <button onClick={onCancel} className="mt-3 w-full py-2 text-sm text-slate-500 hover:text-slate-700">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PlanejamentoSemanalPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const semanaStr = toDateStr(weekStart);

  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [addToDay, setAddToDay] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [notes, setNotes] = useState("");

  // Recurring action dialog
  const [recurringDialog, setRecurringDialog] = useState<{
    mode: "edit" | "delete";
    task: Task;
    pendingData?: TaskFormData;
  } | null>(null);

  // ─── Resizable panel ───────────────────────────────────────────────────────
  const PANEL_KEY = "planner-panel-width";
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    const saved = localStorage.getItem(PANEL_KEY);
    return saved ? parseInt(saved, 10) : 300;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const panelWidthRef = useRef(panelWidth);
  panelWidthRef.current = panelWidth;
  const [isDragging, setIsDragging] = useState(false);

  const PRESET_BALANCED = 0.5;   // 50/50
  const PRESET_FOCUS_DAYS = 0.28; // 72/28 — foco nos dias
  const PRESET_FOCUS_TASKS = 0.55; // 45/55 — foco nas tarefas

  const applyPreset = useCallback((ratio: number) => {
    const container = containerRef.current;
    if (!container) return;
    const total = container.offsetWidth;
    const minLeft = total * 0.40, minRight = total * 0.25;
    const raw = total * ratio;
    const clamped = Math.max(minRight, Math.min(total - minLeft, raw));
    setPanelWidth(Math.round(clamped));
    localStorage.setItem(PANEL_KEY, String(Math.round(clamped)));
  }, []);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = panelWidthRef.current;

    const onMove = (ev: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const total = container.offsetWidth;
      const minRight = total * 0.25;
      const maxRight = total * 0.60;
      const delta = startX - ev.clientX; // drag left → wider right panel
      const next = Math.max(minRight, Math.min(maxRight, startWidth + delta));
      setPanelWidth(Math.round(next));
    };

    const onUp = () => {
      setIsDragging(false);
      localStorage.setItem(PANEL_KEY, String(panelWidthRef.current));
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["planner-tasks", semanaStr],
    queryFn: () => fetch(apiUrl(`/agenda/planner?semana=${semanaStr}`)).then((r) => r.json()),
  });

  const setTasks = (updater: (prev: Task[]) => Task[]) => {
    qc.setQueryData(["planner-tasks", semanaStr], updater);
  };

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      fetch(apiUrl("/agenda/planner"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (t: Task) => {
      setTasks((prev) => [...prev, t]);
      toast({ title: "Tarefa criada!" });
      emitEvent(EVENT_TYPES.TASK_CREATED, "agenda", `Tarefa criada: "${t.titulo}"`, { id: t.id, titulo: t.titulo, prioridade: t.prioridade });
    },
  });

  const createRecurringMutation = useMutation({
    mutationFn: (body: object) =>
      fetch(apiUrl("/agenda/recurring-series"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (data: { series: object; tasks: Task[] }) => {
      // Add the tasks for this week to the cache
      const thisSemana = semanaStr;
      const weekTasks = (data.tasks || []).filter((t) => t.semanaInicio === thisSemana);
      if (weekTasks.length > 0) {
        setTasks((prev) => [...prev, ...weekTasks]);
      } else {
        // Invalidate to reload from server
        qc.invalidateQueries({ queryKey: ["planner-tasks", semanaStr] });
      }
      toast({ title: `Recorrência criada! (${data.tasks?.length || 0} instâncias geradas)` });
    },
    onError: () => toast({ title: "Erro ao criar recorrência", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & (Partial<Task> & { editMode?: string })) =>
      fetch(apiUrl(`/agenda/planner/${id}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (t: Task, vars) => {
      if (vars.editMode === "future" || vars.editMode === "all") {
        // Full reload since many tasks were changed
        qc.invalidateQueries({ queryKey: ["planner-tasks", semanaStr] });
      } else {
        setTasks((prev) => prev.map((x) => x.id === t.id ? t : x));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, deleteMode }: { id: number; deleteMode?: string }) =>
      fetch(apiUrl(`/agenda/planner/${id}${deleteMode ? `?deleteMode=${deleteMode}` : ""}`), { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (_, { id, deleteMode }) => {
      if (deleteMode === "all") {
        // Reload since many tasks were removed
        qc.invalidateQueries({ queryKey: ["planner-tasks", semanaStr] });
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
      toast({ title: deleteMode === "all" ? "Série excluída" : "Tarefa removida" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(apiUrl(`/agenda/planner/${id}/duplicar`), { method: "POST" }).then((r) => r.json()),
    onSuccess: (t: Task) => { setTasks((prev) => [...prev, t]); toast({ title: "Tarefa duplicada!" }); },
  });

  const moveNextMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(apiUrl(`/agenda/planner/${id}/proxima-semana`), { method: "POST" }).then((r) => r.json()),
    onSuccess: (_, id) => { setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "proxima_semana" } : t)); toast({ title: "Movida para próxima semana" }); },
  });

  const postponeMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(apiUrl(`/agenda/planner/${id}/postergar`), { method: "POST" }).then((r) => r.json()),
    onSuccess: (_, id) => {
      const task = tasks.find((t) => t.id === id);
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "postergada" } : t));
      toast({ title: "Marcada como postergada" });
      if (task) emitEvent(EVENT_TYPES.TASK_POSTPONED, "agenda", `Tarefa postergada: "${task.titulo}"`, { id, titulo: task.titulo });
    },
  });

  const focoMutation = useMutation({
    mutationFn: ({ id, isFoco }: { id: number; isFoco: boolean }) =>
      fetch(apiUrl(`/agenda/planner/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFoco }),
      }).then((r) => r.json()),
    onSuccess: (_, { id, isFoco }) => {
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, isFoco } : t));
      toast({ title: isFoco ? "⭐ Tarefa fixada no foco" : "Foco removido" });
    },
  });

  const handleToggleFoco = (id: number, current: boolean) => {
    focoMutation.mutate({ id, isFoco: !current });
  };

  // ─── Ops ───────────────────────────────────────────────────────────────────

  const handleComplete = (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "concluida" ? "pendente" : "concluida";
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
    updateMutation.mutate({ id, status: newStatus });
    if (newStatus === "concluida") {
      emitEvent(EVENT_TYPES.TASK_COMPLETED, "agenda", `Tarefa concluída: "${task.titulo}"`, { id, titulo: task.titulo, prioridade: task.prioridade, categoria: task.categoria });
    }
  };

  const doUpdate = (id: number, data: TaskFormData, editMode?: string) => {
    const { recurrenceType: _rt, recurrenceInterval: _ri, recurrenceDays: _rd, recurrenceEndDate: _re, ...taskData } = data;
    updateMutation.mutate({ id, ...taskData, editMode } as Parameters<typeof updateMutation.mutate>[0]);
    toast({ title: "Tarefa atualizada!" });
  };

  const handleSave = (data: TaskFormData) => {
    if (editTask) {
      // If the task is recurring, show the recurring action dialog
      if (editTask.recurringSeriesId) {
        setRecurringDialog({ mode: "edit", task: editTask, pendingData: data });
        setShowModal(false);
        return;
      }
      // Non-recurring edit
      doUpdate(editTask.id, data);
    } else {
      // Creating new task
      if (data.recurrenceType && data.recurrenceType !== "none") {
        // Create a recurring series
        createRecurringMutation.mutate({
          titulo: data.titulo,
          descricao: data.descricao,
          prioridade: data.prioridade || "media",
          categoria: data.categoria,
          estimativaTempo: data.estimativaTempo,
          startTime: data.startTime,
          endTime: data.endTime,
          observacao: data.observacao,
          recurrenceType: data.recurrenceType,
          recurrenceInterval: data.recurrenceInterval || 1,
          recurrenceDays: data.recurrenceDays,
          startDate: data.scheduledDate || toDateStr(new Date()),
          recurrenceEndDate: data.recurrenceEndDate || null,
        });
      } else {
        // Normal one-off task
        if (data.scheduledDate) {
          createMutation.mutate({ ...data });
        } else {
          createMutation.mutate({ semanaInicio: semanaStr, ...data });
        }
      }
    }
    setShowModal(false); setEditTask(null); setAddToDay(null);
  };

  const handleDelete = (task: Task) => {
    if (task.recurringSeriesId) {
      setRecurringDialog({ mode: "delete", task });
    } else {
      deleteMutation.mutate({ id: task.id });
    }
  };

  // ─── DnD ───────────────────────────────────────────────────────────────────

  function findContainer(id: UniqueIdentifier): string {
    const s = id.toString();
    if (s === "pool" || DIAS.some((d) => d.id === s)) return s;
    const task = tasks.find((t) => t.id === parseInt(s));
    if (!task) return "pool";
    if (task.scheduledDate) {
      const wDates = DIAS.map((_, i) => addDays(weekStart, i));
      const idx = wDates.findIndex((d) => toDateStr(d) === task.scheduledDate);
      if (idx >= 0) return DIAS[idx].id;
      return "pool";
    }
    return task.diaSemana || "pool";
  }

  function handleDragStart(e: DragStartEvent) { setActiveId(e.active.id); }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const aC = findContainer(active.id), oC = findContainer(over.id);
    if (aC === oC) return;
    const taskId = parseInt(active.id.toString());
    const newDia = oC === "pool" ? null : oC;
    const dayIdx = DIAS.findIndex((d) => d.id === newDia);
    const newScheduledDate = dayIdx >= 0 ? toDateStr(addDays(weekStart, dayIdx)) : null;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, diaSemana: newDia, scheduledDate: newScheduledDate } : t));
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const taskId = parseInt(active.id.toString());
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const aC = findContainer(active.id), oC = findContainer(over.id);

    if (aC === oC) {
      const cTasks = tasks.filter((t) => {
        const tDayId = getTaskDayId(t, DIAS.map((_, i) => addDays(weekStart, i)));
        if (aC === "pool") return !tDayId && t.status === "pendente";
        return tDayId === aC && t.status === "pendente";
      });
      const overId = parseInt(over.id.toString());
      const oi = cTasks.findIndex((t) => t.id === taskId);
      const ni = cTasks.findIndex((t) => t.id === overId);
      if (oi !== -1 && ni !== -1 && oi !== ni) {
        const reordered = arrayMove(cTasks, oi, ni).map((t, i) => ({ id: t.id, ordem: i }));
        setTasks((prev) => prev.map((t) => { const u = reordered.find((r) => r.id === t.id); return u ? { ...t, ordem: u.ordem } : t; }));
        reordered.forEach(({ id, ordem }) => updateMutation.mutate({ id, ordem }));
      }
    } else {
      updateMutation.mutate({
        id: taskId,
        diaSemana: task.diaSemana,
        scheduledDate: task.scheduledDate,
        status: task.status === "postergada" ? "pendente" : task.status,
      });
    }
  }

  const activeTask = activeId ? tasks.find((t) => t.id === parseInt(activeId.toString())) : null;

  // ─── Week nav ──────────────────────────────────────────────────────────────

  const prevWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  const goToday = () => setWeekStart(getMondayOfWeek(new Date()));

  const todayStr = toDateStr(new Date());
  const weekDates = DIAS.map((_, i) => addDays(weekStart, i));

  // Map JS getDay() (0=Sun, 1=Mon…6=Sat) to diaSemana string
  const DAY_MAP = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  const todayId = DAY_MAP[new Date().getDay()] ?? null;

  return (
    <AppLayout>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex flex-col h-[calc(100vh-2rem)]">

          {/* ─── Header ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-5 flex-shrink-0 gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Planejamento Semanal</h1>
              <p className="text-sm text-slate-400 mt-0.5">{formatWeekRange(weekStart)}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Layout presets */}
              <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm text-xs">
                <button
                  onClick={() => applyPreset(PRESET_FOCUS_DAYS)}
                  title="Foco nos dias (72/28)"
                  className="px-2.5 py-2 hover:bg-slate-50 transition-colors border-r border-slate-200 text-slate-500 hover:text-slate-700 font-semibold"
                >
                  72·28
                </button>
                <button
                  onClick={() => applyPreset(PRESET_BALANCED)}
                  title="Equilibrado (50/50)"
                  className="px-2.5 py-2 hover:bg-slate-50 transition-colors border-r border-slate-200 text-slate-500 hover:text-slate-700 font-semibold"
                >
                  50·50
                </button>
                <button
                  onClick={() => applyPreset(PRESET_FOCUS_TASKS)}
                  title="Foco nas tarefas (45/55)"
                  className="px-2.5 py-2 hover:bg-slate-50 transition-colors text-slate-500 hover:text-slate-700 font-semibold"
                >
                  45·55
                </button>
              </div>

              {/* Week nav */}
              <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <button onClick={prevWeek} className="p-2.5 hover:bg-slate-50 transition-colors border-r border-slate-200">
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <button onClick={goToday} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  Hoje
                </button>
                <button onClick={nextWeek} className="p-2.5 hover:bg-slate-50 transition-colors border-l border-slate-200">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>

              <button
                onClick={() => { setEditTask(null); setAddToDay(null); setShowModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Nova Tarefa
              </button>
            </div>
          </div>

          {/* ─── Foco do Dia ─────────────────────────────────────── */}
          <FocoDoDia
            tasks={tasks.filter((t) => t.status !== "proxima_semana")}
            todayId={todayId}
            onComplete={handleComplete}
            onToggleFoco={handleToggleFoco}
          />

          {/* ─── Main: days + sidebar ────────────────────────────── */}
          <div
            ref={containerRef}
            className={cn(
              "flex flex-1 min-h-0 gap-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white",
              isDragging && "select-none"
            )}
          >
            {/* Day blocks (scrollable) */}
            <div className="flex-1 overflow-y-auto min-w-0">
              {DIAS.map((day, i) => {
                const date = weekDates[i];
                const dayTasks = tasks.filter((t) => getTaskDayId(t, weekDates) === day.id && t.status !== "proxima_semana");
                return (
                  <DayBlock
                    key={day.id}
                    day={day}
                    date={date}
                    tasks={dayTasks}
                    isToday={toDateStr(date) === todayStr}
                    onAddTask={() => { setEditTask(null); setAddToDay(toDateStr(date)); setShowModal(true); }}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                    onDuplicate={(id) => duplicateMutation.mutate(id)}
                    onMoveNext={(id) => moveNextMutation.mutate(id)}
                    onPostpone={(id) => postponeMutation.mutate(id)}
                    onEdit={(task) => { setEditTask(task); setShowModal(true); }}
                  />
                );
              })}
            </div>

            {/* Resizable divider */}
            <div
              onMouseDown={handleDividerMouseDown}
              className={cn(
                "group w-1.5 flex-shrink-0 cursor-col-resize flex items-center justify-center relative",
                "hover:bg-indigo-100/60 transition-colors duration-150",
                isDragging && "bg-indigo-200"
              )}
              title="Arrastar para ajustar"
            >
              <div className={cn(
                "w-[2px] h-12 rounded-full transition-all duration-150",
                isDragging
                  ? "bg-indigo-500 h-20 opacity-100"
                  : "bg-slate-300 opacity-50 group-hover:bg-indigo-400 group-hover:opacity-100 group-hover:h-16"
              )} />
            </div>

            {/* Side panel */}
            <SidePanel
              tasks={tasks.filter((t) => t.status !== "proxima_semana")}
              notes={notes}
              onNotesChange={setNotes}
              onAddTask={() => { setEditTask(null); setAddToDay(null); setShowModal(true); }}
              onComplete={handleComplete}
              onDelete={handleDelete}
              onDuplicate={(id) => duplicateMutation.mutate(id)}
              onMoveNext={(id) => moveNextMutation.mutate(id)}
              onPostpone={(id) => postponeMutation.mutate(id)}
              onEdit={(task) => { setEditTask(task); setShowModal(true); }}
              panelWidth={panelWidth}
            />
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
          {activeTask ? (
            <SideTaskRow
              task={activeTask}
              onComplete={() => {}} onDelete={() => {}} onDuplicate={() => {}}
              onMoveNext={() => {}} onPostpone={() => {}} onEdit={() => {}}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {showModal && (
        <TaskModal
          initial={editTask}
          defaultDate={addToDay}
          onClose={() => { setShowModal(false); setEditTask(null); setAddToDay(null); }}
          onSave={handleSave}
        />
      )}

      {recurringDialog && recurringDialog.mode === "edit" && recurringDialog.pendingData && (
        <RecurringActionDialog
          mode="edit"
          onCancel={() => setRecurringDialog(null)}
          onSingle={() => {
            doUpdate(recurringDialog.task.id, recurringDialog.pendingData!, "single");
            setEditTask(null);
            setRecurringDialog(null);
          }}
          onFuture={() => {
            doUpdate(recurringDialog.task.id, recurringDialog.pendingData!, "future");
            setEditTask(null);
            setRecurringDialog(null);
          }}
          onAll={() => {
            doUpdate(recurringDialog.task.id, recurringDialog.pendingData!, "all");
            setEditTask(null);
            setRecurringDialog(null);
          }}
        />
      )}

      {recurringDialog && recurringDialog.mode === "delete" && (
        <RecurringActionDialog
          mode="delete"
          onCancel={() => setRecurringDialog(null)}
          onSingle={() => {
            deleteMutation.mutate({ id: recurringDialog.task.id, deleteMode: "single" });
            setRecurringDialog(null);
          }}
          onFuture={() => {
            // For "future", delete from this date onwards. We'll use "single" for now and delete future tasks manually.
            // A simpler approach: delete this and future by calling the API with future logic
            // For now, treat as single (full future delete would need a separate endpoint)
            deleteMutation.mutate({ id: recurringDialog.task.id, deleteMode: "single" });
            setRecurringDialog(null);
            toast({ title: "Ocorrência excluída. Para excluir futuras, exclua cada uma individualmente ou use 'Toda a série'." });
          }}
          onAll={() => {
            deleteMutation.mutate({ id: recurringDialog.task.id, deleteMode: "all" });
            setRecurringDialog(null);
          }}
        />
      )}
    </AppLayout>
  );
}
