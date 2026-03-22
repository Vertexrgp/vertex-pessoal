import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PerformanceLayout } from "@/components/layout/PerformanceLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Utensils, Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp,
  Clock, Flame, ToggleRight, ToggleLeft, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

type Alimento = { nome: string; quantidade: string; unidade: string; calorias?: number; observacao?: string };

function fmtDate(d?: string | null) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

/* ─── Plan Card ──────────────────────────────────────────────────────── */
function PlanCard({ plan, selected, onClick, onToggle, onDelete }: any) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative bg-white border rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md",
        selected ? "border-primary shadow-sm ring-2 ring-primary/20" : "border-slate-200 shadow-sm"
      )}>
      {plan.ativo && (
        <span className="absolute top-3 right-3 text-xs bg-primary text-white px-2 py-0.5 rounded-full font-semibold">Ativo</span>
      )}
      <h3 className={cn("text-sm font-bold pr-14 mb-1", selected ? "text-primary" : "text-slate-900")}>{plan.nome}</h3>
      {plan.prescritoPor && <p className="text-xs text-slate-400 mb-1">por {plan.prescritoPor}</p>}
      {(plan.dataInicio || plan.dataFim) && (
        <p className="text-xs text-slate-400">
          {plan.dataInicio ? fmtDate(plan.dataInicio) : "início"} → {plan.dataFim ? fmtDate(plan.dataFim) : "atual"}
        </p>
      )}
      {plan.objetivo && <p className="text-xs text-slate-500 mt-1 italic">{plan.objetivo}</p>}
      <div className="flex gap-1 mt-3 pt-3 border-t border-slate-50">
        <button onClick={e => { e.stopPropagation(); onToggle(); }}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          {plan.ativo ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4 text-slate-300" />}
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── Plan Form ──────────────────────────────────────────────────────── */
function PlanForm({ onSave, onCancel }: any) {
  const [form, setForm] = useState({
    nome: "",
    prescritoPor: "",
    dataInicio: new Date().toISOString().slice(0, 10),
    dataFim: "",
    objetivo: "",
    observacoes: "",
  });
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 mb-4">Novo plano alimentar</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Nome do plano *</label>
            <input value={form.nome} onChange={e => set("nome", e.target.value)} className="input w-full" placeholder="Ex: Plano Fevereiro 2026" />
          </div>
          <div>
            <label className="label">Prescrito por</label>
            <input value={form.prescritoPor} onChange={e => set("prescritoPor", e.target.value)} className="input w-full" placeholder="Dra. Roberta Carbonari" />
          </div>
          <div>
            <label className="label">Objetivo</label>
            <input value={form.objetivo} onChange={e => set("objetivo", e.target.value)} className="input w-full" placeholder="Definição, ganho, manutenção..." />
          </div>
          <div>
            <label className="label">Data início</label>
            <input type="date" value={form.dataInicio} onChange={e => set("dataInicio", e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="label">Data fim</label>
            <input type="date" value={form.dataFim} onChange={e => set("dataFim", e.target.value)} className="input w-full" />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onCancel} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.nome}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"><Check className="w-4 h-4" /> Criar plano</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Meal Card ──────────────────────────────────────────────────────── */
function MealCard({ meal, onEdit, onDelete }: any) {
  const [expanded, setExpanded] = useState(true);
  const alimentos: Alimento[] = Array.isArray(meal.alimentos) ? meal.alimentos : [];
  const totalCal = alimentos.reduce((s, a) => s + (a.calorias ?? 0), 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{meal.nome}</p>
            <div className="flex items-center gap-2">
              {meal.horario && <span className="text-xs font-semibold text-primary">{meal.horario}</span>}
              <span className="text-xs text-slate-400">{alimentos.length} item{alimentos.length !== 1 ? "s" : ""}</span>
              {totalCal > 0 && <span className="text-xs text-orange-500 font-semibold flex items-center gap-0.5"><Flame className="w-3 h-3" />{totalCal} kcal</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-300 ml-1" /> : <ChevronDown className="w-4 h-4 text-slate-300 ml-1" />}
        </div>
      </div>

      {expanded && alimentos.length > 0 && (
        <div className="border-t border-slate-50 px-5 pb-4">
          <div className="space-y-1.5 mt-3">
            {alimentos.map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/30 shrink-0" />
                <span className="flex-1 text-slate-800 font-medium">{a.nome}</span>
                <span className="text-slate-500 text-xs whitespace-nowrap">{a.quantidade}{a.unidade ? ` ${a.unidade}` : ""}</span>
                {a.calorias ? <span className="text-xs text-orange-400 font-semibold w-14 text-right">{a.calorias} kcal</span> : <span className="w-14" />}
              </div>
            ))}
          </div>
          {meal.observacoes && (
            <p className="mt-3 text-xs text-slate-500 border-l-2 border-slate-200 pl-2 italic">{meal.observacoes}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Meal Form ──────────────────────────────────────────────────────── */
function MealForm({ planoId, initial, onSave, onCancel }: any) {
  const [form, setForm] = useState({
    nome: initial?.nome ?? "",
    horario: initial?.horario ?? "",
    observacoes: initial?.observacoes ?? "",
  });
  const [alimentos, setAlimentos] = useState<Alimento[]>(
    initial?.alimentos?.length ? initial.alimentos : [{ nome: "", quantidade: "", unidade: "g", calorias: 0, observacao: "" }]
  );

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
  function setAl(i: number, k: string, v: any) { setAlimentos(als => als.map((a, idx) => idx === i ? { ...a, [k]: v } : a)); }
  function addAl() { setAlimentos(als => [...als, { nome: "", quantidade: "", unidade: "g", calorias: 0, observacao: "" }]); }
  function removeAl(i: number) { setAlimentos(als => als.filter((_, idx) => idx !== i)); }

  const UNITS = ["g", "ml", "unidade(s)", "porção", "colher(es)", "xícara(s)", "fatia(s)", "garra(s)"];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 mb-4">{initial ? "Editar refeição" : "Nova refeição"}</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label">Nome da refeição *</label>
            <input value={form.nome} onChange={e => setF("nome", e.target.value)} className="input w-full" placeholder="Ex: Almoço, Café da manhã..." />
          </div>
          <div>
            <label className="label">Horário</label>
            <input type="time" value={form.horario} onChange={e => setF("horario", e.target.value)} className="input w-full" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Alimentos</label>
            <button type="button" onClick={addAl} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> Adicionar alimento
            </button>
          </div>
          {/* Header */}
          <div className="grid grid-cols-12 gap-1.5 mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wide px-0.5">
            <div className="col-span-5">Alimento</div>
            <div className="col-span-2">Qtd</div>
            <div className="col-span-2">Unidade</div>
            <div className="col-span-2">kcal</div>
            <div className="col-span-1" />
          </div>
          <div className="space-y-1.5">
            {alimentos.map((a, i) => (
              <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                <input value={a.nome} onChange={e => setAl(i, "nome", e.target.value)}
                  className="col-span-5 input text-sm" placeholder="Ex: Banana" />
                <input value={a.quantidade} onChange={e => setAl(i, "quantidade", e.target.value)}
                  className="col-span-2 input text-sm" placeholder="75" />
                <select value={a.unidade} onChange={e => setAl(i, "unidade", e.target.value)}
                  className="col-span-2 input text-sm">
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
                <input type="number" value={a.calorias || ""} onChange={e => setAl(i, "calorias", Number(e.target.value))}
                  className="col-span-2 input text-sm" placeholder="0" />
                <button onClick={() => removeAl(i)} disabled={alimentos.length === 1}
                  className="col-span-1 flex justify-center p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-400 rounded-lg transition-colors disabled:opacity-30">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Observações / opções de substituição</label>
          <textarea value={form.observacoes} onChange={e => setF("observacoes", e.target.value)}
            className="input w-full h-16 resize-none" placeholder="Substituições possíveis, observações..." />
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onCancel} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancelar</button>
          <button onClick={() => onSave({ planoId, ...form, alimentos: alimentos.filter(a => a.nome) })}
            disabled={!form.nome}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"><Check className="w-4 h-4" /> Salvar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function NutricaoPage() {
  const qc = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<any>(null);

  const { data: plans = [], isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ["perf-meal-plans"],
    queryFn: () => fetch(`${BASE}api/performance/meal-plans`).then(r => r.json()),
  });

  useEffect(() => {
    if (!selectedPlanId && plans.length > 0) {
      const active = plans.find(p => p.ativo) ?? plans[0];
      setSelectedPlanId(active.id);
    }
  }, [plans, selectedPlanId]);

  const { data: meals = [], isLoading: mealsLoading } = useQuery<any[]>({
    queryKey: ["perf-meals", selectedPlanId],
    queryFn: () => fetch(`${BASE}api/performance/meals?planoId=${selectedPlanId}`).then(r => r.json()),
    enabled: !!selectedPlanId,
  });

  const createPlan = useMutation({
    mutationFn: (d: any) => fetch(`${BASE}api/performance/meal-plans`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: (row) => { qc.invalidateQueries({ queryKey: ["perf-meal-plans"] }); setShowPlanForm(false); setSelectedPlanId(row.id); },
  });

  const togglePlan = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}api/performance/meal-plans/${id}/toggle`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["perf-meal-plans"] }),
  });

  const deletePlan = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}api/performance/meal-plans/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-meal-plans"] }); setSelectedPlanId(null); },
  });

  const createMeal = useMutation({
    mutationFn: (d: any) => fetch(`${BASE}api/performance/meals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-meals", selectedPlanId] }); setShowMealForm(false); },
  });

  const updateMeal = useMutation({
    mutationFn: ({ id, d }: any) => fetch(`${BASE}api/performance/meals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-meals", selectedPlanId] }); setEditingMeal(null); },
  });

  const deleteMeal = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}api/performance/meals/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["perf-meals", selectedPlanId] }),
  });

  const selectedPlan = plans.find(p => p.id === selectedPlanId) ?? null;

  const totalKcal = meals.reduce((sum: number, meal: any) => {
    const alimentos: Alimento[] = Array.isArray(meal.alimentos) ? meal.alimentos : [];
    return sum + alimentos.reduce((s, a) => s + (a.calorias ?? 0), 0);
  }, 0);

  return (
    <AppLayout title="Performance">
      <PerformanceLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Plano Alimentar</h1>
            <p className="text-slate-500 text-sm mt-1">Refeições, alimentos e estratégia nutricional</p>
          </div>
          {!showPlanForm && (
            <button onClick={() => setShowPlanForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Plano
            </button>
          )}
        </div>

        {showPlanForm && (
          <div className="mb-5">
            <PlanForm onSave={(d: any) => createPlan.mutate(d)} onCancel={() => setShowPlanForm(false)} />
          </div>
        )}

        {plansLoading ? (
          <div className="text-center py-16 text-slate-400">Carregando...</div>
        ) : plans.length === 0 && !showPlanForm ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
            <Utensils className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhum plano alimentar criado</h3>
            <p className="text-slate-400 text-sm mb-6">Crie seu plano e adicione as refeições com os alimentos</p>
            <button onClick={() => setShowPlanForm(true)} className="btn-primary mx-auto flex items-center gap-2">
              <Plus className="w-4 h-4" /> Criar plano
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Plans row */}
            {plans.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {plans.map(p => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    selected={selectedPlanId === p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    onToggle={() => togglePlan.mutate(p.id)}
                    onDelete={() => deletePlan.mutate(p.id)}
                  />
                ))}
              </div>
            )}

            {/* Selected plan meals */}
            {selectedPlan && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">{selectedPlan.nome}</h2>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {selectedPlan.prescritoPor && <span>por {selectedPlan.prescritoPor}</span>}
                        {selectedPlan.objetivo && <span>• {selectedPlan.objetivo}</span>}
                        {totalKcal > 0 && (
                          <span className="flex items-center gap-1 text-orange-500 font-semibold">
                            <Flame className="w-3 h-3" /> {totalKcal} kcal/dia
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!showMealForm && !editingMeal && (
                    <button onClick={() => setShowMealForm(true)} className="btn-primary flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Nova Refeição
                    </button>
                  )}
                </div>

                {(showMealForm || editingMeal) && (
                  <div className="mb-4">
                    <MealForm
                      planoId={selectedPlanId}
                      initial={editingMeal}
                      onSave={(d: any) => editingMeal ? updateMeal.mutate({ id: editingMeal.id, d }) : createMeal.mutate(d)}
                      onCancel={() => { setShowMealForm(false); setEditingMeal(null); }}
                    />
                  </div>
                )}

                {mealsLoading ? (
                  <div className="text-center py-8 text-slate-400 text-sm">Carregando refeições...</div>
                ) : meals.length === 0 && !showMealForm ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-semibold">Nenhuma refeição no plano</p>
                    <p className="text-slate-400 text-sm mt-1 mb-4">Adicione as refeições com horário e alimentos</p>
                    <button onClick={() => setShowMealForm(true)} className="btn-primary mx-auto flex items-center gap-2 text-sm">
                      <Plus className="w-4 h-4" /> Adicionar refeição
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meals
                      .sort((a: any, b: any) => (a.horario || "").localeCompare(b.horario || ""))
                      .map((meal: any) => (
                        <MealCard
                          key={meal.id}
                          meal={meal}
                          onEdit={() => { setEditingMeal(meal); setShowMealForm(false); }}
                          onDelete={() => deleteMeal.mutate(meal.id)}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </PerformanceLayout>
    </AppLayout>
  );
}
