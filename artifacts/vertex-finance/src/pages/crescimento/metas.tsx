import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { goalsApi, type Goal } from "@/lib/crescimento-api";
import {
  Flag, Plus, Target, Clock, TrendingUp, Pencil, Trash2, X, Loader2,
  AlertCircle, ArrowRight, Layers,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIPO_OPTS = [
  { value: "pessoal",      label: "Pessoal",      color: "bg-violet-100 text-violet-700" },
  { value: "profissional", label: "Profissional",  color: "bg-blue-100 text-blue-700" },
  { value: "financeiro",   label: "Financeiro",    color: "bg-emerald-100 text-emerald-700" },
  { value: "fisico",       label: "Físico",        color: "bg-rose-100 text-rose-700" },
];

const STATUS_OPTS = [
  { value: "ativa",     label: "Ativa",     dot: "bg-emerald-500" },
  { value: "pausada",   label: "Pausada",   dot: "bg-amber-500" },
  { value: "concluida", label: "Concluída", dot: "bg-sky-500" },
  { value: "cancelada", label: "Cancelada", dot: "bg-slate-400" },
];

const PRIOR_OPTS = [
  { value: "alta",  label: "Alta",  color: "text-rose-600" },
  { value: "media", label: "Média", color: "text-amber-600" },
  { value: "baixa", label: "Baixa", color: "text-slate-500" },
];

const CORES = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6"];

function tipoColor(tipo: string) {
  return TIPO_OPTS.find((t) => t.value === tipo)?.color ?? "bg-slate-100 text-slate-600";
}

function statusDot(status: string) {
  return STATUS_OPTS.find((s) => s.value === status)?.dot ?? "bg-slate-400";
}

function prioridadeLabel(p: string) {
  return PRIOR_OPTS.find((o) => o.value === p)?.label ?? p;
}

type FormData = {
  titulo: string; descricao: string; tipo: string; prazo: string;
  status: string; prioridade: string; progresso: number; cor: string;
};

const emptyForm: FormData = {
  titulo: "", descricao: "", tipo: "pessoal", prazo: "",
  status: "ativa", prioridade: "media", progresso: 0, cor: "#6366F1",
};

// ─── Modal ────────────────────────────────────────────────────────────────────

function GoalModal({
  initial, onSave, onClose, saving,
}: {
  initial?: Goal;
  onSave: (data: FormData) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormData>(initial
    ? { titulo: initial.titulo, descricao: initial.descricao ?? "", tipo: initial.tipo, prazo: initial.prazo ?? "", status: initial.status, prioridade: initial.prioridade, progresso: initial.progresso, cor: initial.cor }
    : emptyForm
  );

  const set = (k: keyof FormData, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{initial ? "Editar Meta" : "Nova Meta"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título *</label>
            <input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ex: Faturar R$ 100k/mês" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição</label>
            <textarea value={form.descricao} onChange={(e) => set("descricao", e.target.value)} rows={2} placeholder="Por que essa meta importa?" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo</label>
              <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {TIPO_OPTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prioridade</label>
              <select value={form.prioridade} onChange={(e) => set("prioridade", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {PRIOR_OPTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prazo</label>
              <input type="date" value={form.prazo} onChange={(e) => set("prazo", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {STATUS_OPTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Progresso: {form.progresso}%</label>
            <input type="range" min={0} max={100} value={form.progresso} onChange={(e) => set("progresso", parseInt(e.target.value))} className="w-full accent-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {CORES.map((c) => (
                <button key={c} onClick={() => set("cor", c)} className="w-7 h-7 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: form.cor === c ? "#1e293b" : "transparent" }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button
            onClick={() => form.titulo.trim() && onSave(form)}
            disabled={saving || !form.titulo.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {initial ? "Salvar" : "Criar Meta"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const prazoFmt = goal.prazo ? format(new Date(goal.prazo + "T00:00:00"), "dd MMM yyyy", { locale: ptBR }) : null;
  const isAtrasada = goal.prazo && new Date(goal.prazo) < new Date() && goal.status === "ativa";

  return (
    <Link href={`/crescimento/metas/${goal.id}`}>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group">
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: goal.cor + "22" }}>
                <Flag className="w-5 h-5" style={{ color: goal.cor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tipoColor(goal.tipo)}`}>{TIPO_OPTS.find((t) => t.value === goal.tipo)?.label}</span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <div className={`w-1.5 h-1.5 rounded-full ${statusDot(goal.status)}`} />
                    {STATUS_OPTS.find((s) => s.value === goal.status)?.label}
                  </span>
                  {goal.prioridade === "alta" && <span className="text-[10px] font-bold text-rose-600">↑ Alta</span>}
                </div>
                <p className="font-bold text-slate-900 leading-snug">{goal.titulo}</p>
                {goal.descricao && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{goal.descricao}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${goal.progresso}%`, backgroundColor: goal.cor }} />
            </div>
            <span className="text-sm font-black w-10 text-right" style={{ color: goal.cor }}>{goal.progresso}%</span>
          </div>

          <div className="flex items-center justify-between">
            {prazoFmt ? (
              <div className={`flex items-center gap-1.5 text-xs ${isAtrasada ? "text-red-500" : "text-slate-400"}`}>
                <Clock className="w-3.5 h-3.5" />
                {isAtrasada ? "Atrasada · " : ""}{prazoFmt}
                {isAtrasada && <AlertCircle className="w-3.5 h-3.5" />}
              </div>
            ) : <span />}
            <span className="flex items-center gap-1 text-xs text-indigo-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Ver detalhes <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MetasPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<null | "new" | Goal>(null);

  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: goalsApi.list,
  });

  const createMeta = useMutation({
    mutationFn: (data: Parameters<typeof goalsApi.create>[0]) => goalsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); setModal(null); },
  });

  const updateMeta = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Goal> }) => goalsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); setModal(null); },
  });

  const deleteMeta = useMutation({
    mutationFn: (id: number) => goalsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  const ativas = goals.filter((g) => g.status === "ativa").length;
  const concluidas = goals.filter((g) => g.status === "concluida").length;
  const avgProgress = goals.length ? Math.round(goals.reduce((s, g) => s + g.progresso, 0) / goals.length) : 0;

  const saving = createMeta.isPending || updateMeta.isPending;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Crescimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Flag className="w-6 h-6 text-indigo-500" /> Metas
            </h1>
            <p className="text-sm text-slate-400 mt-1">Para onde você está indo e o que quer alcançar.</p>
          </div>
          <button onClick={() => setModal("new")} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nova Meta
          </button>
        </div>

        {/* Stats */}
        {goals.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><Flag className="w-5 h-5 text-indigo-600" /></div>
              <div><p className="text-xs text-slate-500">Total de Metas</p><p className="text-xl font-bold text-slate-900">{goals.length}</p></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
              <div><p className="text-xs text-slate-500">Ativas / Concluídas</p><p className="text-xl font-bold text-slate-900">{ativas} / {concluidas}</p></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Target className="w-5 h-5 text-amber-600" /></div>
              <div><p className="text-xs text-slate-500">Progresso Médio</p><p className="text-xl font-bold text-slate-900">{avgProgress}%</p></div>
            </div>
          </div>
        )}

        {/* Goals */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4"><Flag className="w-8 h-8 text-indigo-400" /></div>
            <p className="font-semibold text-slate-700 mb-1">Nenhuma meta ainda</p>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">Defina sua primeira grande meta e comece a transformar seus sonhos em realidade.</p>
            <button onClick={() => setModal("new")} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Criar primeira meta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={(e) => { e.preventDefault(); e.stopPropagation(); setModal(goal); }}
                onDelete={(e) => { e.preventDefault(); e.stopPropagation(); deleteMeta.mutate(goal.id); }}
              />
            ))}
          </div>
        )}
      </div>

      {modal !== null && (
        <GoalModal
          initial={modal === "new" ? undefined : modal}
          saving={saving}
          onClose={() => setModal(null)}
          onSave={(data) => {
            if (modal === "new") {
              createMeta.mutate(data as Parameters<typeof goalsApi.create>[0]);
            } else {
              updateMeta.mutate({ id: (modal as Goal).id, data });
            }
          }}
        />
      )}
    </AppLayout>
  );
}
