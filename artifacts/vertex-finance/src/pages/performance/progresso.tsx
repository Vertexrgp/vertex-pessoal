import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PerformanceLayout } from "@/components/layout/PerformanceLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { TrendingUp, Plus, Trash2, Check, X, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/lib/api-base";

const HUMORES = ["Ótimo", "Bom", "Regular", "Cansado", "Ruim"];
const HUMOR_COLORS: Record<string, string> = {
  "Ótimo": "bg-green-100 text-green-700",
  "Bom": "bg-blue-100 text-blue-700",
  "Regular": "bg-amber-100 text-amber-700",
  "Cansado": "bg-orange-100 text-orange-700",
  "Ruim": "bg-red-100 text-red-700",
};

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function Delta({ a, b, unit = "kg", lower = false }: { a?: number; b?: number; unit?: string; lower?: boolean }) {
  if (a == null || b == null) return null;
  const diff = a - b;
  const improved = lower ? diff < 0 : diff > 0;
  const neutral = diff === 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-bold",
      neutral ? "text-slate-400" : improved ? "text-green-600" : "text-red-500")}>
      {neutral ? <Minus className="w-3 h-3" /> : diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(diff).toFixed(1)}{unit}
    </span>
  );
}

function ProgressForm({ onSave, onCancel }: { onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    peso: "",
    bf: "",
    cintura: "",
    fotoUrl: "",
    humor: "",
    energia: "",
    observacoes: "",
  });
  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 mb-5">Novo registro de progresso</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className="label">Data *</label>
            <input type="date" value={form.data} onChange={e => set("data", e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="label">Peso (kg)</label>
            <input type="number" step="0.1" value={form.peso} onChange={e => set("peso", e.target.value)} className="input w-full" placeholder="85.5" />
          </div>
          <div>
            <label className="label">% Gordura</label>
            <input type="number" step="0.1" value={form.bf} onChange={e => set("bf", e.target.value)} className="input w-full" placeholder="18" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Cintura (cm)</label>
            <input type="number" step="0.1" value={form.cintura} onChange={e => set("cintura", e.target.value)} className="input w-full" placeholder="82" />
          </div>
          <div>
            <label className="label">Energia (1–10)</label>
            <input type="number" min={1} max={10} value={form.energia} onChange={e => set("energia", e.target.value)} className="input w-full" placeholder="7" />
          </div>
        </div>
        <div>
          <label className="label">Humor</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {HUMORES.map(h => (
              <button key={h} type="button" onClick={() => set("humor", form.humor === h ? "" : h)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  form.humor === h ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-600 hover:border-primary hover:text-primary")}>
                {h}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">URL da foto</label>
          <input value={form.fotoUrl} onChange={e => set("fotoUrl", e.target.value)} className="input w-full" placeholder="https://..." />
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea value={form.observacoes} onChange={e => set("observacoes", e.target.value)}
            className="input w-full h-16 resize-none" placeholder="Como você está se sentindo, avanços, dificuldades..." />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.data}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"><Check className="w-4 h-4" /> Salvar</button>
        </div>
      </div>
    </div>
  );
}

export default function ProgressoPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: progress = [], isLoading } = useQuery<any[]>({
    queryKey: ["perf-progress"],
    queryFn: () => fetch(`${getApiBase()}/api/performance/progress`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (d: any) => fetch(`${getApiBase()}/api/performance/progress`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-progress"] }); setShowForm(false); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => fetch(`${getApiBase()}/api/performance/progress/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["perf-progress"] }),
  });

  const sorted = [...progress].sort((a, b) => a.data.localeCompare(b.data));

  const pesoValues = sorted.map(p => parseFloat(p.peso)).filter(v => !isNaN(v));
  const minPeso = pesoValues.length ? Math.min(...pesoValues) : 0;
  const maxPeso = pesoValues.length ? Math.max(...pesoValues) : 0;
  const rangeP = maxPeso - minPeso || 1;

  return (
    <AppLayout title="Performance">
      <PerformanceLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Progresso</h1>
            <p className="text-slate-500 text-sm mt-1">Timeline de evolução</p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Registro
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-6">
            <ProgressForm onSave={(d) => create.mutate(d)} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Carregando...</div>
        ) : progress.length === 0 && !showForm ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhum progresso registrado ainda</h3>
            <p className="text-slate-400 text-sm mb-6">Comece a registrar sua evolução semana a semana</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mx-auto flex items-center gap-2">
              <Plus className="w-4 h-4" /> Primeiro registro
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {pesoValues.length >= 2 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Evolução do Peso</h3>
                <div className="flex items-end gap-2 h-28">
                  {sorted.filter(p => p.peso).map((p, i) => {
                    const val = parseFloat(p.peso);
                    const h = ((val - minPeso) / rangeP) * 80 + 20;
                    const prev = sorted.slice(0, i).reverse().find((x: any) => x.peso);
                    const prevVal = prev ? parseFloat(prev.peso) : null;
                    const better = prevVal !== null && val < prevVal;
                    return (
                      <div key={p.id} className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-xs font-bold text-slate-600">{val.toFixed(1)}</span>
                        <div
                          className={cn("w-full rounded-t-lg transition-all", better ? "bg-green-400" : "bg-primary")}
                          style={{ height: `${h}px` }} />
                        <span className="text-xs text-slate-400">{p.data.slice(5).replace("-", "/")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {[...progress].map((p, i) => {
                const next = progress[i + 1];
                const pesoDiff = next?.peso && p.peso ? parseFloat(p.peso) - parseFloat(next.peso) : null;
                return (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                    <div className="w-14 shrink-0 text-center">
                      <p className="text-xs font-bold text-primary">{p.data.slice(8, 10)}/{p.data.slice(5, 7)}</p>
                      <p className="text-xs text-slate-400">{p.data.slice(0, 4)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-3 mb-2">
                        {p.peso && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">{parseFloat(p.peso).toFixed(1)} kg</span>
                            {pesoDiff !== null && (
                              <Delta a={parseFloat(p.peso)} b={parseFloat(next.peso)} lower />
                            )}
                          </div>
                        )}
                        {p.bf && <span className="text-sm font-semibold text-slate-600">{parseFloat(p.bf).toFixed(1)}% BF</span>}
                        {p.cintura && <span className="text-sm text-slate-500">{parseFloat(p.cintura).toFixed(1)} cm cintura</span>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {p.humor && (
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", HUMOR_COLORS[p.humor] ?? "bg-slate-100 text-slate-600")}>
                            {p.humor}
                          </span>
                        )}
                        {p.energia && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
                            Energia: {p.energia}/10
                          </span>
                        )}
                      </div>
                      {p.observacoes && <p className="mt-2 text-sm text-slate-500">{p.observacoes}</p>}
                    </div>
                    <button onClick={() => remove.mutate(p.id)} className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </PerformanceLayout>
    </AppLayout>
  );
}
