import { useState, useCallback } from "react";
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
  Tag,
  Flag,
  Check,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  CalendarDays,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  if (monday.getMonth() === sunday.getMonth()) {
    return `${d1} – ${d2} de ${m1} ${y}`;
  }
  return `${d1} de ${m1} – ${d2} de ${m2} ${y}`;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DIAS: { id: string; label: string; short: string }[] = [
  { id: "segunda", label: "Segunda", short: "Seg" },
  { id: "terca", label: "Terça", short: "Ter" },
  { id: "quarta", label: "Quarta", short: "Qua" },
  { id: "quinta", label: "Quinta", short: "Qui" },
  { id: "sexta", label: "Sexta", short: "Sex" },
  { id: "sabado", label: "Sábado", short: "Sáb" },
  { id: "domingo", label: "Domingo", short: "Dom" },
];

const PRIORIDADES = [
  { value: "alta", label: "Alta", color: "text-rose-600", bg: "bg-rose-50", border: "border-l-rose-500", dot: "bg-rose-500" },
  { value: "media", label: "Média", color: "text-amber-600", bg: "bg-amber-50", border: "border-l-amber-500", dot: "bg-amber-500" },
  { value: "baixa", label: "Baixa", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-l-emerald-500", dot: "bg-emerald-500" },
];

const CATEGORIAS = ["trabalho", "pessoal", "saude", "financeiro", "estudo", "outros"];

function getPrioridade(val: string) {
  return PRIORIDADES.find((p) => p.value === val) || PRIORIDADES[1];
}

// ─── Types ───────────────────────────────────────────────────────────────────

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
}

