import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PerformanceLayout } from "@/components/layout/PerformanceLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { FlaskConical, Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/lib/api-base";

const TIPOS = ["manipulado", "medicamento", "hormônio", "suplemento", "vitamina"];
const FREQUENCIAS = ["diário", "semanal", "quinzenal", "mensal", "ciclo"];
const VIAS = ["oral", "subcutâneo", "intramuscular", "tópico", "sublingual", "IV"];

const TIPO_STYLES: Record<string, string> = {
  manipulado: "bg-purple-100 text-purple-700",
  medicamento: "bg-blue-100 text-blue-700",
  hormônio: "bg-orange-100 text-orange-700",
  suplemento: "bg-green-100 text-green-700",
  vitamina: "bg-yellow-100 text-yellow-700",
};

function ProtocolCard({ p, onEdit, onToggle, onDelete }: any) {
  return (
    <div className={cn("bg-white border rounded-2xl p-5 shadow-sm transition-all", p.ativo ? "border-slate-200" : "border-slate-100 opacity-60")}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full capitalize", TIPO_STYLES[p.tipo] ?? "bg-slate-100 text-slate-700")}>
              {p.tipo}
            </span>
            {!p.ativo && <span className="text-xs text-slate-400 font-medium">Inativo</span>}
          </div>
          <h3 className="text-base font-bold text-slate-900">{p.nome}</h3>
          {p.principioAtivo && <p className="text-xs text-slate-500 mt-0.5">{p.principioAtivo}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            {p.ativo
              ? <ToggleRight className="w-5 h-5 text-primary" />
              : <ToggleLeft className="w-5 h-5 text-slate-300" />}
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-slate-50 rounded-xl p-2.5">
          <p className="text-xs text-slate-400 mb-0.5">Dosagem</p>
          <p className="text-sm font-bold text-slate-900">{p.dosagem}{p.unidade ? ` ${p.unidade}` : ""}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5">
          <p className="text-xs text-slate-400 mb-0.5">Frequência</p>
          <p className="text-sm font-bold text-slate-900 capitalize">{p.frequencia}</p>
        </div>
      </div>

      {Array.isArray(p.horarios) && p.horarios.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {p.horarios.map((h: string, i: number) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-medium">
              <Clock className="w-3 h-3" /> {h}
            </span>
          ))}
        </div>
      )}

      {p.viaAdministracao && (
        <p className="text-xs text-slate-400">Via: <span className="text-slate-600 font-medium capitalize">{p.viaAdministracao}</span></p>
      )}

      {p.observacoes && (
        <p className="mt-2 text-xs text-slate-500 border-l-2 border-slate-200 pl-2">{p.observacoes}</p>
      )}
    </div>
  );
}

