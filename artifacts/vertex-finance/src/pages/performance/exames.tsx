import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PerformanceLayout } from "@/components/layout/PerformanceLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  FileText, Plus, Trash2, Check, X, TrendingUp, ArrowLeft,
  ChevronDown, ChevronRight, TestTube, ExternalLink, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

/* ─── Reference Ranges ───────────────────────────────────────────────── */
const MARCADORES_REF: Record<string, { min?: number; max?: number; unit: string; lowerBetter?: boolean }> = {
  "Hemoglobina":         { min: 13.0, max: 17.0, unit: "g/dL" },
  "Hematócrito":         { min: 40.0, max: 50.0, unit: "%" },
  "Eritrócitos":         { min: 4.50, max: 5.50, unit: "10⁶/µL" },
  "Glicose":             { min: 70, max: 99, unit: "mg/dL" },
  "Insulina":            { min: 2.6, max: 24.9, unit: "µUI/mL" },
  "HOMA-IR":             { max: 2.5, unit: "", lowerBetter: true },
  "Colesterol total":    { max: 190, unit: "mg/dL", lowerBetter: true },
  "LDL":                 { max: 130, unit: "mg/dL", lowerBetter: true },
  "HDL":                 { min: 40, unit: "mg/dL" },
  "Triglicerídeos":      { max: 150, unit: "mg/dL", lowerBetter: true },
  "Vitamina D":          { min: 30, max: 100, unit: "ng/mL" },
  "TSH":                 { min: 0.4, max: 4.0, unit: "µUI/mL" },
  "T3 livre":            { min: 2.3, max: 4.2, unit: "pg/mL" },
  "T4 livre":            { min: 0.8, max: 1.8, unit: "ng/dL" },
  "Testosterona total":  { min: 300, max: 1000, unit: "ng/dL" },
  "Estradiol":           { min: 10, max: 40, unit: "pg/mL" },
  "IGF-1":               { min: 115, max: 307, unit: "ng/mL" },
  "Cortisol":            { min: 6.2, max: 19.4, unit: "µg/dL" },
  "PCR ultra-sensível":  { max: 0.10, unit: "mg/dL", lowerBetter: true },
  "Leucócitos":          { min: 4000, max: 10000, unit: "/µL" },
  "Plaquetas":           { min: 150000, max: 450000, unit: "/µL" },
  "Ferritina":           { min: 12, max: 300, unit: "ng/mL" },
  "Ferro sérico":        { min: 60, max: 180, unit: "µg/dL" },
  "Creatinina":          { min: 0.7, max: 1.2, unit: "mg/dL" },
  "TGO (AST)":           { max: 40, unit: "U/L", lowerBetter: true },
  "TGP (ALT)":           { max: 41, unit: "U/L", lowerBetter: true },
  "PSA total":           { max: 4.0, unit: "ng/mL", lowerBetter: true },
};

const MARCADORES_LIST = Object.keys(MARCADORES_REF);
const TIPOS = ["Hemograma completo", "Hormônios", "Painel tireoidiano", "Perfil lipídico", "Glicemia e insulina", "Função hepática", "Função renal", "PSA", "Vitaminas e minerais", "Completo", "Outro"];

function calcStatus(valor: number, ref: { min?: number; max?: number }): "normal" | "baixo" | "alto" {
  if (ref.min !== undefined && valor < ref.min) return "baixo";
  if (ref.max !== undefined && valor > ref.max) return "alto";
  return "normal";
}

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function fmtDateShort(d: string) {
  const [y, m] = d.split("-");
  return `${m}/${y.slice(2)}`;
}