// ─── TaskCard ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onComplete,
  onDelete,
  onDuplicate,
  onMoveNext,
  onEdit,
  isDragging = false,
  overlay = false,
}: {
  task: Task;
  onComplete: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveNext: () => void;
  onEdit: () => void;
  isDragging?: boolean;
  overlay?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const prio = getPrioridade(task.prioridade);
  const done = task.status === "concluida";

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
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isSortDragging ? 0.4 : 1,
      };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        "bg-white rounded-xl border border-slate-200 border-l-[3px] group transition-all duration-150 select-none",
        prio.border,
        overlay && "shadow-2xl rotate-1 scale-[1.02]",
        done && "opacity-60",
        !overlay && "hover:border-slate-300 hover:shadow-sm cursor-grab active:cursor-grabbing"
      )}
    >
      <div className="p-3">
        <div className="flex items-start gap-2">
          {/* Drag handle + checkbox */}
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            {!overlay && (
              <button
                {...attributes}
                {...listeners}
                className="text-slate-300 hover:text-slate-500 transition-colors touch-none p-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <Grip className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={onComplete}
              className={cn(
                "transition-colors flex-shrink-0",
                done ? "text-emerald-500" : "text-slate-300 hover:text-emerald-500"
              )}
            >
              {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium text-slate-900 leading-snug",
                done && "line-through text-slate-400"
              )}
            >
              {task.titulo}
            </p>
            {task.descricao && (
              <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">
                {task.descricao}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {task.estimativaTempo && (
                <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-medium">
                  <Clock className="w-2.5 h-2.5" />
                  {task.estimativaTempo}
                </span>
              )}
              {task.categoria && (
                <span className="text-[10px] text-slate-400 font-medium capitalize">{task.categoria}</span>
              )}
              <span className={cn("text-[10px] font-semibold flex items-center gap-1", prio.color)}>
                <span className={cn("w-1.5 h-1.5 rounded-full inline-block", prio.dot)} />
                {prio.label}
              </span>
            </div>
          </div>

          {/* Menu */}
          {!overlay && (
            <div className="relative flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                className="p-0.5 text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-5 z-20 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 w-44 text-sm">
                    <button onClick={() => { onEdit(); setMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 w-full text-left text-slate-700">
                      <Pencil className="w-3.5 h-3.5 text-slate-400" /> Editar
                    </button>
                    <button onClick={() => { onDuplicate(); setMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 w-full text-left text-slate-700">
                      <Copy className="w-3.5 h-3.5 text-slate-400" /> Duplicar
                    </button>
                    <button onClick={() => { onMoveNext(); setMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 w-full text-left text-slate-700">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" /> Próxima semana
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button onClick={() => { onDelete(); setMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-rose-50 w-full text-left text-rose-600">
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

// ─── DayColumn ───────────────────────────────────────────────────────────────

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
  onEdit: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day.id });
  const activeTasks = tasks.filter((t) => t.status !== "concluida" && t.status !== "proxima_semana");
  const taskIds = activeTasks.map((t) => t.id.toString());

  return (
    <div className="flex flex-col min-w-0">
      {/* Day header */}
      <div
        className={cn(
          "px-3 py-2.5 rounded-t-xl border-b",
          isToday
            ? "bg-primary text-white border-primary"
            : "bg-white border-slate-100"
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={cn("text-xs font-semibold uppercase tracking-wider", isToday ? "text-white/80" : "text-slate-400")}>
              {day.short}
            </p>
            <p className={cn("text-lg font-bold leading-tight", isToday ? "text-white" : "text-slate-800")}>
              {date.getDate()}
            </p>
          </div>
          <button
            onClick={onAddTask}
            className={cn(
              "p-1 rounded-lg transition-colors",
              isToday ? "hover:bg-white/20 text-white/70 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className={cn("text-[10px] mt-0.5 font-medium", isToday ? "text-white/60" : "text-slate-400")}>
          {activeTasks.length} tarefa{activeTasks.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Drop area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[200px] p-2 rounded-b-xl border border-t-0 transition-colors space-y-1.5",
          isOver ? "bg-primary/5 border-primary/30" : "bg-slate-50/80 border-slate-200"
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
              onEdit={() => onEdit(task)}
            />
          ))}
        </SortableContext>

        {activeTasks.length === 0 && (
          <div
            className={cn(
              "text-center py-6 rounded-lg border border-dashed transition-colors",
              isOver ? "border-primary/40 bg-primary/5" : "border-slate-200"
            )}
          >
            <p className="text-[10px] text-slate-300 font-medium">Solte aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TaskPool ─────────────────────────────────────────────────────────────────

function TaskPool({
  tasks,
  onAddTask,
  onComplete,
  onDelete,
  onDuplicate,
  onMoveNext,
  onEdit,
}: {
  tasks: Task[];
  onAddTask: () => void;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  onMoveNext: (id: number) => void;
  onEdit: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "pool" });

  const poolTasks = tasks.filter(
    (t) => !t.diaSemana && t.status === "pendente"
  );
  const completedTasks = tasks.filter((t) => t.status === "concluida");
  const nextWeekTasks = tasks.filter((t) => t.status === "proxima_semana");
  const poolIds = poolTasks.map((t) => t.id.toString());

  const [showCompleted, setShowCompleted] = useState(false);
  const [showNextWeek, setShowNextWeek] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Tarefas da Semana
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {poolTasks.length} não alocada{poolTasks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onAddTask}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Nova
        </button>
      </div>

      {/* Pool droppable */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 overflow-y-auto rounded-xl border transition-colors min-h-[120px]",
          isOver ? "bg-primary/5 border-primary/30" : "bg-white border-slate-200"
        )}
      >
        <div className="p-3 space-y-2">
          <SortableContext items={poolIds} strategy={verticalListSortingStrategy}>
            {poolTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={() => onComplete(task.id)}
                onDelete={() => onDelete(task.id)}
                onDuplicate={() => onDuplicate(task.id)}
                onMoveNext={() => onMoveNext(task.id)}
                onEdit={() => onEdit(task)}
              />
            ))}
          </SortableContext>

          {poolTasks.length === 0 && (
            <div className={cn("text-center py-8 rounded-xl border border-dashed transition-colors", isOver ? "border-primary/40 bg-primary/5" : "border-slate-100")}>
              <CalendarDays className="w-7 h-7 mx-auto mb-2 text-slate-200" />
              <p className="text-xs text-slate-300 font-medium">Adicione tarefas da semana</p>
              <p className="text-[10px] text-slate-300 mt-0.5">ou solte aqui para desalocar</p>
            </div>
          )}
        </div>
      </div>

      {/* Completed section */}
      {completedTasks.length > 0 && (
        <div className="mt-3 flex-shrink-0">
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="flex items-center justify-between w-full px-1 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Concluídas ({completedTasks.length})
            </span>
            <ChevronLeft className={cn("w-3 h-3 transition-transform", showCompleted ? "-rotate-90" : "rotate-180")} />
          </button>
          {showCompleted && (
            <div className="space-y-1.5 mt-1">
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={() => onComplete(task.id)}
                  onDelete={() => onDelete(task.id)}
                  onDuplicate={() => onDuplicate(task.id)}
                  onMoveNext={() => onMoveNext(task.id)}
                  onEdit={() => onEdit(task)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Next week section */}
      {nextWeekTasks.length > 0 && (
        <div className="mt-3 flex-shrink-0">
          <button
            onClick={() => setShowNextWeek((v) => !v)}
            className="flex items-center justify-between w-full px-1 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
              Próxima semana ({nextWeekTasks.length})
            </span>
            <ChevronLeft className={cn("w-3 h-3 transition-transform", showNextWeek ? "-rotate-90" : "rotate-180")} />
          </button>
          {showNextWeek && (
            <div className="space-y-1.5 mt-1">
              {nextWeekTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={() => onComplete(task.id)}
                  onDelete={() => onDelete(task.id)}
                  onDuplicate={() => onDuplicate(task.id)}
                  onMoveNext={() => onMoveNext(task.id)}
                  onEdit={() => onEdit(task)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TaskModal ────────────────────────────────────────────────────────────────

function TaskModal({
  semanaInicio,
  initial,
  initialDay,
  onSave,
  onClose,
}: {
  semanaInicio: string;
  initial?: Task | null;
  initialDay?: string | null;
  onSave: (data: Partial<Task>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    titulo: initial?.titulo || "",
    descricao: initial?.descricao || "",
    prioridade: initial?.prioridade || "media",
    categoria: initial?.categoria || "",
    estimativaTempo: initial?.estimativaTempo || "",
    diaSemana: initial?.diaSemana || initialDay || "",
    observacao: initial?.observacao || "",
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{initial ? "Editar Tarefa" : "Nova Tarefa"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título *</label>
            <input
              autoFocus
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="O que precisa ser feito?"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              onKeyDown={(e) => { if (e.key === "Enter" && form.titulo.trim()) onSave(form); }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Contexto, detalhes ou referências..."
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prioridade</label>
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
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoria</label>
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
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tempo est.</label>
              <input
                value={form.estimativaTempo}
                onChange={(e) => setForm((f) => ({ ...f, estimativaTempo: e.target.value }))}
                placeholder="ex: 30min"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Alocar para o dia</label>
            <select
              value={form.diaSemana}
              onChange={(e) => setForm((f) => ({ ...f, diaSemana: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Não alocada (pool)</option>
              {DIAS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observação</label>
            <input
              value={form.observacao}
              onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
              placeholder="Anotação rápida..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => { if (form.titulo.trim()) onSave({ ...form, diaSemana: form.diaSemana || null }); }}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlanejamentoSemanalPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  // Week navigation
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const semanaStr = toDateStr(weekStart);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [addToDay, setAddToDay] = useState<string | null>(null);

  // Drag state
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Data fetching
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["planner-tasks", semanaStr],
    queryFn: () => fetch(apiUrl(`/agenda/planner?semana=${semanaStr}`)).then((r) => r.json()),
  });

  // Optimistic update helper
  const setTasks = (updater: (prev: Task[]) => Task[]) => {
    qc.setQueryData(["planner-tasks", semanaStr], updater);
  };

  // Mutations
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

  // Task operations
  const handleComplete = useCallback((id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "concluida" ? "pendente" : "concluida";
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
    updateMutation.mutate({ id, status: newStatus });
  }, [tasks]);

  const handleSaveTask = useCallback((data: Partial<Task>) => {
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
  }, [editTask, semanaStr]);

  // ─── DnD handlers ──────────────────────────────────────────────────────────

  function findContainer(id: UniqueIdentifier): string {
    const strId = id.toString();
    // Check if it's a container ID
    if (strId === "pool" || DIAS.some((d) => d.id === strId)) return strId;
    // Find by task ID
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

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, diaSemana: newDia } : t))
    );
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
      // Reorder within same container
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
        setTasks((prev) =>
          prev.map((t) => {
            const update = updatedOrders.find((u) => u.id === t.id);
            return update ? { ...t, ordem: update.ordem } : t;
          })
        );
        updatedOrders.forEach(({ id, ordem }) => {
          updateMutation.mutate({ id, ordem });
        });
      }
    } else {
      // Cross-container drop — already handled in dragOver, just persist
      const newDia = task.diaSemana;
      updateMutation.mutate({ id: taskId, diaSemana: newDia, status: "pendente" });
    }
  }

  const activeTask = activeId ? tasks.find((t) => t.id === parseInt(activeId.toString())) : null;

  // Week navigation
  const prevWeek = () => setWeekStart((d) => { const next = new Date(d); next.setDate(next.getDate() - 7); return next; });
  const nextWeek = () => setWeekStart((d) => { const next = new Date(d); next.setDate(next.getDate() + 7); return next; });
  const goToday = () => setWeekStart(getMondayOfWeek(new Date()));

  const todayStr = toDateStr(new Date());
  const weekDates = DIAS.map((_, i) => addDays(weekStart, i));

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Planejamento Semanal</h1>
            <p className="text-sm text-slate-500 mt-0.5">Organize sua semana com clareza e foco</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <button onClick={prevWeek} className="p-2 hover:bg-slate-50 transition-colors border-r border-slate-200">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <div className="px-4 py-1.5 text-sm font-semibold text-slate-800 min-w-[200px] text-center">
                {formatWeekRange(weekStart)}
              </div>
              <button onClick={nextWeek} className="p-2 hover:bg-slate-50 transition-colors border-l border-slate-200">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <button
              onClick={goToday}
              className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              Hoje
            </button>
            <button
              onClick={() => { setEditTask(null); setAddToDay(null); setShowModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nova Tarefa
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-5 flex-shrink-0">
          {[
            { label: "Total", count: tasks.filter(t => t.status !== "proxima_semana").length, color: "text-slate-700" },
            { label: "Alocadas", count: tasks.filter(t => t.diaSemana && t.status === "pendente").length, color: "text-primary" },
            { label: "Concluídas", count: tasks.filter(t => t.status === "concluida").length, color: "text-emerald-600" },
            { label: "Não alocadas", count: tasks.filter(t => !t.diaSemana && t.status === "pendente").length, color: "text-amber-600" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-1.5">
              <span className={cn("text-xl font-bold", stat.color)}>{stat.count}</span>
              <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
            </div>
          ))}
          {tasks.filter(t => t.status !== "proxima_semana").length > 0 && (
            <div className="flex-1 max-w-[200px]">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(
                      (tasks.filter(t => t.status === "concluida").length /
                        Math.max(tasks.filter(t => t.status !== "proxima_semana").length, 1)) * 100
                    )}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Main layout */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 flex-1 overflow-hidden min-h-0">
            {/* Days grid — LEFT */}
            <div className="flex-1 overflow-x-auto min-w-0">
              <div className="grid grid-cols-7 gap-2 h-full min-w-[700px]">
                {DIAS.map((day, idx) => {
                  const date = weekDates[idx];
                  const dateStr = toDateStr(date);
                  const isToday = dateStr === todayStr;
                  const dayTasks = tasks
                    .filter((t) => t.diaSemana === day.id)
                    .sort((a, b) => a.ordem - b.ordem);

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
                      onEdit={(task) => { setEditTask(task); setAddToDay(null); setShowModal(true); }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Task pool — RIGHT */}
            <div className="w-[280px] flex-shrink-0 overflow-hidden flex flex-col">
              <TaskPool
                tasks={tasks}
                onAddTask={() => { setEditTask(null); setAddToDay(null); setShowModal(true); }}
                onComplete={handleComplete}
                onDelete={(id) => deleteMutation.mutate(id)}
                onDuplicate={(id) => duplicateMutation.mutate(id)}
                onMoveNext={(id) => moveNextMutation.mutate(id)}
                onEdit={(task) => { setEditTask(task); setAddToDay(null); setShowModal(true); }}
              />
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                onComplete={() => {}}
                onDelete={() => {}}
                onDuplicate={() => {}}
                onMoveNext={() => {}}
                onEdit={() => {}}
                overlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task modal */}
      {showModal && (
        <TaskModal
          semanaInicio={semanaStr}
          initial={editTask}
          initialDay={addToDay}
          onSave={handleSaveTask}
          onClose={() => { setShowModal(false); setEditTask(null); setAddToDay(null); }}
        />
      )}
    </AppLayout>
  );
}