function ProtocolForm({ initial, onSave, onCancel }: any) {
  const [form, setForm] = useState({
    nome: initial?.nome ?? "",
    tipo: initial?.tipo ?? "suplemento",
    principioAtivo: initial?.principioAtivo ?? "",
    dosagem: initial?.dosagem ?? "",
    unidade: initial?.unidade ?? "",
    frequencia: initial?.frequencia ?? "diário",
    viaAdministracao: initial?.viaAdministracao ?? "",
    cicloInicio: initial?.cicloInicio ?? "",
    cicloFim: initial?.cicloFim ?? "",
    observacoes: initial?.observacoes ?? "",
    horariosInput: initial?.horarios?.join(", ") ?? "",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const buildPayload = () => ({
    ...form,
    horarios: form.horariosInput.split(",").map((s: string) => s.trim()).filter(Boolean),
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 mb-5">{initial ? "Editar protocolo" : "Novo protocolo"}</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nome *</label>
            <input value={form.nome} onChange={e => set("nome", e.target.value)} className="input w-full" placeholder="Ex: Testosterona Cipionato" />
          </div>
          <div>
            <label className="label">Tipo *</label>
            <select value={form.tipo} onChange={e => set("tipo", e.target.value)} className="input w-full">
              {TIPOS.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Princípio ativo</label>
          <input value={form.principioAtivo} onChange={e => set("principioAtivo", e.target.value)} className="input w-full" placeholder="Ex: Testosterona" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Dosagem *</label>
            <input value={form.dosagem} onChange={e => set("dosagem", e.target.value)} className="input w-full" placeholder="Ex: 250" />
          </div>
          <div>
            <label className="label">Unidade</label>
            <input value={form.unidade} onChange={e => set("unidade", e.target.value)} className="input w-full" placeholder="mg, UI, mcg..." />
          </div>
          <div>
            <label className="label">Frequência</label>
            <select value={form.frequencia} onChange={e => set("frequencia", e.target.value)} className="input w-full">
              {FREQUENCIAS.map(f => <option key={f} value={f} className="capitalize">{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Horários (separados por vírgula)</label>
          <input value={form.horariosInput} onChange={e => set("horariosInput", e.target.value)} className="input w-full" placeholder="Ex: 07:00, 22:00" />
        </div>
        <div>
          <label className="label">Via de administração</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {VIAS.map(v => (
              <button key={v} type="button" onClick={() => set("viaAdministracao", form.viaAdministracao === v ? "" : v)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border capitalize transition-all",
                  form.viaAdministracao === v
                    ? "bg-primary text-white border-primary"
                    : "border-slate-200 text-slate-600 hover:border-primary hover:text-primary")}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Início do ciclo</label>
            <input type="date" value={form.cicloInicio} onChange={e => set("cicloInicio", e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="label">Fim do ciclo</label>
            <input type="date" value={form.cicloFim} onChange={e => set("cicloFim", e.target.value)} className="input w-full" />
          </div>
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea value={form.observacoes} onChange={e => set("observacoes", e.target.value)}
            className="input w-full h-16 resize-none" placeholder="Observações, contraindicações..." />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancelar</button>
          <button onClick={() => onSave(buildPayload())} disabled={!form.nome || !form.dosagem}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"><Check className="w-4 h-4" /> Salvar</button>
        </div>
      </div>
    </div>
  );
}

export default function ProtocolosPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: protocols = [], isLoading } = useQuery<any[]>({
    queryKey: ["perf-protocols"],
    queryFn: () => fetch(`${getApiBase()}/api/performance/protocols`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (d: any) => fetch(`${getApiBase()}/api/performance/protocols`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-protocols"] }); setShowForm(false); },
  });

  const update = useMutation({
    mutationFn: ({ id, d }: any) => fetch(`${getApiBase()}/api/performance/protocols/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-protocols"] }); setEditing(null); },
  });

  const toggle = useMutation({
    mutationFn: (id: number) => fetch(`${getApiBase()}/api/performance/protocols/${id}/toggle`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["perf-protocols"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => fetch(`${getApiBase()}/api/performance/protocols/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["perf-protocols"] }),
  });

  const ativos = protocols.filter(p => p.ativo);
  const inativos = protocols.filter(p => !p.ativo);

  return (
    <AppLayout title="Performance">
      <PerformanceLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Protocolos</h1>
            <p className="text-slate-500 text-sm mt-1">Medicamentos, manipulados e suplementos</p>
          </div>
          {!showForm && !editing && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Protocolo
            </button>
          )}
        </div>

        {(showForm || editing) && (
          <div className="mb-6">
            <ProtocolForm
              initial={editing}
              onSave={(d: any) => editing ? update.mutate({ id: editing.id, d }) : create.mutate(d)}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Carregando...</div>
        ) : protocols.length === 0 && !showForm ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
            <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhum protocolo cadastrado</h3>
            <p className="text-slate-400 text-sm mb-6">Registre seus manipulados, medicamentos e suplementos</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mx-auto flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo protocolo
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {ativos.length > 0 && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Ativos ({ativos.length})</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {ativos.map(p => (
                    <ProtocolCard key={p.id} p={p}
                      onEdit={() => { setEditing(p); setShowForm(false); }}
                      onToggle={() => toggle.mutate(p.id)}
                      onDelete={() => remove.mutate(p.id)} />
                  ))}
                </div>
              </div>
            )}
            {inativos.length > 0 && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Inativos ({inativos.length})</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {inativos.map(p => (
                    <ProtocolCard key={p.id} p={p}
                      onEdit={() => { setEditing(p); setShowForm(false); }}
                      onToggle={() => toggle.mutate(p.id)}
                      onDelete={() => remove.mutate(p.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </PerformanceLayout>
    </AppLayout>
  );
}