const STATUS_STYLES = {
  normal: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400", label: "Normal" },
  baixo:  { badge: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-400", label: "Abaixo" },
  alto:   { badge: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-400", label: "Acima" },
};

/* ─── Exam List Panel ────────────────────────────────────────────────── */
function ExamListPanel({ exams, selected, onSelect, onNew }: any) {
  return (
    <div className="w-64 shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Exames ({exams.length})</p>
        <button onClick={onNew} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {exams.length === 0 && (
          <div className="p-6 text-center text-slate-400">
            <TestTube className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Nenhum exame</p>
          </div>
        )}
        {exams.map((e: any) => (
          <button key={e.id} onClick={() => onSelect(e.id)}
            className={cn("w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors",
              selected === e.id && "bg-primary/5 border-l-2 border-primary")}>
            <p className={cn("text-sm font-semibold leading-tight", selected === e.id ? "text-primary" : "text-slate-800")}>
              {e.tipo}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{fmtDate(e.data)}</p>
            {e.laboratorio && <p className="text-xs text-slate-400">{e.laboratorio}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Add Exam Form ──────────────────────────────────────────────────── */
function AddExamForm({ onSave, onCancel }: any) {
  const [form, setForm] = useState({
    tipo: "Hemograma completo",
    tipoCustom: "",
    data: new Date().toISOString().slice(0, 10),
    laboratorio: "",
    observacoes: "",
    arquivoNome: "",
    arquivoUrl: "",
  });
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
  const tipo = form.tipo === "Outro" ? form.tipoCustom : form.tipo;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 mb-4">Novo exame</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tipo *</label>
            <select value={form.tipo} onChange={e => set("tipo", e.target.value)} className="input w-full">
              {TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
            {form.tipo === "Outro" && (
              <input className="input w-full mt-1" placeholder="Nome do exame" value={form.tipoCustom} onChange={e => set("tipoCustom", e.target.value)} />
            )}
          </div>
          <div>
            <label className="label">Data *</label>
            <input type="date" value={form.data} onChange={e => set("data", e.target.value)} className="input w-full" />
          </div>
        </div>
        <div>
          <label className="label">Laboratório</label>
          <input value={form.laboratorio} onChange={e => set("laboratorio", e.target.value)} className="input w-full" placeholder="Ex: Alta Diagnósticos, Fleury..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nome do arquivo</label>
            <input value={form.arquivoNome} onChange={e => set("arquivoNome", e.target.value)} className="input w-full" placeholder="exame-jan2026.pdf" />
          </div>
          <div>
            <label className="label">URL do arquivo</label>
            <input value={form.arquivoUrl} onChange={e => set("arquivoUrl", e.target.value)} className="input w-full" placeholder="https://..." />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onCancel} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancelar</button>
          <button onClick={() => onSave({ ...form, tipo })} disabled={!tipo || !form.data}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"><Check className="w-4 h-4" /> Criar exame</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Marker Entry Form ──────────────────────────────────────────────── */
function MarkerEntryForm({ examId, onSave }: { examId: number; onSave: (d: any) => void }) {
  const [marcador, setMarcador] = useState("");
  const [valor, setValor] = useState("");
  const [custom, setCustom] = useState(false);
  const [customUnit, setCustomUnit] = useState("");
  const [customMin, setCustomMin] = useState("");
  const [customMax, setCustomMax] = useState("");

  const ref = marcador && !custom ? MARCADORES_REF[marcador] : null;

  function handleSave() {
    if (!marcador || !valor) return;
    const v = parseFloat(valor);
    const r = custom ? { unit: customUnit, min: customMin ? parseFloat(customMin) : undefined, max: customMax ? parseFloat(customMax) : undefined } : (ref ?? { unit: "" });
    const status = calcStatus(v, r);
    onSave({
      examId,
      marcador,
      valor: v,
      unidade: r.unit || customUnit,
      refMin: r.min ?? null,
      refMax: r.max ?? null,
      status,
    });
    setMarcador("");
    setValor("");
    setCustom(false);
    setCustomMin("");
    setCustomMax("");
    setCustomUnit("");
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Adicionar marcador</p>
      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-40">
          <label className="text-xs text-slate-500 block mb-1">Marcador</label>
          {custom ? (
            <input value={marcador} onChange={e => setMarcador(e.target.value)} className="input w-full text-sm" placeholder="Nome do marcador" />
          ) : (
            <select value={marcador} onChange={e => setMarcador(e.target.value)} className="input w-full text-sm">
              <option value="">Selecione...</option>
              {MARCADORES_LIST.map(m => <option key={m}>{m}</option>)}
            </select>
          )}
        </div>
        <div className="w-28">
          <label className="text-xs text-slate-500 block mb-1">Valor</label>
          <input type="number" step="any" value={valor} onChange={e => setValor(e.target.value)}
            className="input w-full text-sm" placeholder={ref ? `${ref.unit}` : "0"} />
        </div>
        {ref && (
          <div className="text-xs text-slate-400 pb-2">
            Ref: {ref.min !== undefined ? `${ref.min}` : "—"} – {ref.max !== undefined ? `${ref.max}` : "—"} {ref.unit}
          </div>
        )}
        {custom && (
          <>
            <div className="w-20">
              <label className="text-xs text-slate-500 block mb-1">Unidade</label>
              <input value={customUnit} onChange={e => setCustomUnit(e.target.value)} className="input w-full text-sm" placeholder="mg/dL" />
            </div>
            <div className="w-20">
              <label className="text-xs text-slate-500 block mb-1">Ref mín</label>
              <input type="number" value={customMin} onChange={e => setCustomMin(e.target.value)} className="input w-full text-sm" placeholder="0" />
            </div>
            <div className="w-20">
              <label className="text-xs text-slate-500 block mb-1">Ref máx</label>
              <input type="number" value={customMax} onChange={e => setCustomMax(e.target.value)} className="input w-full text-sm" placeholder="0" />
            </div>
          </>
        )}
        <button onClick={() => { setCustom(c => !c); setMarcador(""); }}
          className="text-xs text-slate-400 hover:text-primary pb-2 underline whitespace-nowrap">
          {custom ? "Usar lista" : "+ Personalizado"}
        </button>
        <button onClick={handleSave} disabled={!marcador || !valor}
          className="btn-primary h-9 px-4 text-sm flex items-center gap-1.5 disabled:opacity-50">
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </button>
      </div>
    </div>
  );
}

/* ─── Markers Table ──────────────────────────────────────────────────── */
function MarkersTable({ markers, onDelete }: any) {
  if (!markers.length) return (
    <div className="text-center py-8 text-slate-400 text-sm">
      Nenhum marcador registrado. Use o formulário acima para adicionar.
    </div>
  );

  const sorted = [...markers].sort((a, b) => a.marcador.localeCompare(b.marcador));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 pl-1">Marcador</th>
            <th className="text-right pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Valor</th>
            <th className="text-center pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Referência</th>
            <th className="text-center pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
            <th className="pb-2 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {sorted.map((m: any) => {
            const st = STATUS_STYLES[m.status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.normal;
            const ref = MARCADORES_REF[m.marcador];
            const refStr = (m.refMin || ref?.min) && (m.refMax || ref?.max)
              ? `${m.refMin ?? ref?.min} – ${m.refMax ?? ref?.max}`
              : m.refMax ? `< ${m.refMax ?? ref?.max}` : m.refMin ? `> ${m.refMin ?? ref?.min}` : "—";
            return (
              <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-2.5 pl-1">
                  <span className="font-semibold text-slate-800">{m.marcador}</span>
                </td>
                <td className="py-2.5 text-right font-bold text-slate-900">
                  {parseFloat(m.valor).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}
                  {m.unidade && <span className="text-slate-400 font-normal ml-1 text-xs">{m.unidade}</span>}
                </td>
                <td className="py-2.5 text-center text-xs text-slate-400">
                  {refStr}{m.unidade ? ` ${m.unidade}` : ""}
                </td>
                <td className="py-2.5 text-center">
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border", st.badge)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
                    {st.label}
                  </span>
                </td>
                <td className="py-2.5 text-right pr-1">
                  <button onClick={() => onDelete(m.id)}
                    className="p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Exam Detail Panel ──────────────────────────────────────────────── */
function ExamDetailPanel({ exam, plans, onDelete }: any) {
  const qc = useQueryClient();

  const { data: markers = [] } = useQuery<any[]>({
    queryKey: ["exam-markers", exam.id],
    queryFn: () => fetch(`${BASE}api/performance/exam-markers?examId=${exam.id}`).then(r => r.json()),
  });

  const addMarker = useMutation({
    mutationFn: (d: any) => fetch(`${BASE}api/performance/exam-markers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exam-markers", exam.id] }),
  });

  const removeMarker = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}api/performance/exam-markers/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exam-markers", exam.id] }),
  });

  const activePlan = plans?.find((p: any) => {
    if (!p.dataInicio) return false;
    const examDate = new Date(exam.data);
    const planStart = new Date(p.dataInicio);
    const planEnd = p.dataFim ? new Date(p.dataFim) : new Date();
    return examDate >= planStart && examDate <= planEnd;
  });

  const normalCount = markers.filter((m: any) => m.status === "normal").length;
  const alertCount = markers.filter((m: any) => m.status !== "normal").length;

  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">{exam.tipo}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-slate-500">{fmtDate(exam.data)}</span>
            {exam.laboratorio && <span className="text-sm text-slate-400">• {exam.laboratorio}</span>}
            {exam.arquivoUrl && (
              <a href={exam.arquivoUrl} target="_blank" rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Abrir arquivo
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {markers.length > 0 && (
            <div className="flex gap-2">
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-semibold">{normalCount} normais</span>
              {alertCount > 0 && <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full font-semibold">{alertCount} atenção</span>}
            </div>
          )}
          <button onClick={() => onDelete(exam.id)} className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context: active diet plan */}
      {activePlan && (
        <div className="px-6 py-2 bg-primary/5 border-b border-primary/10 flex items-center gap-2">
          <span className="text-xs text-primary font-semibold">Dieta ativa na época:</span>
          <span className="text-xs text-slate-700">{activePlan.nome}</span>
          {activePlan.prescritoPor && <span className="text-xs text-slate-400">por {activePlan.prescritoPor}</span>}
        </div>
      )}

      {/* Marker entry */}
      <div className="px-6 py-4 border-b border-slate-100">
        <MarkerEntryForm examId={exam.id} onSave={(d) => addMarker.mutate(d)} />
      </div>

      {/* Markers table */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <MarkersTable markers={markers} onDelete={(id: number) => removeMarker.mutate(id)} />
      </div>
    </div>
  );
}

/* ─── Evolution View ─────────────────────────────────────────────────── */
function EvolutionView({ onBack }: { onBack: () => void }) {
  const { data: evolution = {}, isLoading } = useQuery<Record<string, any[]>>({
    queryKey: ["perf-evolution"],
    queryFn: () => fetch(`${BASE}api/performance/exam-markers/evolution`).then(r => r.json()),
  });

  const marcadores = Object.entries(evolution).filter(([, vals]) => vals.length > 0);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar aos exames
        </button>
        <h2 className="text-base font-bold text-slate-900">Evolução dos Marcadores</h2>
      </div>

      {isLoading && <div className="text-center py-16 text-slate-400">Carregando...</div>}

      {!isLoading && marcadores.length === 0 && (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">Nenhum marcador registrado ainda</p>
          <p className="text-slate-400 text-sm mt-1">Adicione valores nos exames para ver a evolução aqui</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {marcadores.map(([nome, vals]) => {
          const ref = MARCADORES_REF[nome];
          const numVals = vals.map(v => parseFloat(v.valor));
          const minVal = Math.min(...numVals);
          const maxVal = Math.max(...numVals);
          const rangeMin = ref?.min !== undefined ? Math.min(minVal * 0.85, ref.min * 0.85) : minVal * 0.85;
          const rangeMax = ref?.max !== undefined ? Math.max(maxVal * 1.15, ref.max * 1.15) : maxVal * 1.15;
          const range = rangeMax - rangeMin || 1;

          const refBandStart = ref?.min !== undefined ? ((ref.min - rangeMin) / range) * 100 : 0;
          const refBandEnd = ref?.max !== undefined ? ((ref.max - rangeMin) / range) * 100 : 100;

          return (
            <div key={nome} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{nome}</h3>
                  {ref && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ref: {ref.min !== undefined ? ref.min : "—"} – {ref.max !== undefined ? ref.max : "—"} {ref.unit}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-900">
                    {parseFloat(vals[vals.length - 1].valor).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                    <span className="text-xs font-normal text-slate-400 ml-1">{ref?.unit}</span>
                  </p>
                  <p className="text-xs text-slate-400">mais recente</p>
                </div>
              </div>

              {/* Chart */}
              <div className="relative h-16 mb-3">
                {/* Reference band */}
                <div
                  className="absolute inset-y-0 bg-emerald-50 rounded"
                  style={{
                    left: `${Math.max(0, refBandStart)}%`,
                    width: `${Math.min(100, refBandEnd) - Math.max(0, refBandStart)}%`,
                  }}
                />
                {/* Data points + lines */}
                <div className="absolute inset-0 flex items-end gap-2 px-1 pb-1">
                  {vals.map((v, i) => {
                    const h = Math.max(8, ((parseFloat(v.valor) - rangeMin) / range) * 100);
                    const st = STATUS_STYLES[v.status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.normal;
                    return (
                      <div key={v.id} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-600 truncate">
                          {parseFloat(v.valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                        </span>
                        <div
                          className={cn("w-full rounded-t-md min-h-2", st.dot.replace("bg-", "bg-").replace("-400", "-300"))}
                          style={{ height: `${h}%`, maxHeight: "100%" }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dates */}
              <div className="flex gap-2 px-1">
                {vals.map((v: any) => (
                  <div key={v.id} className="flex-1 text-center">
                    <p className="text-xs text-slate-400 truncate">{v.data ? fmtDateShort(v.data) : "—"}</p>
                  </div>
                ))}
              </div>

              {/* Status dots */}
              <div className="flex gap-2 px-1 mt-1">
                {vals.map((v: any) => {
                  const st = STATUS_STYLES[v.status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.normal;
                  return (
                    <div key={v.id} className="flex-1 flex justify-center">
                      <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function ExamesPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showAddExam, setShowAddExam] = useState(false);
  const [view, setView] = useState<"list" | "evolution">("list");

  const { data: exams = [], isLoading } = useQuery<any[]>({
    queryKey: ["perf-exams"],
    queryFn: () => fetch(`${BASE}api/performance/exams`).then(r => r.json()),
  });

  const { data: plans = [] } = useQuery<any[]>({
    queryKey: ["perf-meal-plans"],
    queryFn: () => fetch(`${BASE}api/performance/meal-plans`).then(r => r.json()),
  });

  const createExam = useMutation({
    mutationFn: (d: any) => fetch(`${BASE}api/performance/exams`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: (row) => { qc.invalidateQueries({ queryKey: ["perf-exams"] }); setShowAddExam(false); setSelectedId(row.id); },
  });

  const removeExam = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}api/performance/exams/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-exams"] }); setSelectedId(null); },
  });

  const selectedExam = exams.find(e => e.id === selectedId) ?? null;

  return (
    <AppLayout title="Performance">
      <PerformanceLayout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Exames</h1>
            <p className="text-slate-500 text-sm mt-1">Histórico laboratorial e evolução de marcadores</p>
          </div>
          <button
            onClick={() => setView(v => v === "list" ? "evolution" : "list")}
            className={cn("flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border transition-all",
              view === "evolution"
                ? "bg-primary text-white border-primary"
                : "border-slate-200 text-slate-600 hover:border-primary hover:text-primary")}>
            <TrendingUp className="w-4 h-4" />
            {view === "evolution" ? "← Ver exames" : "Evolução"}
          </button>
        </div>

        {view === "evolution" ? (
          <EvolutionView onBack={() => setView("list")} />
        ) : (
          <>
            {showAddExam && (
              <div className="mb-5">
                <AddExamForm onSave={(d) => createExam.mutate(d)} onCancel={() => setShowAddExam(false)} />
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-16 text-slate-400">Carregando...</div>
            ) : exams.length === 0 && !showAddExam ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
                <TestTube className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhum exame registrado</h3>
                <p className="text-slate-400 text-sm mb-6">Adicione seus exames e registre os marcadores manualmente</p>
                <button onClick={() => setShowAddExam(true)} className="btn-primary mx-auto flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Adicionar exame
                </button>
              </div>
            ) : (
              <div className="flex gap-4 h-[calc(100vh-260px)] min-h-[400px]">
                <ExamListPanel
                  exams={exams}
                  selected={selectedId}
                  onSelect={setSelectedId}
                  onNew={() => { setShowAddExam(true); setSelectedId(null); }}
                />

                {!selectedExam ? (
                  <div className="flex-1 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-center p-8">
                    <div>
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-semibold">Selecione um exame</p>
                      <p className="text-slate-400 text-sm mt-1">Clique em um exame à esquerda para ver e editar os marcadores</p>
                    </div>
                  </div>
                ) : (
                  <ExamDetailPanel
                    exam={selectedExam}
                    plans={plans}
                    onDelete={(id: number) => removeExam.mutate(id)}
                  />
                )}
              </div>
            )}
          </>
        )}
      </PerformanceLayout>
    </AppLayout>
  );
}
