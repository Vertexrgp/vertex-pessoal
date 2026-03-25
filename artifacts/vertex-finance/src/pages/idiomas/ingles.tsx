import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Globe, Plus, TrendingUp, BookOpen, Clock, CheckCircle2, Circle,
  Edit2, Trash2, X, Loader2, Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/lib/api-base";

const api = (path: string) => `${getApiBase()}/api/idiomas${path}`;

const NIVEIS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const PROGRESS_PER_NIVEL: Record<string, number> = { A1: 0, A2: 16, B1: 33, B2: 50, C1: 66, C2: 83 };
const TIPOS_SESSAO = ["Listening", "Reading", "Vocabulário", "Speaking", "Writing", "Grammar", "Revisão", "Outro"];

type Config = { id: number; idioma: string; nivelAtual: string; nivelMeta: string };
type Sessao = { id: number; data: string; duracao: number | null; tipo: string | null; concluida: boolean; notas: string | null };
type Vocab = { id: number; palavra: string; traducao: string; nivel: string | null; aprendida: boolean; notas: string | null };

function SessaoModal({ initial, onSave, onClose, saving }: { initial?: Sessao | null; onSave: (d: any) => void; onClose: () => void; saving: boolean }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    data: initial?.data ?? today,
    duracao: initial?.duracao?.toString() ?? "",
    tipo: initial?.tipo ?? "Listening",
    concluida: initial?.concluida ?? false,
    notas: initial?.notas ?? "",
  });
  const isEdit = !!initial;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{isEdit ? "Editar Sessão" : "Registrar Sessão"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data *</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Duração (min)</label>
              <input type="number" value={form.duracao} onChange={e => setForm(f => ({ ...f, duracao: e.target.value }))} placeholder="30" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo</label>
            <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {TIPOS_SESSAO.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notas</label>
            <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.concluida} onChange={e => setForm(f => ({ ...f, concluida: e.target.checked }))} className="rounded" />
            <span className="text-sm text-slate-600">Sessão concluída</span>
          </label>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancelar</button>
          <button onClick={() => form.data && onSave(form)} disabled={saving || !form.data} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? "Salvar" : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VocabModal({ initial, onSave, onClose, saving }: { initial?: Vocab | null; onSave: (d: any) => void; onClose: () => void; saving: boolean }) {
  const [form, setForm] = useState({
    palavra: initial?.palavra ?? "",
    traducao: initial?.traducao ?? "",
    nivel: initial?.nivel ?? "",
    aprendida: initial?.aprendida ?? false,
    notas: initial?.notas ?? "",
  });
  const isEdit = !!initial;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{isEdit ? "Editar Palavra" : "Nova Palavra"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Palavra em inglês *</label>
            <input value={form.palavra} onChange={e => setForm(f => ({ ...f, palavra: e.target.value }))} placeholder="Resilience" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tradução / Significado *</label>
            <input value={form.traducao} onChange={e => setForm(f => ({ ...f, traducao: e.target.value }))} placeholder="Resiliência" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nível CEFR</label>
            <select value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Não definido</option>
              {NIVEIS.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notas / Exemplo</label>
            <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={2} placeholder="Ex: She showed great resilience..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.aprendida} onChange={e => setForm(f => ({ ...f, aprendida: e.target.checked }))} className="rounded" />
            <span className="text-sm text-slate-600">Já aprendi esta palavra</span>
          </label>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancelar</button>
          <button onClick={() => form.palavra.trim() && form.traducao.trim() && onSave(form)} disabled={saving || !form.palavra.trim() || !form.traducao.trim()} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigModal({ config, onSave, onClose, saving }: { config: Config; onSave: (d: any) => void; onClose: () => void; saving: boolean }) {
  const [nivelAtual, setNivelAtual] = useState(config.nivelAtual);
  const [nivelMeta, setNivelMeta] = useState(config.nivelMeta);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Configurar Nível</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Nível atual</label>
            <div className="flex gap-2 flex-wrap">
              {NIVEIS.map(n => (
                <button key={n} onClick={() => setNivelAtual(n)} className={cn("w-12 h-10 rounded-xl text-sm font-bold transition-all border-2", nivelAtual === n ? "bg-indigo-600 text-white border-indigo-600 scale-105" : "border-slate-200 text-slate-500 hover:border-indigo-300")}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Nível meta</label>
            <div className="flex gap-2 flex-wrap">
              {NIVEIS.map(n => (
                <button key={n} onClick={() => setNivelMeta(n)} className={cn("w-12 h-10 rounded-xl text-sm font-bold transition-all border-2", nivelMeta === n ? "bg-sky-500 text-white border-sky-500 scale-105" : "border-slate-200 text-slate-500 hover:border-sky-300")}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancelar</button>
          <button onClick={() => onSave({ nivelAtual, nivelMeta })} disabled={saving} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InglesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<"sessoes" | "vocabulario">("sessoes");
  const [showConfig, setShowConfig] = useState(false);
  const [showSessaoNew, setShowSessaoNew] = useState(false);
  const [editingSessao, setEditingSessao] = useState<Sessao | null>(null);
  const [showVocabNew, setShowVocabNew] = useState(false);
  const [editingVocab, setEditingVocab] = useState<Vocab | null>(null);
  const [vocabFilter, setVocabFilter] = useState<"todos" | "aprendidas" | "pendentes">("todos");

  const { data: config, isLoading: loadingConfig } = useQuery<Config>({
    queryKey: ["idioma-config-ingles"],
    queryFn: () => fetch(api("/config/ingles")).then(r => r.json()),
  });

  const { data: sessoes = [], isLoading: loadingSessoes } = useQuery<Sessao[]>({
    queryKey: ["idioma-sessoes-ingles"],
    queryFn: () => fetch(api("/sessoes/ingles")).then(r => r.json()),
  });

  const { data: vocabulario = [], isLoading: loadingVocab } = useQuery<Vocab[]>({
    queryKey: ["idioma-vocab-ingles"],
    queryFn: () => fetch(api("/vocabulario/ingles")).then(r => r.json()),
  });

  const updateConfig = useMutation({
    mutationFn: (d: any) => fetch(api("/config/ingles"), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["idioma-config-ingles"] }); setShowConfig(false); toast({ title: "Nível atualizado!" }); },
  });

  const createSessao = useMutation({
    mutationFn: (d: any) => fetch(api("/sessoes/ingles"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["idioma-sessoes-ingles"] }); setShowSessaoNew(false); toast({ title: "Sessão registrada!" }); },
  });

  const updateSessao = useMutation({
    mutationFn: ({ id, d }: { id: number; d: any }) => fetch(api(`/sessoes/${id}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["idioma-sessoes-ingles"] }); setEditingSessao(null); toast({ title: "Sessão atualizada!" }); },
  });

  const deleteSessao = useMutation({
    mutationFn: (id: number) => fetch(api(`/sessoes/${id}`), { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["idioma-sessoes-ingles"] }); toast({ title: "Sessão removida" }); },
  });

  const createVocab = useMutation({
    mutationFn: (d: any) => fetch(api("/vocabulario/ingles"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["idioma-vocab-ingles"] }); setShowVocabNew(false); toast({ title: "Palavra adicionada!" }); },
  });

  const updateVocab = useMutation({
    mutationFn: ({ id, d }: { id: number; d: any }) => fetch(api(`/vocabulario/${id}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["idioma-vocab-ingles"] }); setEditingVocab(null); toast({ title: "Palavra atualizada!" }); },
  });

  const deleteVocab = useMutation({
    mutationFn: (id: number) => fetch(api(`/vocabulario/${id}`), { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["idioma-vocab-ingles"] }); toast({ title: "Palavra removida" }); },
  });

  const toggleAprendida = useMutation({
    mutationFn: ({ id, aprendida }: { id: number; aprendida: boolean }) => fetch(api(`/vocabulario/${id}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aprendida }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["idioma-vocab-ingles"] }),
  });

  const nivelAtual = config?.nivelAtual ?? "B1";
  const nivelMeta = config?.nivelMeta ?? "B2";
  const nivelPct = PROGRESS_PER_NIVEL[nivelAtual] ?? 0;

  const totalMinutos = sessoes.reduce((s, se) => s + (se.duracao ?? 0), 0);
  const sessoesFeitas = sessoes.filter(s => s.concluida).length;
  const palavrasAprendidas = vocabulario.filter(v => v.aprendida).length;

  const filteredVocab = vocabFilter === "todos" ? vocabulario
    : vocabFilter === "aprendidas" ? vocabulario.filter(v => v.aprendida)
    : vocabulario.filter(v => !v.aprendida);

  function formatDateBR(d: string) {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Idiomas</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Globe className="w-6 h-6 text-sky-500" /> Inglês
            </h1>
            <p className="text-sm text-slate-400 mt-1">Acompanhe sua evolução e plano de estudos.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowConfig(true)} className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
              <Settings className="w-4 h-4" /> Configurar
            </button>
            {tab === "sessoes" ? (
              <button onClick={() => setShowSessaoNew(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> Registrar Sessão
              </button>
            ) : (
              <button onClick={() => setShowVocabNew(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> Nova Palavra
              </button>
            )}
          </div>
        </div>

        {/* Nível + progresso */}
        {loadingConfig ? (
          <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Nível atual</p>
                <p className="text-5xl font-black text-indigo-600 mt-1">{nivelAtual}</p>
                <p className="text-sm text-slate-500 mt-1">Meta: <span className="font-bold text-slate-700">{nivelMeta}</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-2">Escala CEFR</p>
                <div className="flex gap-2">
                  {NIVEIS.map((n) => (
                    <div
                      key={n}
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all",
                        n === nivelAtual ? "bg-indigo-600 text-white scale-110 shadow-md"
                          : n === nivelMeta ? "bg-sky-100 text-sky-700 border-2 border-sky-300"
                          : NIVEIS.indexOf(n) < NIVEIS.indexOf(nivelAtual) ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-400"
                      )}
                    >
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Progresso até C2</span>
                <span>{nivelPct}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full transition-all duration-700" style={{ width: `${nivelPct}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><Clock className="w-5 h-5 text-indigo-600" /></div>
              <div><p className="text-xs text-slate-500">Horas estudadas</p><p className="text-xl font-bold text-slate-900">{Math.round(totalMinutos / 60)}h {totalMinutos % 60}min</p></div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
              <div><p className="text-xs text-slate-500">Sessões feitas</p><p className="text-xl font-bold text-slate-900">{sessoesFeitas} / {sessoes.length}</p></div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><BookOpen className="w-5 h-5 text-amber-600" /></div>
              <div><p className="text-xs text-slate-500">Vocabulário</p><p className="text-xl font-bold text-slate-900">{palavrasAprendidas} / {vocabulario.length}</p></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button onClick={() => setTab("sessoes")} className={cn("px-4 py-2 rounded-lg text-sm font-semibold transition-all", tab === "sessoes" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            Sessões {sessoes.length > 0 && <span className="ml-1 text-xs text-slate-400">({sessoes.length})</span>}
          </button>
          <button onClick={() => setTab("vocabulario")} className={cn("px-4 py-2 rounded-lg text-sm font-semibold transition-all", tab === "vocabulario" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            Vocabulário {vocabulario.length > 0 && <span className="ml-1 text-xs text-slate-400">({vocabulario.length})</span>}
          </button>
        </div>

        {/* SESSÕES */}
        {tab === "sessoes" && (
          <>
            {loadingSessoes ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
            ) : sessoes.length === 0 ? (
              <div className="flex flex-col items-center py-20 bg-white rounded-2xl border border-slate-200 text-center">
                <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center mb-4"><Clock className="w-7 h-7 text-sky-500" /></div>
                <p className="font-semibold text-slate-700 mb-1">Nenhuma sessão registrada</p>
                <p className="text-sm text-slate-400 mb-5">Registre suas sessões de estudo para acompanhar o progresso.</p>
                <button onClick={() => setShowSessaoNew(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
                  <Plus className="w-4 h-4" /> Registrar primeira sessão
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {sessoes.map((s) => (
                  <div key={s.id} className={cn("flex items-center gap-4 p-4 bg-white rounded-xl border transition-all group", s.concluida ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 hover:border-slate-300")}>
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", s.concluida ? "bg-emerald-100" : "bg-slate-100")}>
                      {s.concluida ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 text-sm">{s.tipo ?? "Sessão"}</span>
                        {s.duracao && <span className="text-xs text-slate-500">{s.duracao}min</span>}
                        {s.concluida && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Feita</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDateBR(s.data)}</p>
                      {s.notas && <p className="text-xs text-slate-500 mt-1 truncate">{s.notas}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingSessao(s)} className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                        <Edit2 className="w-3.5 h-3.5 text-slate-300 hover:text-primary" />
                      </button>
                      <button onClick={() => deleteSessao.mutate(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* VOCABULÁRIO */}
        {tab === "vocabulario" && (
          <>
            {vocabulario.length > 0 && (
              <div className="flex gap-2">
                {[["todos", "Todas"], ["pendentes", "Pendentes"], ["aprendidas", "Aprendidas"]].map(([v, l]) => (
                  <button key={v} onClick={() => setVocabFilter(v as any)} className={cn("px-3 py-1.5 rounded-full text-xs font-semibold transition-all", vocabFilter === v ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                    {l}
                  </button>
                ))}
              </div>
            )}

            {loadingVocab ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}</div>
            ) : vocabulario.length === 0 ? (
              <div className="flex flex-col items-center py-20 bg-white rounded-2xl border border-slate-200 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4"><BookOpen className="w-7 h-7 text-amber-500" /></div>
                <p className="font-semibold text-slate-700 mb-1">Nenhuma palavra ainda</p>
                <p className="text-sm text-slate-400 mb-5">Adicione palavras ao seu vocabulário para revisar e acompanhar.</p>
                <button onClick={() => setShowVocabNew(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
                  <Plus className="w-4 h-4" /> Adicionar primeira palavra
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredVocab.map((v) => (
                  <div key={v.id} className={cn("flex items-center gap-4 p-4 bg-white rounded-xl border transition-all group", v.aprendida ? "border-emerald-200 bg-emerald-50/40 opacity-80" : "border-slate-200 hover:border-slate-300")}>
                    <button
                      onClick={() => toggleAprendida.mutate({ id: v.id, aprendida: !v.aprendida })}
                      className="flex-shrink-0"
                    >
                      {v.aprendida
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : <Circle className="w-5 h-5 text-slate-300 hover:text-primary transition-colors" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("font-semibold text-sm", v.aprendida ? "line-through text-slate-400" : "text-slate-900")}>{v.palavra}</span>
                        {v.nivel && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600">{v.nivel}</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{v.traducao}</p>
                      {v.notas && <p className="text-xs text-slate-400 mt-1 italic truncate">{v.notas}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingVocab(v)} className="p-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                        <Edit2 className="w-3.5 h-3.5 text-slate-300 hover:text-primary" />
                      </button>
                      <button onClick={() => deleteVocab.mutate(v.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredVocab.length === 0 && (
                  <div className="text-center py-10 text-sm text-slate-400">Nenhuma palavra nesta categoria.</div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showConfig && config && (
        <ConfigModal config={config} saving={updateConfig.isPending} onClose={() => setShowConfig(false)} onSave={updateConfig.mutate} />
      )}
      {showSessaoNew && (
        <SessaoModal saving={createSessao.isPending} onClose={() => setShowSessaoNew(false)} onSave={createSessao.mutate} />
      )}
      {editingSessao && (
        <SessaoModal initial={editingSessao} saving={updateSessao.isPending} onClose={() => setEditingSessao(null)} onSave={(d) => updateSessao.mutate({ id: editingSessao.id, d })} />
      )}
      {showVocabNew && (
        <VocabModal saving={createVocab.isPending} onClose={() => setShowVocabNew(false)} onSave={createVocab.mutate} />
      )}
      {editingVocab && (
        <VocabModal initial={editingVocab} saving={updateVocab.isPending} onClose={() => setEditingVocab(null)} onSave={(d) => updateVocab.mutate({ id: editingVocab.id, d })} />
      )}
    </AppLayout>
  );
}
