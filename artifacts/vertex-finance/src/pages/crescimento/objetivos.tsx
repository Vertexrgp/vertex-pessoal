import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { goalsApi, objectivesApi, plansApi, type Goal, type Objective, type Plan } from "@/lib/crescimento-api";
import {
  Target, Plus, CheckCircle2, Circle, ChevronDown, ChevronRight,
  Trash2, Loader2, X, Pencil,
} from "lucide-react";

const OBJ_STATUS_MAP = {
  pendente:      { label: "Pendente",     cls: "bg-slate-100 text-slate-600" },
  em_andamento:  { label: "Em andamento", cls: "bg-amber-100 text-amber-700" },
  concluido:     { label: "Concluído",    cls: "bg-emerald-100 text-emerald-700" },
};

// ─── Add Objective Modal ──────────────────────────────────────────────────────

function AddObjModal({
  goals,
  defaultGoalId,
  onSave,
  onClose,
  saving,
}: {
  goals: Goal[];
  defaultGoalId?: number;
  onSave: (d: { goalId: number; titulo: string; descricao: string; status: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [goalId, setGoalId] = useState(defaultGoalId ?? (goals[0]?.id ?? 0));
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Novo Objetivo</h2>
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
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Aprender inglês fluente" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button
            onClick={() => titulo.trim() && onSave({ goalId, titulo, descricao, status: "pendente" })}
            disabled={saving || !titulo.trim() || !goalId}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Criar Objetivo
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Objective Row ────────────────────────────────────────────────────────────

function ObjectiveRow({ obj, onToggle, onDelete }: {
  obj: Objective;
  onToggle: (status: string) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["plans", obj.id],
    queryFn: () => plansApi.list(obj.id),
    enabled: open,
  });

  const [newStep, setNewStep] = useState("");
  const addPlan = useMutation({
    mutationFn: () => plansApi.create({ objectiveId: obj.id, titulo: newStep }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans", obj.id] }); setNewStep(""); },
  });
  const togglePlan = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => plansApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans", obj.id] }),
  });
  const deletePlan = useMutation({
    mutationFn: (id: number) => plansApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans", obj.id] }),
  });

  const done = obj.status === "concluido";
  const st = OBJ_STATUS_MAP[obj.status as keyof typeof OBJ_STATUS_MAP] ?? OBJ_STATUS_MAP.pendente;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => onToggle(done ? "pendente" : "concluido")} className="flex-shrink-0">
          {done ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-300" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${done ? "line-through text-slate-400" : "text-slate-800"}`}>{obj.titulo}</p>
          {obj.descricao && <p className="text-xs text-slate-400 mt-0.5">{obj.descricao}</p>}
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${st.cls}`}>{st.label}</span>
        <button onClick={() => setOpen((p) => !p)} className="p-1.5 rounded-lg hover:bg-slate-100 flex-shrink-0">
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0"><Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" /></button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-10 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Etapas do plano</p>
          <div className="flex flex-col gap-1.5 mb-3">
            {plans.map((p) => (
              <div key={p.id} className="flex items-center gap-2 group">
                <button onClick={() => togglePlan.mutate({ id: p.id, status: p.status === "concluido" ? "pendente" : "concluido" })}>
                  {p.status === "concluido" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300" />}
                </button>
                <span className={`text-xs flex-1 ${p.status === "concluido" ? "line-through text-slate-400" : "text-slate-700"}`}>{p.titulo}</span>
                <button onClick={() => deletePlan.mutate(p.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3 text-slate-300 hover:text-red-400" /></button>
              </div>
            ))}
            {plans.length === 0 && <p className="text-xs text-slate-400">Nenhuma etapa ainda.</p>}
          </div>
          <div className="flex gap-2">
            <input
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newStep.trim() && addPlan.mutate()}
              placeholder="Adicionar etapa..."
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => newStep.trim() && addPlan.mutate()}
              disabled={!newStep.trim() || addPlan.isPending}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {addPlan.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ObjetivosPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [filterGoal, setFilterGoal] = useState<number | "all">("all");

  const { data: goals = [], isLoading: loadingGoals } = useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: goalsApi.list,
  });

  const { data: allObjectives = [], isLoading } = useQuery<Objective[]>({
    queryKey: ["objectives"],
    queryFn: () => objectivesApi.list(),
  });

  const objectives = filterGoal === "all" ? allObjectives : allObjectives.filter((o) => o.goalId === filterGoal);

  const createObj = useMutation({
    mutationFn: objectivesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["objectives"] }); setModal(false); },
  });

  const toggleObj = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => objectivesApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["objectives"] }),
  });

  const deleteObj = useMutation({
    mutationFn: objectivesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["objectives"] }),
  });

  const grouped = goals.map((g) => ({
    goal: g,
    objs: objectives.filter((o) => o.goalId === g.id),
  })).filter((g) => g.objs.length > 0);

  const noGoals = goals.length === 0 && !loadingGoals;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Crescimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Target className="w-6 h-6 text-indigo-500" /> Objetivos
            </h1>
            <p className="text-sm text-slate-400 mt-1">Cada meta dividida em objetivos concretos com etapas.</p>
          </div>
          <button
            onClick={() => setModal(true)}
            disabled={goals.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Objetivo
          </button>
        </div>

        {/* Filter */}
        {goals.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterGoal("all")} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filterGoal === "all" ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              Todas as metas
            </button>
            {goals.map((g) => (
              <button key={g.id} onClick={() => setFilterGoal(g.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${filterGoal === g.id ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: g.cor }} />
                {g.titulo}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {isLoading || loadingGoals ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : noGoals ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="font-semibold text-slate-700 mb-1">Crie metas primeiro</p>
            <p className="text-sm text-slate-400 mb-4">Objetivos precisam estar vinculados a uma meta.</p>
            <a href="/crescimento/metas" className="text-sm text-primary font-semibold hover:underline">→ Ir para Metas</a>
          </div>
        ) : objectives.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4"><Target className="w-7 h-7 text-indigo-400" /></div>
            <p className="font-semibold text-slate-700 mb-1">Nenhum objetivo ainda</p>
            <p className="text-sm text-slate-400 mb-5">Divida suas metas em objetivos menores e mais concretos.</p>
            <button onClick={() => setModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4" /> Criar primeiro objetivo
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map(({ goal, objs }) => (
              <div key={goal.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: goal.cor }} />
                  <p className="text-sm font-bold text-slate-700">{goal.titulo}</p>
                  <span className="text-xs text-slate-400">{objs.filter((o) => o.status === "concluido").length}/{objs.length} concluídos</span>
                </div>
                <div className="flex flex-col gap-2 pl-4 border-l-2 border-slate-100">
                  {objs.map((obj) => (
                    <ObjectiveRow
                      key={obj.id}
                      obj={obj}
                      onToggle={(status) => toggleObj.mutate({ id: obj.id, status })}
                      onDelete={() => deleteObj.mutate(obj.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <AddObjModal
          goals={goals}
          defaultGoalId={typeof filterGoal === "number" ? filterGoal : undefined}
          saving={createObj.isPending}
          onClose={() => setModal(false)}
          onSave={createObj.mutate}
        />
      )}
    </AppLayout>
  );
}
