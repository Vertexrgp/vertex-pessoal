import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PerformanceLayout } from "@/components/layout/PerformanceLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { Target, Plus, Pencil, Trash2, CalendarDays, Flame, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

const ESTETICA_OPTIONS = [
  "Definição muscular", "Ganho de massa", "Recomposição corporal",
  "Redução de gordura", "Performance atlética", "Saúde geral",
];

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function GoalCard({ g, onEdit, onDelete }: { g: any; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Objetivo Principal</p>
          <h3 className="text-lg font-bold text-slate-900 leading-snug">{g.descricao}</h3>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={onEdit} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Peso alvo", value: g.metaPeso ? `${g.metaPeso} kg` : "—" },
          { label: "% Gordura", value: g.metaBf ? `${g.metaBf}%` : "—" },
          { label: "Prazo", value: fmtDate(g.prazo) },
        ].map(item => (
          <div key={item.label} className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">{item.label}</p>
            <p className="text-sm font-bold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      {g.metaEstetica && (
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold">
            <Flame className="w-3.5 h-3.5" /> {g.metaEstetica}
          </span>
        </div>
      )}

      {g.motivacao && (
        <p className="text-sm text-slate-600 italic border-l-2 border-primary/30 pl-3">"{g.motivacao}"</p>
      )}
    </div>
  );
}

function GoalForm({ initial, onSave, onCancel }: { initial?: any; onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    descricao: initial?.descricao ?? "",
    fotoUrl: initial?.fotoUrl ?? "",
    metaPeso: initial?.metaPeso ?? "",
    metaBf: initial?.metaBf ?? "",
    metaEstetica: initial?.metaEstetica ?? "",
    prazo: initial?.prazo ?? "",
    motivacao: initial?.motivacao ?? "",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 mb-5">
        {initial ? "Editar objetivo" : "Novo objetivo"}
      </h3>
      <div className="space-y-4">
        <div>
          <label className="label">Descrição do objetivo *</label>
          <textarea value={form.descricao} onChange={e => set("descricao", e.target.value)}
            className="input w-full h-24 resize-none" placeholder="Ex: Chegar em 90 kg com 12% de gordura..." />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Peso alvo (kg)</label>
            <input type="number" step="0.1" value={form.metaPeso} onChange={e => set("metaPeso", e.target.value)} className="input w-full" placeholder="Ex: 90" />
          </div>
          <div>
            <label className="label">% Gordura alvo</label>
            <input type="number" step="0.1" value={form.metaBf} onChange={e => set("metaBf", e.target.value)} className="input w-full" placeholder="Ex: 12" />
          </div>
          <div>
            <label className="label">Prazo</label>
            <input type="date" value={form.prazo} onChange={e => set("prazo", e.target.value)} className="input w-full" />
          </div>
        </div>
        <div>
          <label className="label">Foco estético</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {ESTETICA_OPTIONS.map(o => (
              <button key={o} type="button"
                onClick={() => set("metaEstetica", form.metaEstetica === o ? "" : o)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  form.metaEstetica === o
                    ? "bg-primary text-white border-primary"
                    : "border-slate-200 text-slate-600 hover:border-primary hover:text-primary")}>
                {o}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Motivação / frase</label>
          <input value={form.motivacao} onChange={e => set("motivacao", e.target.value)} className="input w-full" placeholder="O que te motiva?" />
        </div>
        <div>
          <label className="label">URL da foto de inspiração</label>
          <input value={form.fotoUrl} onChange={e => set("fotoUrl", e.target.value)} className="input w-full" placeholder="https://..." />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.descricao}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"><Check className="w-4 h-4" /> Salvar</button>
        </div>
      </div>
    </div>
  );
}

export default function ObjetivoPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: goals = [], isLoading } = useQuery<any[]>({
    queryKey: ["perf-goals"],
    queryFn: () => fetch(`${BASE}api/performance/goals`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (d: any) => fetch(`${BASE}api/performance/goals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-goals"] }); setShowForm(false); },
  });

  const update = useMutation({
    mutationFn: ({ id, d }: any) => fetch(`${BASE}api/performance/goals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-goals"] }); setEditing(null); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}api/performance/goals/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["perf-goals"] }),
  });

  return (
    <AppLayout title="Performance">
      <PerformanceLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Meu Objetivo</h1>
            <p className="text-slate-500 text-sm mt-1">Defina onde você quer chegar</p>
          </div>
          {!showForm && !editing && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Objetivo
            </button>
          )}
        </div>

        {(showForm || editing) && (
          <div className="mb-6">
            <GoalForm
              initial={editing}
              onSave={(d) => editing ? update.mutate({ id: editing.id, d }) : create.mutate(d)}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Carregando...</div>
        ) : goals.length === 0 && !showForm ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
            <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhum objetivo definido</h3>
            <p className="text-slate-400 text-sm mb-6">Comece definindo para onde você quer chegar</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mx-auto flex items-center gap-2">
              <Plus className="w-4 h-4" /> Definir objetivo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {goals.map(g => (
              <GoalCard key={g.id} g={g}
                onEdit={() => { setEditing(g); setShowForm(false); }}
                onDelete={() => remove.mutate(g.id)} />
            ))}
          </div>
        )}
      </PerformanceLayout>
    </AppLayout>
  );
}
