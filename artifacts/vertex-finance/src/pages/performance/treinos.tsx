import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PerformanceLayout } from "@/components/layout/PerformanceLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dumbbell, Plus, Pencil, Trash2, Check, X, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const GRUPOS = ["Peito", "Costas", "Ombro", "Bíceps", "Tríceps", "Pernas", "Glúteos", "Abdômen", "Full Body", "HIIT", "Cardio"];
const LETRAS = ["A", "B", "C", "D", "E", "F"];

type Exercise = { nome: string; series: number; reps: string; carga: string; descanso: string; observacao: string };

function ExerciseRow({ ex, idx, onChange, onRemove }: { ex: Exercise; idx: number; onChange: (i: number, k: string, v: any) => void; onRemove: (i: number) => void }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <div className="col-span-4">
        <input value={ex.nome} onChange={e => onChange(idx, "nome", e.target.value)}
          className="input w-full text-sm" placeholder="Ex: Supino reto" />
      </div>
      <div className="col-span-1">
        <input type="number" value={ex.series} onChange={e => onChange(idx, "series", Number(e.target.value))}
          className="input w-full text-sm text-center" placeholder="4" min={1} />
      </div>
      <div className="col-span-2">
        <input value={ex.reps} onChange={e => onChange(idx, "reps", e.target.value)}
          className="input w-full text-sm" placeholder="8-12" />
      </div>
      <div className="col-span-2">
        <input value={ex.carga} onChange={e => onChange(idx, "carga", e.target.value)}
          className="input w-full text-sm" placeholder="80 kg" />
      </div>
      <div className="col-span-2">
        <input value={ex.descanso} onChange={e => onChange(idx, "descanso", e.target.value)}
          className="input w-full text-sm" placeholder="90s" />
      </div>
      <div className="col-span-1 flex justify-end">
        <button onClick={() => onRemove(idx)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function WorkoutCard({ w, onEdit, onDelete }: any) {
  const [expanded, setExpanded] = useState(false);
  const exs: Exercise[] = Array.isArray(w.exercicios) ? w.exercicios : [];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 p-5">
        <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0">
          {w.letra || w.nome.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900 truncate">{w.nome}</h3>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
            {w.diaSemana && <span>{w.diaSemana}</span>}
            {w.grupoMuscular && <span>• {w.grupoMuscular}</span>}
            {exs.length > 0 && <span>• {exs.length} exercícios</span>}
            {w.duracaoMin && <span>• {w.duracaoMin} min</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(!expanded)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onEdit} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && exs.length > 0 && (
        <div className="border-t border-slate-100 px-5 pb-4">
          <div className="grid grid-cols-12 gap-2 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            <div className="col-span-4">Exercício</div>
            <div className="col-span-1 text-center">Séries</div>
            <div className="col-span-2">Reps</div>
            <div className="col-span-2">Carga</div>
            <div className="col-span-2">Descanso</div>
          </div>
          <div className="space-y-2">
            {exs.map((ex, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 py-2 border-t border-slate-50 text-sm">
                <div className="col-span-4 font-medium text-slate-800">{ex.nome || "—"}</div>
                <div className="col-span-1 text-center text-slate-600">{ex.series}</div>
                <div className="col-span-2 text-slate-600">{ex.reps}</div>
                <div className="col-span-2 text-slate-600">{ex.carga || "—"}</div>
                <div className="col-span-2 text-slate-600">{ex.descanso || "—"}</div>
              </div>
            ))}
          </div>
          {w.observacoes && (
            <p className="mt-3 text-xs text-slate-500 border-l-2 border-slate-200 pl-2">{w.observacoes}</p>
          )}
        </div>
      )}
    </div>
  );
}

const EMPTY_EX = (): Exercise => ({ nome: "", series: 3, reps: "10-12", carga: "", descanso: "60s", observacao: "" });

function WorkoutForm({ initial, onSave, onCancel }: any) {
  const [form, setForm] = useState({
    nome: initial?.nome ?? "",
    letra: initial?.letra ?? "",
    diaSemana: initial?.diaSemana ?? "",
    grupoMuscular: initial?.grupoMuscular ?? "",
    duracaoMin: initial?.duracaoMin ?? "",
    observacoes: initial?.observacoes ?? "",
  });
  const [exercises, setExercises] = useState<Exercise[]>(initial?.exercicios?.length ? initial.exercicios : [EMPTY_EX()]);

  function setF(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }
  function changeEx(i: number, k: string, v: any) {
    setExercises(exs => exs.map((e, idx) => idx === i ? { ...e, [k]: v } : e));
  }
  function addEx() { setExercises(exs => [...exs, EMPTY_EX()]); }
  function removeEx(i: number) { setExercises(exs => exs.filter((_, idx) => idx !== i)); }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 mb-5">{initial ? "Editar treino" : "Novo treino"}</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className="label">Nome do treino *</label>
            <input value={form.nome} onChange={e => setF("nome", e.target.value)} className="input w-full" placeholder="Ex: Treino A — Push" />
          </div>
          <div>
            <label className="label">Letra</label>
            <select value={form.letra} onChange={e => setF("letra", e.target.value)} className="input w-full">
              <option value="">—</option>
              {LETRAS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Duração (min)</label>
            <input type="number" value={form.duracaoMin} onChange={e => setF("duracaoMin", e.target.value)} className="input w-full" placeholder="60" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Dia da semana</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {DIAS.map(d => (
                <button key={d} type="button" onClick={() => setF("diaSemana", form.diaSemana === d ? "" : d)}
                  className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
                    form.diaSemana === d ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-500 hover:border-primary hover:text-primary")}>
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Grupo muscular</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {GRUPOS.map(g => (
                <button key={g} type="button" onClick={() => setF("grupoMuscular", form.grupoMuscular === g ? "" : g)}
                  className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
                    form.grupoMuscular === g ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-500 hover:border-primary hover:text-primary")}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Exercícios</label>
            <button type="button" onClick={addEx} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>
          <div className="grid grid-cols-12 gap-2 mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">
            <div className="col-span-4">Exercício</div>
            <div className="col-span-1 text-center">Séries</div>
            <div className="col-span-2">Reps</div>
            <div className="col-span-2">Carga</div>
            <div className="col-span-2">Descanso</div>
          </div>
          <div className="space-y-2">
            {exercises.map((ex, i) => (
              <ExerciseRow key={i} ex={ex} idx={i} onChange={changeEx} onRemove={removeEx} />
            ))}
          </div>
        </div>

        <div>
          <label className="label">Observações</label>
          <textarea value={form.observacoes} onChange={e => setF("observacoes", e.target.value)}
            className="input w-full h-16 resize-none" placeholder="Anotações do treino..." />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancelar</button>
          <button onClick={() => onSave({ ...form, exercicios: exercises.filter(e => e.nome) })}
            disabled={!form.nome}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"><Check className="w-4 h-4" /> Salvar</button>
        </div>
      </div>
    </div>
  );
}

export default function TreinosPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: workouts = [], isLoading } = useQuery<any[]>({
    queryKey: ["perf-workouts"],
    queryFn: () => fetch(`${BASE}api/performance/workouts`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (d: any) => fetch(`${BASE}api/performance/workouts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-workouts"] }); setShowForm(false); },
  });

  const update = useMutation({
    mutationFn: ({ id, d }: any) => fetch(`${BASE}api/performance/workouts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-workouts"] }); setEditing(null); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}api/performance/workouts/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["perf-workouts"] }),
  });

  return (
    <AppLayout title="Performance">
      <PerformanceLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Treinos</h1>
            <p className="text-slate-500 text-sm mt-1">Plano de treino e divisão semanal</p>
          </div>
          {!showForm && !editing && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Treino
            </button>
          )}
        </div>

        {(showForm || editing) && (
          <div className="mb-6">
            <WorkoutForm
              initial={editing}
              onSave={(d: any) => editing ? update.mutate({ id: editing.id, d }) : create.mutate(d)}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Carregando...</div>
        ) : workouts.length === 0 && !showForm ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
            <Dumbbell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhum treino cadastrado</h3>
            <p className="text-slate-400 text-sm mb-6">Monte seu plano de treino aqui</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mx-auto flex items-center gap-2">
              <Plus className="w-4 h-4" /> Criar treino
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map(w => (
              <WorkoutCard key={w.id} w={w}
                onEdit={() => { setEditing(w); setShowForm(false); }}
                onDelete={() => remove.mutate(w.id)} />
            ))}
          </div>
        )}
      </PerformanceLayout>
    </AppLayout>
  );
}
