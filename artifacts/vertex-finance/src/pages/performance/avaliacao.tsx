import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PerformanceLayout } from "@/components/layout/PerformanceLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { Activity, Plus, Pencil, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/lib/api-base";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function imc(peso?: string | null, altura?: string | null) {
  if (!peso || !altura) return null;
  const p = parseFloat(peso);
  const a = parseFloat(altura);
  if (!a || !p) return null;
  return (p / (a * a)).toFixed(1);
}

function imcLabel(val: string) {
  const n = parseFloat(val);
  if (n < 18.5) return { label: "Abaixo do peso", color: "text-blue-600 bg-blue-50" };
  if (n < 25) return { label: "Normal", color: "text-green-600 bg-green-50" };
  if (n < 30) return { label: "Sobrepeso", color: "text-yellow-600 bg-yellow-50" };
  return { label: "Obesidade", color: "text-red-600 bg-red-50" };
}

const MEDIDAS = [
  { key: "cintura", label: "Cintura" },
  { key: "quadril", label: "Quadril" },
  { key: "torax", label: "Tórax" },
  { key: "braco", label: "Braço" },
  { key: "coxa", label: "Coxa" },
] as const;

function StateCard({ s, onEdit }: { s: any; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const imcVal = imc(s.peso, s.altura);
  const imcInfo = imcVal ? imcLabel(imcVal) : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Avaliação</p>
          <p className="text-lg font-bold text-slate-900">{fmtDate(s.dataAvaliacao)}</p>
        </div>
        <button onClick={onEdit} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Peso</p>
          <p className="text-lg font-black text-slate-900">{s.peso ? `${s.peso} kg` : "—"}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">% Gordura</p>
          <p className="text-lg font-black text-slate-900">{s.bf ? `${s.bf}%` : "—"}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">IMC</p>
          <p className="text-lg font-black text-slate-900">{imcVal ?? "—"}</p>
        </div>
      </div>

      {imcInfo && (
        <span className={cn("inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4", imcInfo.color)}>
          {imcInfo.label}
        </span>
      )}

      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-primary transition-colors">
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? "Ocultar medidas" : "Ver medidas"}
      </button>

      {expanded && (
        <div className="mt-4 grid grid-cols-5 gap-2">
          {MEDIDAS.map(m => (
            <div key={m.key} className="bg-slate-50 rounded-xl p-2 text-center">
              <p className="text-xs text-slate-500 mb-1">{m.label}</p>
              <p className="text-sm font-bold text-slate-900">{s[m.key] ? `${s[m.key]} cm` : "—"}</p>
            </div>
          ))}
        </div>
      )}

      {s.observacoes && (
        <p className="mt-4 text-sm text-slate-600 border-l-2 border-slate-200 pl-3">{s.observacoes}</p>
      )}
    </div>
  );
}

function StateForm({ initial, onSave, onCancel }: { initial?: any; onSave: (d: any) => void; onCancel: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    dataAvaliacao: initial?.dataAvaliacao ?? today,
    peso: initial?.peso ?? "",
    altura: initial?.altura ?? "",
    bf: initial?.bf ?? "",
    cintura: initial?.cintura ?? "",
    quadril: initial?.quadril ?? "",
    torax: initial?.torax ?? "",
    braco: initial?.braco ?? "",
    coxa: initial?.coxa ?? "",
    observacoes: initial?.observacoes ?? "",
  });
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 mb-5">{initial ? "Editar avaliação" : "Nova avaliação"}</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className="label">Data *</label>
            <input type="date" value={form.dataAvaliacao} onChange={e => set("dataAvaliacao", e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="label">Peso (kg)</label>
            <input type="number" step="0.1" value={form.peso} onChange={e => set("peso", e.target.value)} className="input w-full" placeholder="85.5" />
          </div>
          <div>
            <label className="label">Altura (m)</label>
            <input type="number" step="0.01" value={form.altura} onChange={e => set("altura", e.target.value)} className="input w-full" placeholder="1.80" />
          </div>
        </div>
        <div>
          <label className="label">% Gordura corporal</label>
          <input type="number" step="0.1" value={form.bf} onChange={e => set("bf", e.target.value)} className="input w-48" placeholder="18.5" />
        </div>
        <div>
          <p className="label mb-2">Medidas (cm)</p>
          <div className="grid grid-cols-5 gap-3">
            {MEDIDAS.map(m => (
              <div key={m.key}>
                <label className="text-xs text-slate-500 block mb-1">{m.label}</label>
                <input type="number" step="0.1" value={(form as any)[m.key]}
                  onChange={e => set(m.key, e.target.value)} className="input w-full" placeholder="0" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea value={form.observacoes} onChange={e => set("observacoes", e.target.value)}
            className="input w-full h-20 resize-none" placeholder="Observações gerais..." />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.dataAvaliacao}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"><Check className="w-4 h-4" /> Salvar</button>
        </div>
      </div>
    </div>
  );
}

export default function AvaliacaoPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: states = [], isLoading } = useQuery<any[]>({
    queryKey: ["perf-state"],
    queryFn: () => fetch(`${getApiBase()}/api/performance/current-state`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (d: any) => fetch(`${getApiBase()}/api/performance/current-state`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-state"] }); setShowForm(false); },
  });

  const update = useMutation({
    mutationFn: ({ id, d }: any) => fetch(`${getApiBase()}/api/performance/current-state/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-state"] }); setEditing(null); },
  });

  return (
    <AppLayout title="Performance">
      <PerformanceLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Avaliação Atual</h1>
            <p className="text-slate-500 text-sm mt-1">Registre seu estado físico atual</p>
          </div>
          {!showForm && !editing && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nova Avaliação
            </button>
          )}
        </div>

        {(showForm || editing) && (
          <div className="mb-6">
            <StateForm
              initial={editing}
              onSave={(d) => editing ? update.mutate({ id: editing.id, d }) : create.mutate(d)}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Carregando...</div>
        ) : states.length === 0 && !showForm ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhuma avaliação registrada</h3>
            <p className="text-slate-400 text-sm mb-6">Registre seu ponto de partida atual</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mx-auto flex items-center gap-2">
              <Plus className="w-4 h-4" /> Registrar avaliação
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {states.map(s => (
              <StateCard key={s.id} s={s} onEdit={() => { setEditing(s); setShowForm(false); }} />
            ))}
          </div>
        )}
      </PerformanceLayout>
    </AppLayout>
  );
}
