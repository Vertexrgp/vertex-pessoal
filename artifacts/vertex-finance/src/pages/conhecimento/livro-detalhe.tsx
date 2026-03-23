import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { livrosApi, frasesApi, insightsApi, type Livro, type Frase, type Insight } from "@/lib/conhecimento-api";
import {
  BookOpen, ChevronLeft, Star, Quote, Lightbulb, BarChart3, FileText,
  Plus, Trash2, Loader2, Check, Pencil, X, Save, Tag,
} from "lucide-react";

const STATUS_MAP = {
  quero_ler:  { label: "Na fila",   cls: "bg-slate-100 text-slate-600" },
  lendo:      { label: "Lendo",     cls: "bg-indigo-100 text-indigo-700" },
  concluido:  { label: "Concluído", cls: "bg-emerald-100 text-emerald-700" },
  abandonado: { label: "Parei",     cls: "bg-red-100 text-red-600" },
};

const GENEROS = ["Desenvolvimento", "Finanças", "Produtividade", "Saúde", "Filosofia", "Ficção", "História", "Negócios", "Ciência", "Outro"];
const CORES = ["#F59E0B", "#6366F1", "#10B981", "#EF4444", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#64748B"];

type Tab = "dados" | "progresso" | "resumo" | "frases" | "insights";

// ─── Tab: Dados ───────────────────────────────────────────────────────────────

function TabDados({ livro }: { livro: Livro }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ titulo: livro.titulo, autor: livro.autor, genero: livro.genero, totalPaginas: livro.totalPaginas ?? "", cor: livro.cor });

  const update = useMutation({
    mutationFn: (data: Partial<Livro>) => livrosApi.update(livro.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["livro", livro.id] }); setEdit(false); },
  });

  const set = (k: keyof typeof form, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  if (edit) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título</label>
            <input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Autor</label>
            <input value={form.autor} onChange={(e) => set("autor", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Gênero</label>
            <select value={form.genero} onChange={(e) => set("genero", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {GENEROS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Total de páginas</label>
            <input type="number" value={form.totalPaginas} onChange={(e) => set("totalPaginas", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Cor da capa</label>
          <div className="flex gap-2 flex-wrap">
            {CORES.map((c) => (
              <button key={c} onClick={() => set("cor", c)} className="w-7 h-7 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: form.cor === c ? "#1e293b" : "transparent" }} />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEdit(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"><X className="w-3.5 h-3.5" /> Cancelar</button>
          <button
            onClick={() => update.mutate({ titulo: form.titulo, autor: form.autor, genero: form.genero, totalPaginas: form.totalPaginas ? parseInt(String(form.totalPaginas)) : null, cor: form.cor })}
            disabled={update.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {update.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-semibold mb-1">Título</p>
          <p className="font-bold text-slate-900">{livro.titulo}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-semibold mb-1">Autor</p>
          <p className="font-bold text-slate-900">{livro.autor}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-semibold mb-1">Gênero</p>
          <p className="font-semibold text-slate-800">{livro.genero}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-semibold mb-1">Páginas</p>
          <p className="font-semibold text-slate-800">{livro.totalPaginas ?? "—"}</p>
        </div>
      </div>
      <button onClick={() => setEdit(true)} className="flex items-center gap-2 self-start px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200">
        <Pencil className="w-3.5 h-3.5" /> Editar dados
      </button>
    </div>
  );
}

// ─── Tab: Progresso ───────────────────────────────────────────────────────────

function TabProgresso({ livro }: { livro: Livro }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    status: livro.status,
    progresso: livro.progresso,
    nota: livro.nota,
    dataInicio: livro.dataInicio ?? "",
    dataFim: livro.dataFim ?? "",
  });
  const [saved, setSaved] = useState(false);

  const update = useMutation({
    mutationFn: (data: Partial<Livro>) => livrosApi.update(livro.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["livro", livro.id] }); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  const set = (k: keyof typeof form, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="flex flex-col gap-6">
      {/* Avaliação */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Avaliação</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => set("nota", n)} className="p-1">
              <Star className={`w-7 h-7 transition-all ${n <= form.nota ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Status</label>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(STATUS_MAP).map(([v, l]) => (
            <button key={v} onClick={() => set("status", v)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${form.status === v ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progresso */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Percentual lido</label>
          <span className="text-2xl font-black text-slate-800">{form.progresso}%</span>
        </div>
        <input type="range" min={0} max={100} value={form.progresso} onChange={(e) => set("progresso", parseInt(e.target.value))} className="w-full accent-primary" />
        <div className="mt-2 h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${form.progresso}%`, backgroundColor: livro.cor }} />
        </div>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Início da leitura</label>
          <input type="date" value={form.dataInicio} onChange={(e) => set("dataInicio", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de conclusão</label>
          <input type="date" value={form.dataFim} onChange={(e) => set("dataFim", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      <button
        onClick={() => update.mutate({ status: form.status as Livro["status"], progresso: form.progresso, nota: form.nota, dataInicio: form.dataInicio || null, dataFim: form.dataFim || null })}
        disabled={update.isPending}
        className="flex items-center gap-2 self-start px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
      >
        {update.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
        {saved ? "Salvo!" : "Salvar progresso"}
      </button>
    </div>
  );
}

// ─── Tab: Resumo ──────────────────────────────────────────────────────────────

function TabResumo({ livro }: { livro: Livro }) {
  const qc = useQueryClient();
  const [text, setText] = useState(livro.resumo ?? "");
  const [saved, setSaved] = useState(false);

  const update = useMutation({
    mutationFn: () => livrosApi.update(livro.id, { resumo: text }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["livro", livro.id] }); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 font-medium">Escreva livremente. Suas palavras, suas conexões, seu ritmo.</p>
        <button
          onClick={() => update.mutate()}
          disabled={update.isPending}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold disabled:opacity-50"
        >
          {update.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
          {saved ? "Salvo!" : "Salvar"}
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`O que você aprendeu com "${livro.titulo}"?\n\nEscreva suas principais ideias, conexões e pensamentos...`}
        className="w-full min-h-[400px] border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-['Inter'] placeholder:text-slate-300"
        style={{ lineHeight: "1.8" }}
      />
    </div>
  );
}

// ─── Tab: Frases ──────────────────────────────────────────────────────────────

function TabFrases({ livro }: { livro: Livro }) {
  const qc = useQueryClient();
  const { data: frases = [], isLoading } = useQuery<Frase[]>({
    queryKey: ["frases", livro.id],
    queryFn: () => frasesApi.list(livro.id),
  });

  const [text, setText] = useState("");
  const [pagina, setPagina] = useState("");
  const [tag, setTag] = useState("");
  const [adding, setAdding] = useState(false);

  const create = useMutation({
    mutationFn: () => frasesApi.create({ livroId: livro.id, frase: text, pagina: pagina || undefined, tag: tag || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["frases", livro.id] }); setText(""); setPagina(""); setTag(""); setAdding(false); },
  });

  const remove = useMutation({
    mutationFn: frasesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["frases", livro.id] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-400">{frases.length} {frases.length === 1 ? "frase" : "frases"} marcadas</p>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold hover:bg-amber-100">
          <Plus className="w-3.5 h-3.5" /> Adicionar frase
        </button>
      </div>

      {adding && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            placeholder="Digite a frase ou citação..."
            rows={3}
            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
          />
          <div className="flex gap-3">
            <input value={pagina} onChange={(e) => setPagina(e.target.value)} placeholder="Pág. 123" className="w-28 bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag (ex: hábitos)" className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setAdding(false); setText(""); }} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">Cancelar</button>
            <button
              onClick={() => text.trim() && create.mutate()}
              disabled={!text.trim() || create.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {create.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Salvar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
      ) : frases.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Quote className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium">Nenhuma frase marcada ainda.</p>
          <p className="text-xs mt-1">Adicione as passagens que mais te tocaram.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {frases.map((f) => (
            <div key={f.id} className="group bg-white border border-slate-200 rounded-2xl p-5 relative hover:shadow-sm transition-shadow">
              <div className="absolute top-0 left-5 right-0 h-0.5 rounded-full" style={{ backgroundColor: livro.cor, width: "40px" }} />
              <p className="text-sm text-slate-700 leading-relaxed italic mt-1">"{f.frase}"</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  {f.pagina && <span className="text-[11px] text-slate-400">Pág. {f.pagina}</span>}
                  {f.tag && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                      <Tag className="w-2.5 h-2.5" /> {f.tag}
                    </span>
                  )}
                </div>
                <button onClick={() => remove.mutate(f.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Insights ────────────────────────────────────────────────────────────

function TabInsights({ livro }: { livro: Livro }) {
  const qc = useQueryClient();
  const { data: insights = [], isLoading } = useQuery<Insight[]>({
    queryKey: ["insights", livro.id],
    queryFn: () => insightsApi.list(livro.id),
  });

  const [text, setText] = useState("");
  const [tag, setTag] = useState("");
  const [adding, setAdding] = useState(false);

  const create = useMutation({
    mutationFn: () => insightsApi.create({ livroId: livro.id, conteudo: text, tag: tag || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["insights", livro.id] }); setText(""); setTag(""); setAdding(false); },
  });

  const remove = useMutation({
    mutationFn: insightsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insights", livro.id] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-400">{insights.length} {insights.length === 1 ? "insight" : "insights"}</p>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold hover:bg-indigo-100">
          <Plus className="w-3.5 h-3.5" /> Novo insight
        </button>
      </div>

      {adding && (
        <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 flex flex-col gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            placeholder="O que você concluiu? Como isso se aplica à sua vida?"
            rows={3}
            className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
          <div className="flex gap-3">
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag (ex: aplicar, revisitar)" className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setAdding(false); setText(""); }} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">Cancelar</button>
            <button
              onClick={() => text.trim() && create.mutate()}
              disabled={!text.trim() || create.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {create.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Salvar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
      ) : insights.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Lightbulb className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium">Nenhum insight ainda.</p>
          <p className="text-xs mt-1">Registre conexões, aplicações e conclusões pessoais.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {insights.map((ins) => (
            <div key={ins.id} className="group bg-white border border-slate-200 rounded-2xl p-5 flex gap-4 hover:shadow-sm transition-shadow">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lightbulb className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 leading-relaxed">{ins.conteudo}</p>
                {ins.tag && (
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">
                    <Tag className="w-2.5 h-2.5" /> {ins.tag}
                  </span>
                )}
              </div>
              <button onClick={() => remove.mutate(ins.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 self-start flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LivroDetalhePage({ id }: { id: string }) {
  const [tab, setTab] = useState<Tab>("dados");
  const livroId = parseInt(id);

  const { data: livro, isLoading } = useQuery<Livro>({
    queryKey: ["livro", livroId],
    queryFn: () => livrosApi.get(livroId),
    enabled: !isNaN(livroId),
  });

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "dados",     label: "Dados",     icon: <FileText className="w-4 h-4" /> },
    { key: "progresso", label: "Progresso", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "resumo",    label: "Resumo",    icon: <BookOpen className="w-4 h-4" /> },
    { key: "frases",    label: "Frases",    icon: <Quote className="w-4 h-4" /> },
    { key: "insights",  label: "Insights",  icon: <Lightbulb className="w-4 h-4" /> },
  ];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      </AppLayout>
    );
  }

  if (!livro) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-slate-600 font-semibold">Livro não encontrado</p>
          <Link href="/conhecimento/livros" className="text-sm text-primary hover:underline mt-2 block">← Voltar à biblioteca</Link>
        </div>
      </AppLayout>
    );
  }

  const st = STATUS_MAP[livro.status] ?? STATUS_MAP.quero_ler;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Breadcrumb */}
        <Link href="/conhecimento/livros" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 self-start transition-colors">
          <ChevronLeft className="w-4 h-4" /> Biblioteca
        </Link>

        {/* Book header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-start gap-5">
          {/* Book cover */}
          <div className="w-20 h-28 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-lg" style={{ backgroundColor: livro.cor }}>
            <BookOpen className="w-8 h-8 text-white/90" />
            {livro.nota > 0 && (
              <div className="flex mt-2 gap-0.5">
                {Array.from({ length: livro.nota }).map((_, i) => (
                  <Star key={i} className="w-2.5 h-2.5 text-white fill-white" />
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Conhecimento · Livros</p>
                <h1 className="text-2xl font-black text-slate-900 leading-tight">{livro.titulo}</h1>
                <p className="text-base text-slate-500 mt-1">{livro.autor}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 mt-1 ${st.cls}`}>{st.label}</span>
            </div>

            <div className="flex items-center gap-4 mt-4">
              <span className="text-xs text-slate-400 font-medium">{livro.genero}</span>
              {livro.totalPaginas && <span className="text-xs text-slate-400">{livro.totalPaginas} páginas</span>}
              <span className="text-xs text-slate-400">{livro.progresso}% lido</span>
            </div>

            {livro.status === "lendo" && (
              <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden max-w-xs">
                <div className="h-full rounded-full" style={{ width: `${livro.progresso}%`, backgroundColor: livro.cor }} />
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-semibold transition-all flex-1 justify-center ${
                  tab === t.key
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === "dados"     && <TabDados livro={livro} />}
            {tab === "progresso" && <TabProgresso livro={livro} />}
            {tab === "resumo"    && <TabResumo livro={livro} />}
            {tab === "frases"    && <TabFrases livro={livro} />}
            {tab === "insights"  && <TabInsights livro={livro} />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
