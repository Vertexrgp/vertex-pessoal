import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PerformanceLayout } from "@/components/layout/PerformanceLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { Utensils, Plus, Pencil, Check, X, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

const ESTRATEGIAS = [
  "Déficit calórico", "Superávit calórico", "Manutenção", "Cetogênica",
  "Carnívora", "Low carb", "Ciclagem de carboidratos", "Jejum intermitente",
  "Intuitiva", "Outra",
];

type Refeicao = { nome: string; horario: string; descricao: string; calorias: number };
const EMPTY_REFEICAO = (): Refeicao => ({ nome: "", horario: "", descricao: "", calorias: 0 });

function MacroBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="text-slate-500">{value}g</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function NutricaoView({ data, onEdit }: { data: any; onEdit: () => void }) {
  const protein = parseFloat(data.proteina ?? 0);
  const carb = parseFloat(data.carboidrato ?? 0);
  const fat = parseFloat(data.gordura ?? 0);
  const totalMacros = protein + carb + fat;
  const refeicoes: Refeicao[] = Array.isArray(data.refeicoes) ? data.refeicoes : [];

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Estratégia alimentar</p>
            <h3 className="text-xl font-bold text-slate-900">{data.estrategia}</h3>
          </div>
          <button onClick={onEdit} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        {data.calorias && (
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-2 bg-orange-50 px-4 py-2.5 rounded-xl">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-700">{data.calorias} kcal/dia</span>
            </div>
          </div>
        )}

        {(protein > 0 || carb > 0 || fat > 0) && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600 font-semibold mb-1">Proteína</p>
              <p className="text-lg font-black text-blue-700">{protein}g</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-xs text-amber-600 font-semibold mb-1">Carboidrato</p>
              <p className="text-lg font-black text-amber-700">{carb}g</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-xs text-red-600 font-semibold mb-1">Gordura</p>
              <p className="text-lg font-black text-red-700">{fat}g</p>
            </div>
          </div>
        )}

        {totalMacros > 0 && (
          <div className="space-y-2">
            <MacroBar label="Proteína" value={protein} total={totalMacros} color="bg-blue-500" />
            <MacroBar label="Carboidrato" value={carb} total={totalMacros} color="bg-amber-500" />
            <MacroBar label="Gordura" value={fat} total={totalMacros} color="bg-red-500" />
          </div>
        )}

        {data.suplementos && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Suplementação</p>
            <p className="text-sm text-slate-700">{data.suplementos}</p>
          </div>
        )}

        {data.observacoes && (
          <p className="mt-4 text-sm text-slate-600 border-l-2 border-slate-200 pl-3 italic">{data.observacoes}</p>
        )}
      </div>

      {refeicoes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Refeições</h3>
          <div className="space-y-3">
            {refeicoes.map((r, i) => (
              <div key={i} className="flex items-start gap-4 py-3 border-b border-slate-50 last:border-0">
                <div className="w-16 shrink-0 text-center">
                  <p className="text-xs text-slate-400 mb-0.5">Horário</p>
                  <p className="text-sm font-bold text-primary">{r.horario || "—"}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{r.nome}</p>
                  {r.descricao && <p className="text-xs text-slate-500 mt-0.5">{r.descricao}</p>}
                </div>
                {r.calorias > 0 && (
                  <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">{r.calorias} kcal</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NutricaoForm({ initial, onSave, onCancel }: any) {
  const [form, setForm] = useState({
    estrategia: initial?.estrategia ?? "",
    estrategiaCustom: "",
    calorias: initial?.calorias ?? "",
    proteina: initial?.proteina ?? "",
    carboidrato: initial?.carboidrato ?? "",
    gordura: initial?.gordura ?? "",
    suplementos: initial?.suplementos ?? "",
    observacoes: initial?.observacoes ?? "",
  });
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>(initial?.refeicoes?.length ? initial.refeicoes : [EMPTY_REFEICAO()]);

  function setF(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }
  function setRef(i: number, k: string, v: any) {
    setRefeicoes(rs => rs.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  }
  function addRef() { setRefeicoes(rs => [...rs, EMPTY_REFEICAO()]); }
  function removeRef(i: number) { setRefeicoes(rs => rs.filter((_, idx) => idx !== i)); }

  const estrategia = form.estrategia === "Outra" ? form.estrategiaCustom : form.estrategia;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 mb-5">{initial ? "Editar nutrição" : "Configurar nutrição"}</h3>
      <div className="space-y-4">
        <div>
          <label className="label">Estratégia alimentar *</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {ESTRATEGIAS.map(e => (
              <button key={e} type="button" onClick={() => setF("estrategia", form.estrategia === e ? "" : e)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  form.estrategia === e ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-600 hover:border-primary hover:text-primary")}>
                {e}
              </button>
            ))}
          </div>
          {form.estrategia === "Outra" && (
            <input className="input w-full mt-2" placeholder="Descreva sua estratégia" value={form.estrategiaCustom} onChange={e => setF("estrategiaCustom", e.target.value)} />
          )}
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="label">Calorias (kcal)</label>
            <input type="number" value={form.calorias} onChange={e => setF("calorias", e.target.value)} className="input w-full" placeholder="2400" />
          </div>
          <div>
            <label className="label">Proteína (g)</label>
            <input type="number" value={form.proteina} onChange={e => setF("proteina", e.target.value)} className="input w-full" placeholder="180" />
          </div>
          <div>
            <label className="label">Carboidrato (g)</label>
            <input type="number" value={form.carboidrato} onChange={e => setF("carboidrato", e.target.value)} className="input w-full" placeholder="250" />
          </div>
          <div>
            <label className="label">Gordura (g)</label>
            <input type="number" value={form.gordura} onChange={e => setF("gordura", e.target.value)} className="input w-full" placeholder="70" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Refeições</label>
            <button type="button" onClick={addRef} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>
          <div className="space-y-3">
            {refeicoes.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start bg-slate-50 rounded-xl p-3">
                <input value={r.nome} onChange={e => setRef(i, "nome", e.target.value)}
                  className="col-span-3 input bg-white text-sm" placeholder="Café da manhã" />
                <input value={r.horario} onChange={e => setRef(i, "horario", e.target.value)}
                  className="col-span-2 input bg-white text-sm" placeholder="07:00" />
                <input value={r.descricao} onChange={e => setRef(i, "descricao", e.target.value)}
                  className="col-span-5 input bg-white text-sm" placeholder="Ovos, aveia, whey..." />
                <input type="number" value={r.calorias || ""} onChange={e => setRef(i, "calorias", Number(e.target.value))}
                  className="col-span-1 input bg-white text-sm" placeholder="400" />
                <button onClick={() => removeRef(i)} className="col-span-1 flex justify-center p-2 hover:bg-red-50 text-slate-300 hover:text-red-400 rounded-lg transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Suplementação</label>
          <input value={form.suplementos} onChange={e => setF("suplementos", e.target.value)} className="input w-full" placeholder="Whey, creatina, omega-3..." />
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea value={form.observacoes} onChange={e => setF("observacoes", e.target.value)}
            className="input w-full h-16 resize-none" placeholder="Notas adicionais..." />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancelar</button>
          <button onClick={() => onSave({ ...form, estrategia, refeicoes: refeicoes.filter(r => r.nome) })}
            disabled={!estrategia}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"><Check className="w-4 h-4" /> Salvar</button>
        </div>
      </div>
    </div>
  );
}

export default function NutricaoPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: nutrition, isLoading } = useQuery<any>({
    queryKey: ["perf-nutrition"],
    queryFn: () => fetch(`${BASE}api/performance/nutrition`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (d: any) => fetch(`${BASE}api/performance/nutrition`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-nutrition"] }); setEditing(false); },
  });

  const update = useMutation({
    mutationFn: (d: any) => fetch(`${BASE}api/performance/nutrition/${nutrition.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-nutrition"] }); setEditing(false); },
  });

  return (
    <AppLayout title="Performance">
      <PerformanceLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nutrição</h1>
            <p className="text-slate-500 text-sm mt-1">Estratégia alimentar e macros</p>
          </div>
          {!editing && nutrition && (
            <button onClick={() => setEditing(true)} className="btn-primary flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Editar
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Carregando...</div>
        ) : editing || !nutrition ? (
          <NutricaoForm
            initial={nutrition}
            onSave={(d: any) => nutrition ? update.mutate(d) : create.mutate(d)}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <NutricaoView data={nutrition} onEdit={() => setEditing(true)} />
        )}
      </PerformanceLayout>
    </AppLayout>
  );
}
