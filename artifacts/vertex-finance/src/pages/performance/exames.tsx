import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PerformanceLayout } from "@/components/layout/PerformanceLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileText, Plus, Trash2, ExternalLink, Check, X, TestTube } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

const TIPOS = [
  "Hemograma completo", "Hormônios (testosterona, GH)", "Painel tireoidiano",
  "Perfil lipídico", "Glicemia e insulina", "Função hepática (TGO/TGP)",
  "Função renal (creatinina)", "PSA", "Cortisol", "Vitaminas e minerais",
  "Densitometria óssea", "Ecocardiograma", "Outro",
];

const TIPO_COLORS: Record<string, string> = {
  "Hemograma completo": "bg-red-50 text-red-700 border-red-200",
  "Hormônios (testosterona, GH)": "bg-purple-50 text-purple-700 border-purple-200",
  "Painel tireoidiano": "bg-blue-50 text-blue-700 border-blue-200",
  "Perfil lipídico": "bg-amber-50 text-amber-700 border-amber-200",
  "Glicemia e insulina": "bg-orange-50 text-orange-700 border-orange-200",
  "Função hepática (TGO/TGP)": "bg-green-50 text-green-700 border-green-200",
};

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function badgeColor(tipo: string) {
  return TIPO_COLORS[tipo] ?? "bg-slate-100 text-slate-700 border-slate-200";
}

function ExamForm({ onSave, onCancel }: { onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    tipo: "",
    tipoCustom: "",
    data: new Date().toISOString().slice(0, 10),
    laboratorio: "",
    resultados: "",
    observacoes: "",
    arquivoNome: "",
    arquivoUrl: "",
  });
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
  const tipo = form.tipo === "Outro" ? form.tipoCustom : form.tipo;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 mb-5">Novo exame</h3>
      <div className="space-y-4">
        <div>
          <label className="label">Tipo de exame *</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {TIPOS.map(t => (
              <button key={t} type="button" onClick={() => set("tipo", t)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  form.tipo === t
                    ? "bg-primary text-white border-primary"
                    : "border-slate-200 text-slate-600 hover:border-primary hover:text-primary")}>
                {t}
              </button>
            ))}
          </div>
          {form.tipo === "Outro" && (
            <input className="input w-full mt-2" placeholder="Nome do exame" value={form.tipoCustom} onChange={e => set("tipoCustom", e.target.value)} />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Data *</label>
            <input type="date" value={form.data} onChange={e => set("data", e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="label">Laboratório</label>
            <input value={form.laboratorio} onChange={e => set("laboratorio", e.target.value)} className="input w-full" placeholder="Ex: Fleury" />
          </div>
        </div>
        <div>
          <label className="label">Principais resultados</label>
          <textarea value={form.resultados} onChange={e => set("resultados", e.target.value)}
            className="input w-full h-20 resize-none" placeholder="Valores principais, referências..." />
        </div>
        <div>
          <label className="label">Observações médicas</label>
          <textarea value={form.observacoes} onChange={e => set("observacoes", e.target.value)}
            className="input w-full h-16 resize-none" placeholder="Anotações do médico..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nome do arquivo</label>
            <input value={form.arquivoNome} onChange={e => set("arquivoNome", e.target.value)} className="input w-full" placeholder="exame-sangue-jan2026.pdf" />
          </div>
          <div>
            <label className="label">URL do arquivo</label>
            <input value={form.arquivoUrl} onChange={e => set("arquivoUrl", e.target.value)} className="input w-full" placeholder="https://..." />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancelar</button>
          <button onClick={() => onSave({ ...form, tipo })} disabled={!tipo || !form.data}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"><Check className="w-4 h-4" /> Salvar</button>
        </div>
      </div>
    </div>
  );
}

export default function ExamesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: exams = [], isLoading } = useQuery<any[]>({
    queryKey: ["perf-exams"],
    queryFn: () => fetch(`${BASE}api/performance/exams`).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (d: any) => fetch(`${BASE}api/performance/exams`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-exams"] }); setShowForm(false); },
  });

  const remove = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}api/performance/exams/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["perf-exams"] }),
  });

  return (
    <AppLayout title="Performance">
      <PerformanceLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Exames</h1>
            <p className="text-slate-500 text-sm mt-1">Histórico de exames laboratoriais</p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Adicionar Exame
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-6">
            <ExamForm onSave={(d) => create.mutate(d)} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Carregando...</div>
        ) : exams.length === 0 && !showForm ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
            <TestTube className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhum exame registrado</h3>
            <p className="text-slate-400 text-sm mb-6">Mantenha seus exames organizados aqui</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mx-auto flex items-center gap-2">
              <Plus className="w-4 h-4" /> Adicionar exame
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map(e => (
              <div key={e.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap mb-2">
                    <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-semibold border", badgeColor(e.tipo))}>
                      {e.tipo}
                    </span>
                    <span className="text-xs text-slate-400">{fmtDate(e.data)}</span>
                    {e.laboratorio && <span className="text-xs text-slate-400">• {e.laboratorio}</span>}
                  </div>
                  {e.resultados && <p className="text-sm text-slate-700 font-medium mb-1">{e.resultados}</p>}
                  {e.observacoes && <p className="text-sm text-slate-500 italic">{e.observacoes}</p>}
                  {e.arquivoNome && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs bg-slate-100 px-2 py-1 rounded-lg text-slate-600">{e.arquivoNome}</span>
                      {e.arquivoUrl && (
                        <a href={e.arquivoUrl} target="_blank" rel="noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Abrir
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => remove.mutate(e.id)} className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </PerformanceLayout>
    </AppLayout>
  );
}
