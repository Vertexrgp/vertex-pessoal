import { useState } from "react";
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
  Plus,
  ChevronLeft,
  ChevronRight,
  Grip,
  Trash2,
  Copy,
  ArrowRight,
  X,
  Clock,
  Check,
  CheckCircle2,
  Circle,
  Pencil,
  MoreHorizontal,
  Zap,
  AlertTriangle,
  ListFilter,
  Shuffle,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getApiBase = () =>
  import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/[^/]*$/, "");
const apiUrl = (path: string) => `${getApiBase()}/api${path}`;

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const d1 = monday.getDate();
  const d2 = sunday.getDate();
  const m1 = MESES[monday.getMonth()];
  const m2 = MESES[sunday.getMonth()];
  const y = sunday.getFullYear();
  if (monday.getMonth() === sunday.getMonth()) return `${d1} – ${d2} de ${m1} ${y}`;
  return `${d1} de ${m1} – ${d2} de ${m2} ${y}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIAS = [
  { id: "segunda", label: "Segunda-feira", short: "SEG" },
  { id: "terca",   label: "Terça-feira",   short: "TER" },
  { id: "quarta",  label: "Quarta-feira",  short: "QUA" },
  { id: "quinta",  label: "Quinta-feira",  short: "QUI" },
  { id: "sexta",   label: "Sexta-feira",   short: "SEX" },
  { id: "sabado",  label: "Sábado",        short: "SÁB" },
  { id: "domingo", label: "Domingo",       short: "DOM" },
];

const PRIORIDADES = [
  { value: "alta",  label: "Alta",  color: "text-rose-600",    bg: "bg-rose-50",    border: "border-l-rose-500",    dot: "bg-rose-500",    badge: "bg-rose-100 text-rose-700" },
  { value: "media", label: "Média", color: "text-amber-600",   bg: "bg-amber-50",   border: "border-l-amber-400",   dot: "bg-amber-400",   badge: "bg-amber-100 text-amber-700" },
  { value: "baixa", label: "Baixa", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-l-emerald-400", dot: "bg-emerald-400", badge: "bg-emerald-100 text-emerald-700" },
];

const CATEGORIAS = ["trabalho", "pessoal", "saude", "financeiro", "estudo", "outros"];

const CATEGORIA_EMOJI: Record<string, string> = {
  trabalho: "💼", pessoal: "🧘", saude: "🏋️", financeiro: "💰", estudo: "📚", outros: "📌",
};

function getPrioridade(val: string) {
  return PRIORIDADES.find((p) => p.value === val) || PRIORIDADES[1];
}

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
  ordem: number;
  observacao: string | null;
  postergadaCount: number;
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onComplete,
  onDelete,
  onDuplicate,
  onMoveNext,
  onPostpone,
  onEdit,
  overlay = false,
}: {
  task: Task;
  onComplete: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveNext: () => void;
  onPostpone: () => void;
  onEdit: () => void;
  overlay?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const prio = getPrioridade(task.prioridade);
  const done = task.status === "concluida";
  const postponed = task.status === "postergada";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortDragging,
  } = useSortable({ id: task.id.toString(), disabled: overlay });

  const style = overlay
    ? {}
    : { transform: CSS.Transform.toString(transform), transition, opacity: isSortDragging ? 0.35 : 1 };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        "bg-white rounded-xl border border-slate-200 border-l-[3px] group transition-all duration-150 select-none",
        prio.border,
        overlay && "shadow-2xl rotate-1 scale-[1.02]",
        done && "opacity-50",
        postponed && "border-l-amber-400",
        !overlay && "hover:shadow-md cursor-grab active:cursor-grabbing"
      )}
    >
      <div className="p-3.5">
        {/* Postergada badge */}
        {postponed && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">
              <AlertTriangle className="w-2.5 h-2.5" />
              Postergada{task.postergadaCount > 0 ? ` (${task.postergadaCount}x)` : ""}
            </span>
          </div>
        )}

        <div className="flex items-start gap-2.5">
          {/* Drag + Checkbox */}
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            {!overlay && (
              <button
                {...attributes}
                {...listeners}
                className="text-slate-300 hover:text-slate-400 transition-colors touch-none"
                onClick={(e) => e.stopPropagation()}
              >
                <Grip className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onComplete}
              className={cn(
                "transition-colors flex-shrink-0",
                done ? "text-emerald-500" : "text-slate-300 hover:text-emerald-500"
              )}
            >
              {done
                ? <CheckCircle2 className="w-4.5 h-4.5" />
                : <Circle className="w-4.5 h-4.5" />}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-semibold text-slate-900 leading-snug line-clamp-2",
                done && "line-through text-slate-400",
                postponed && "text-slate-500"
              )}
            >
              {task.titulo}
            </p>

            {/* Meta row */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {task.estimativaTempo && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium bg-slate-100 rounded-md px-1.5 py-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {task.estimativaTempo}
                </span>
              )}
              {task.categoria && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500 font-medium bg-slate-100 rounded-md px-1.5 py-0.5 capitalize">
                  {CATEGORIA_EMOJI[task.categoria] || "📌"} {task.categoria}
                </span>
              )}
              <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold rounded-md px-1.5 py-0.5", prio.badge)}>
                <span className={cn("w-1.5 h-1.5 rounded-full inline-block flex-shrink-0", prio.dot)} />
                {prio.label}
              </span>
            </div>
          </div>

          {/* Menu */}
          {!overlay && (
            <div className="relative flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                className="p-1 text-slate-300 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100 opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 w-48 text-sm">
                    <button onClick={() => { onEdit(); setMenuOpen(false); }} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 w-full text-left text-slate-700">
                      <Pencil className="w-3.5 h-3.5 text-slate-400" /> Editar
                    </button>
                    <button onClick={() => { onDuplicate(); setMenuOpen(false); }} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 w-full text-left text-slate-700">
                      <Copy className="w-3.5 h-3.5 text-slate-400" /> Duplicar
                    </button>
                    <button onClick={() => { onMoveNext(); setMenuOpen(false); }} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 w-full text-left text-slate-700">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" /> Próxima semana
                    </button>
                    <button onClick={() => { onPostpone(); setMenuOpen(false); }} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-amber-50 w-full text-left text-amber-700">
                      <CalendarClock className="w-3.5 h-3.5" /> Marcar postergada
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button onClick={() => { onDelete(); setMenuOpen(false); }} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-rose-50 w-full text-left text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DayColumn ────────────────────────────────────────────────────────────────

function DayColumn({
  day,
  date,
  tasks,
  isToday,
  onAddTask,
  onComplete,
  onDelete,
  onDuplicate,
  onMoveNext,
  onPostpone,
  onEdit,
}: {
  day: { id: string; label: string; short: string };
  date: Date;
  tasks: Task[];
  isToday: boolean;
  onAddTask: () => void;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  onMoveNext: (id: number) => void;
  onPostpone: (id: number) => void;
  onEdit: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day.id });

  // Sort: alta first, then other pending, then done at bottom
  const pending = tasks
    .filter((t) => t.status === "pendente" || t.status === "postergada")
    .sort((a, b) => {
      const pa = a.prioridade === "alta" ? 0 : a.prioridade === "media" ? 1 : 2;
      const pb = b.prioridade === "alta" ? 0 : b.prioridade === "media" ? 1 : 2;
      if (pa !== pb) return pa - pb;
      return a.ordem - b.ordem;
    });
  const done = tasks.filter((t) => t.status === "concluida");
  const activeTasks = [...pending, ...done];
  const taskIds = activeTasks.map((t) => t.id.toString());
  const altaCount = pending.filter((t) => t.prioridade === "alta").length;

  return (
    <div className="flex flex-col min-w-[195px] w-[195px] flex-shrink-0">
      {/* Day header */}
      <div
        className={cn(
          "px-3.5 py-3 rounded-t-2xl border-b",
          isToday ? "bg-primary text-white border-primary" : "bg-white border-slate-100"
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={cn("text-[10px] font-bold uppercase tracking-widest", isToday ? "text-white/70" : "text-slate-400")}>
              {day.short}
            </p>
            <p className={cn("text-2xl font-bold leading-none mt-0.5", isToday ? "text-white" : "text-slate-800")}>
              {date.getDate()}
            </p>
          </div>
          <button
            onClick={onAddTask}
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
              isToday ? "hover:bg-white/20 text-white/70 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={cn("text-[11px] font-medium", isToday ? "text-white/70" : "text-slate-400")}>
            {activeTasks.length} tarefa{activeTasks.length !== 1 ? "s" : ""}
          </span>
          {altaCount > 0 && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-1.5 py-0.5",
              isToday ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700"
            )}>
              <Zap className="w-2.5 h-2.5" />
              {altaCount} foco
            </span>
          )}
        </div>
      </div>

      {/* Drop area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2.5 rounded-b-2xl border border-t-0 transition-all duration-150 space-y-2 min-h-[240px]",
          isOver ? "bg-primary/5 border-primary/30" : "bg-slate-50/60 border-slate-200"
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {activeTasks.map((task) => (
            <TaskCard
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
        </SortableContext>

        {activeTasks.length === 0 && (
          <div className={cn(
            "text-center py-8 rounded-xl border border-dashed transition-all",
            isOver ? "border-primary/40 bg-primary/5" : "border-slate-200"
          )}>
            <p className="text-[11px] text-slate-300 font-medium">Solte aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TaskPool ─────────────────────────────────────────────────────────────────

function TaskPool({
  tasks,
  allTasks,
  onAddTask,
  onComplete,
  onDelete,
  onDuplicate,
  onMoveNext,
  onPostpone,
  onEdit,
  onDistribute,
}: {
  tasks: Task[];
  allTasks: Task[];
  onAddTask: () => void;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  onMoveNext: (id: number) => void;
  onPostpone: (id: number) => void;
  onEdit: (task: Task) => void;
  onDistribute: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "pool" });
  const taskIds = tasks.map((t) => t.id.toString());

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-slate-900">Tarefas da Semana</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{tasks.length} não alocada{tasks.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={onAddTask}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Nova
        </button>
      </div>

      {/* Distribute button */}
      {tasks.length > 0 && (
        <button
          onClick={onDistribute}
          className="flex items-center justify-center gap-2 w-full py-2 mb-3 border border-dashed border-slate-300 text-slate-500 text-xs font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-colors"
        >
          <Shuffle className="w-3.5 h-3.5" />
          Distribuir tarefas automaticamente
        </button>
      )}

      {/* Scrollable task list */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-2xl border transition-all duration-150 overflow-y-auto",
          isOver ? "bg-primary/5 border-primary/30" : "bg-slate-50/60 border-slate-200"
        )}
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="p-2.5 space-y-2">
            {tasks.map((task) => (
              <TaskCard
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

        {tasks.length === 0 && (
          <div className="p-6 text-center">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Tudo alocado!</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Todas as tarefas têm dia definido</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FilterPanel ─────────────────────────────────────────────────────────────

type FilterType = "total" | "alocadas" | "concluidas" | "nao_alocadas" | "postergadas" | null;

function FilterPanel({
  filter,
  tasks,
  onClose,
  onComplete,
  onDelete,
  onDuplicate,
  onMoveNext,
  onPostpone,
  onEdit,
}: {
  filter: FilterType;
  tasks: Task[];
  onClose: () => void;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  onMoveNext: (id: number) => void;
  onPostpone: (id: number) => void;
  onEdit: (task: Task) => void;
}) {
  if (!filter) return null;

  const titles: Record<string, string> = {
    total: "Todas as tarefas",
    alocadas: "Tarefas alocadas",
    concluidas: "Tarefas concluídas",
    nao_alocadas: "Tarefas não alocadas",
    postergadas: "Tarefas postergadas",
  };

  const filtered = tasks.filter((t) => {
    if (filter === "total") return true;
    if (filter === "alocadas") return !!t.diaSemana && t.status !== "proxima_semana";
    if (filter === "concluidas") return t.status === "concluida";
    if (filter === "nao_alocadas") return !t.diaSemana && t.status !== "proxima_semana";
    if (filter === "postergadas") return t.status === "postergada";
    return true;
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[360px] bg-white shadow-2xl z-40 flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <p className="text-base font-bold text-slate-900">{titles[filter]}</p>
            <p className="text-xs text-slate-400 mt-0.5">{filtered.length} tarefa{filtered.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-sm">Nenhuma tarefa encontrada</p>
            </div>
          ) : (
            filtered.map((task) => (
              <div key={task.id} className="relative">
                {task.diaSemana && (
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1 pl-1">
                    {DIAS.find((d) => d.id === task.diaSemana)?.label || task.diaSemana}
                  </p>
                )}
                <TaskCard
                  task={task}
                  onComplete={() => onComplete(task.id)}
                  onDelete={() => { onDelete(task.id); }}
                  onDuplicate={() => onDuplicate(task.id)}
                  onMoveNext={() => onMoveNext(task.id)}
                  onPostpone={() => onPostpone(task.id)}
                  onEdit={() => onEdit(task)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ─── TaskModal ─────────────────────────────────────────────────────────────────

interface TaskFormData {
  titulo: string;
  descricao: string;
  prioridade: string;
  categoria: string;
  estimativaTempo: string;
  diaSemana: string;
  observacao: string;
}

function TaskModal({
  initial,
  defaultDia,
  onClose,
  onSave,
}: {
  initial?: Task | null;
  defaultDia?: string | null;
  onClose: () => void;
  onSave: (data: Partial<Task>) => void;
}) {
  const [form, setForm] = useState<TaskFormData>({
    titulo: initial?.titulo || "",
    descricao: initial?.descricao || "",
    prioridade: initial?.prioridade || "media",
    categoria: initial?.categoria || "",
    estimativaTempo: initial?.estimativaTempo || "",
    diaSemana: initial?.diaSemana || defaultDia || "",
    observacao: initial?.observacao || "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <p className="text-base font-bold text-slate-900">{initial ? "Editar tarefa" : "Nova tarefa"}</p>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Título</label>
            <input
              autoFocus
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="O que precisa ser feito?"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              onKeyDown={(e) => { if (e.key === "Enter" && form.titulo.trim()) onSave(form); }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Contexto, detalhes ou referências..."
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Prioridade</label>
              <select
                value={form.prioridade}
                onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {PRIORIDADES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Categoria</label>
              <select
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Sem categoria</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tempo est.</label>
              <input
                value={form.estimativaTempo}
                onChange={(e) => setForm((f) => ({ ...f, estimativaTempo: e.target.value }))}
                placeholder="ex: 30min"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alocar para o dia</label>
            <select
              value={form.diaSemana}
              onChange={(e) => setForm((f) => ({ ...f, diaSemana: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Não alocada (pool)</option>
              {DIAS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observação</label>
            <input
              value={form.observacao}
              onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
              placeholder="Anotação rápida..."
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => { if (form.titulo.trim()) onSave({ ...form, diaSemana: form.diaSemana || null } as Partial<Task>); }}
            disabled={!form.titulo.trim()}
            className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {initial ? "Salvar alterações" : "Criar tarefa"}
          </button>
        </div>
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
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

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
      fetch(apiUrl("/agenda/planner"), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (newTask: Task) => {
      setTasks((prev) => [...prev, newTask]);
      toast({ title: "Tarefa criada!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Partial<Task>) =>
      fetch(apiUrl(`/agenda/planner/${id}`), {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (updatedTask: Task) => {
      setTasks((prev) => prev.map((t) => t.id === updatedTask.id ? updatedTask : t));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(apiUrl(`/agenda/planner/${id}`), { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (_, id) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Tarefa removida" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(apiUrl(`/agenda/planner/${id}/duplicar`), { method: "POST" }).then((r) => r.json()),
    onSuccess: (newTask: Task) => {
      setTasks((prev) => [...prev, newTask]);
      toast({ title: "Tarefa duplicada!" });
    },
  });

  const moveNextMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(apiUrl(`/agenda/planner/${id}/proxima-semana`), { method: "POST" }).then((r) => r.json()),
    onSuccess: (_, id) => {
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "proxima_semana" } : t));
      toast({ title: "Movida para próxima semana" });
    },
  });

  const postponeMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(apiUrl(`/agenda/planner/${id}/postergar`), { method: "POST" }).then((r) => r.json()),
    onSuccess: (newTask: Task, id) => {
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "postergada" } : t));
      toast({ title: "Tarefa marcada como postergada", description: newTask.postergadaCount > 1 ? `Postergada ${newTask.postergadaCount}x` : undefined });
    },
  });

  // ─── Operations ────────────────────────────────────────────────────────────

  const handleComplete = (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "concluida" ? "pendente" : "concluida";
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
    updateMutation.mutate({ id, status: newStatus });
  };

  const handleSaveTask = (data: Partial<Task>) => {
    if (editTask) {
      setTasks((prev) => prev.map((t) => t.id === editTask.id ? { ...t, ...data } : t));
      updateMutation.mutate({ id: editTask.id, ...data });
      toast({ title: "Tarefa atualizada!" });
    } else {
      createMutation.mutate({ semanaInicio: semanaStr, ...data });
    }
    setShowModal(false);
    setEditTask(null);
    setAddToDay(null);
  };

  // Auto-distribute: assign unallocated tasks round-robin to weekdays
  const handleDistribute = () => {
    const unallocated = tasks.filter((t) => !t.diaSemana && t.status === "pendente");
    const weekdays = ["segunda", "terca", "quarta", "quinta", "sexta"];
    unallocated.forEach((task, i) => {
      const dia = weekdays[i % weekdays.length];
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, diaSemana: dia } : t));
      updateMutation.mutate({ id: task.id, diaSemana: dia });
    });
    if (unallocated.length > 0) {
      toast({ title: `${unallocated.length} tarefa${unallocated.length > 1 ? "s" : ""} distribuída${unallocated.length > 1 ? "s" : ""}!` });
    }
  };

  // ─── DnD ───────────────────────────────────────────────────────────────────

  function findContainer(id: UniqueIdentifier): string {
    const strId = id.toString();
    if (strId === "pool" || DIAS.some((d) => d.id === strId)) return strId;
    const taskId = parseInt(strId);
    const task = tasks.find((t) => t.id === taskId);
    return task?.diaSemana || "pool";
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (activeContainer === overContainer) return;
    const taskId = parseInt(active.id.toString());
    const newDia = overContainer === "pool" ? null : overContainer;
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, diaSemana: newDia } : t));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const taskId = parseInt(active.id.toString());
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (activeContainer === overContainer) {
      const containerTasks = tasks.filter((t) => {
        if (activeContainer === "pool") return !t.diaSemana && t.status === "pendente";
        return t.diaSemana === activeContainer && t.status === "pendente";
      });
      const overId = parseInt(over.id.toString());
      const oldIndex = containerTasks.findIndex((t) => t.id === taskId);
      const newIndex = containerTasks.findIndex((t) => t.id === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(containerTasks, oldIndex, newIndex);
        const updatedOrders = reordered.map((t, i) => ({ id: t.id, ordem: i }));
        setTasks((prev) => prev.map((t) => {
          const update = updatedOrders.find((u) => u.id === t.id);
          return update ? { ...t, ordem: update.ordem } : t;
        }));
        updatedOrders.forEach(({ id, ordem }) => updateMutation.mutate({ id, ordem }));
      }
    } else {
      const newDia = task.diaSemana;
      updateMutation.mutate({ id: taskId, diaSemana: newDia, status: task.status === "postergada" ? "pendente" : task.status });
    }
  }

  const activeTask = activeId ? tasks.find((t) => t.id === parseInt(activeId.toString())) : null;

  // ─── Stats ─────────────────────────────────────────────────────────────────

  const totalCount = tasks.filter((t) => t.status !== "proxima_semana").length;
  const allocatedCount = tasks.filter((t) => !!t.diaSemana && t.status !== "proxima_semana").length;
  const doneCount = tasks.filter((t) => t.status === "concluida").length;
  const unallocatedCount = tasks.filter((t) => !t.diaSemana && t.status !== "proxima_semana").length;
  const postponedCount = tasks.filter((t) => t.status === "postergada").length;

  const prevWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  const goToday = () => setWeekStart(getMondayOfWeek(new Date()));

  const todayStr = toDateStr(new Date());
  const weekDates = DIAS.map((_, i) => addDays(weekStart, i));
  const poolTasks = tasks.filter((t) => !t.diaSemana && t.status !== "proxima_semana");

  const StatButton = ({
    label, count, filter, color,
  }: { label: string; count: number; filter: FilterType; color?: string }) => (
    <button
      onClick={() => setActiveFilter(activeFilter === filter ? null : filter)}
      className={cn(
        "flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all text-sm font-semibold",
        activeFilter === filter
          ? "bg-primary text-white border-primary shadow-sm"
          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm"
      )}
    >
      <span className={cn(
        "text-base font-bold",
        activeFilter !== filter && color
      )}>
        {count}
      </span>
      <span className="text-xs font-medium opacity-80">{label}</span>
      <ListFilter className="w-3 h-3 opacity-50" />
    </button>
  );

  return (
    <AppLayout>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col h-[calc(100vh-2rem)]">
          {/* ─── Header ────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Planejamento Semanal</h1>
              <p className="text-sm text-slate-500 mt-0.5">Organize sua semana com clareza e foco</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <button onClick={prevWeek} className="p-2.5 hover:bg-slate-50 transition-colors border-r border-slate-200">
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <span className="px-4 py-2 text-sm font-semibold text-slate-800 min-w-[210px] text-center">
                  {formatWeekRange(weekStart)}
                </span>
                <button onClick={nextWeek} className="p-2.5 hover:bg-slate-50 transition-colors border-l border-slate-200">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
              <button onClick={goToday} className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
                Hoje
              </button>
              <button
                onClick={() => { setEditTask(null); setAddToDay(null); setShowModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Nova Tarefa
              </button>
            </div>
          </div>

          {/* ─── Stats bar (filterable) ─────────────────────────── */}
          <div className="flex items-center gap-2 mb-4 flex-shrink-0 flex-wrap">
            <StatButton label="Total" count={totalCount} filter="total" />
            <StatButton label="Alocadas" count={allocatedCount} filter="alocadas" color="text-primary" />
            <StatButton label="Concluídas" count={doneCount} filter="concluidas" color="text-emerald-600" />
            <StatButton label="Não alocadas" count={unallocatedCount} filter="nao_alocadas" color="text-amber-600" />
            {postponedCount > 0 && (
              <StatButton label="Postergadas" count={postponedCount} filter="postergadas" color="text-orange-600" />
            )}
          </div>

          {/* ─── Main layout ────────────────────────────────────── */}
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Day columns — horizontally scrollable */}
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="flex gap-2.5 h-full min-w-fit pb-2">
                {DIAS.map((day, i) => {
                  const date = weekDates[i];
                  const dayTasks = tasks.filter(
                    (t) => t.diaSemana === day.id && t.status !== "proxima_semana"
                  );
                  const isToday = toDateStr(date) === todayStr;
                  return (
                    <DayColumn
                      key={day.id}
                      day={day}
                      date={date}
                      tasks={dayTasks}
                      isToday={isToday}
                      onAddTask={() => { setEditTask(null); setAddToDay(day.id); setShowModal(true); }}
                      onComplete={handleComplete}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onDuplicate={(id) => duplicateMutation.mutate(id)}
                      onMoveNext={(id) => moveNextMutation.mutate(id)}
                      onPostpone={(id) => postponeMutation.mutate(id)}
                      onEdit={(task) => { setEditTask(task); setShowModal(true); }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Task Pool */}
            <TaskPool
              tasks={poolTasks}
              allTasks={tasks}
              onAddTask={() => { setEditTask(null); setAddToDay(null); setShowModal(true); }}
              onComplete={handleComplete}
              onDelete={(id) => deleteMutation.mutate(id)}
              onDuplicate={(id) => duplicateMutation.mutate(id)}
              onMoveNext={(id) => moveNextMutation.mutate(id)}
              onPostpone={(id) => postponeMutation.mutate(id)}
              onEdit={(task) => { setEditTask(task); setShowModal(true); }}
              onDistribute={handleDistribute}
            />
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              onComplete={() => {}}
              onDelete={() => {}}
              onDuplicate={() => {}}
              onMoveNext={() => {}}
              onPostpone={() => {}}
              onEdit={() => {}}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Modal */}
      {showModal && (
        <TaskModal
          initial={editTask}
          defaultDia={addToDay}
          onClose={() => { setShowModal(false); setEditTask(null); setAddToDay(null); }}
          onSave={handleSaveTask}
        />
      )}

      {/* Filter Panel */}
      <FilterPanel
        filter={activeFilter}
        tasks={tasks.filter((t) => t.status !== "proxima_semana")}
        onClose={() => setActiveFilter(null)}
        onComplete={handleComplete}
        onDelete={(id) => deleteMutation.mutate(id)}
        onDuplicate={(id) => duplicateMutation.mutate(id)}
        onMoveNext={(id) => moveNextMutation.mutate(id)}
        onPostpone={(id) => postponeMutation.mutate(id)}
        onEdit={(task) => { setEditTask(task); setShowModal(true); setActiveFilter(null); }}
      />
    </AppLayout>
  );
}
