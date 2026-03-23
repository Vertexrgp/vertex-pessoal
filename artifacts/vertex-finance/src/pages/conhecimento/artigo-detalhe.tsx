import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { artigosApi, artigoInsightsApi, type Artigo, type ArtigoInsight } from "@/lib/conhecimento-api";
import {
  FileText, ChevronLeft, ExternalLink, Calendar, Tag,
  BookOpen, Lightbulb, Plus, Trash2, Loader2,
  Check, Pencil, X, Save,
} from "lucide-react";

const TEMAS = [
  "Tecnologia", "Negócios", "Ciência", "Saúde", "Finanças",
  "Produtividade", "Filosofia", "Design", "Marketing", "Outro",
];

const CORES = [
  "#6366F1", "#F59E0B", "#10B981", "#EF4444", "#3B82F6",
  "#8B5CF6", "#EC4899", "#14B8A6", "#64748B",
];

type Tab = "resumo" | "insights";

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── Tab: Resumo ──────────────────────────────────────────────────────────────

function TabResumo({ artigo }: { artigo: Artigo }) {
  const qc = useQueryClient();
  const [text, setText] = useState(artigo.resumo ?? "");
  const [saved, setSaved] = useState(false);

  const update = useMutation({
    mutationFn: () => artigosApi.update(artigo.id, { resumo: text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artigo", artigo.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 font-medium">Escreva livremente. O que ficou, o que você aprendeu, suas palavras.</p>
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
        placeholder={`O que você aprendeu com "${artigo.titulo}"?\n\nEscreva o resumo com as principais ideias, conexões e conclusões...`}
        className="w-full min-h-[400px] border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-slate-300"
        style={{ lineHeight: "1.8" }}
      />
    </div>
  );
}

// ─── Tab: Insights ────────────────────────────────────────────────────────────

function TabInsights({ artigo }: { artigo: Artigo }) {
  const qc = useQueryClient();

  const { data: insights = [], isLoading } = useQuery<ArtigoInsight[]>({
    queryKey: ["artigo-insights", artigo.id],
    queryFn: () => artigoInsightsApi.list(artigo.id),
  });

  const [text, setText] = useState("");
  const [tag, setTag] = useState("");
  const [adding, setAdding] = useState(false);

  const create = useMutation({
    mutationFn: () => artigoInsightsApi.create({ artigoId: artigo.id, conteudo: text, tag: tag || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artigo-insights", artigo.id] });
      setText("");
      setTag("");
      setAdding(false);
    },
  });

  const remove = useMutation({
    mutationFn: artigoInsightsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["artigo-insights", artigo.id] }),
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
            placeholder="O que você concluiu? Como isso se aplica ao seu trabalho ou vida?"
            rows={3}
            className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Tag (ex: aplicar, revisitar, compartilhar)"
            className="bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
          />
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
          <p className="text-xs mt-1">Registre conexões, aplicações e conclusões pessoais deste artigo.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {insights.map((ins) => (
            <div key={ins.id} className="group bg-white border border-slate-200 rounded-2xl p-5 flex gap-4 hover:shadow-sm transition-shadow">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${artigo.cor}18` }}
              >
                <Lightbulb className="w-4 h-4" style={{ color: artigo.cor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 leading-relaxed">{ins.conteudo}</p>
                {ins.tag && (
                  <span
                    className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 text-[10px] font-bold rounded-full"
                    style={{ backgroundColor: `${artigo.cor}18`, color: artigo.cor }}
                  >
                    <Tag className="w-2.5 h-2.5" /> {ins.tag}
                  </span>
                )}
              </div>
              <button
                onClick={() => remove.mutate(ins.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 self-start flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Edit Dados Modal ─────────────────────────────────────────────────────────

function EditModal({ artigo, onClose }: { artigo: Artigo; onClose: () => void }) {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState(artigo.titulo);
  const [fonte, setFonte] = useState(artigo.fonte ?? "");
  const [tema, setTema] = useState(artigo.tema);
  const [dataLeitura, setDataLeitura] = useState(artigo.dataLeitura ?? "");
  const [cor, setCor] = useState(artigo.cor);

  const update = useMutation({
    mutationFn: () => artigosApi.update(artigo.id, { titulo, fonte: fonte || null, tema, dataLeitura: dataLeitura || null, cor }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["artigo", artigo.id] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Editar Artigo</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fonte / Link</label>
            <input value={fonte} onChange={(e) => setFonte(e.target.value)} placeholder="https://..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tema</label>
              <select value={tema} onChange={(e) => setTema(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {TEMAS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de leitura</label>
              <input type="date" value={dataLeitura} onChange={(e) => setDataLeitura(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {CORES.map((c) => (
                <button key={c} onClick={() => setCor(c)} className="w-7 h-7 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: cor === c ? "#1e293b" : "transparent" }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button
            onClick={() => titulo.trim() && update.mutate()}
            disabled={update.isPending || !titulo.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {update.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArtigoDetalhePage({ id }: { id: string }) {
  const [tab, setTab] = useState<Tab>("resumo");
  const [editModal, setEditModal] = useState(false);
  const artigoId = parseInt(id);

  const { data: artigo, isLoading } = useQuery<Artigo>({
    queryKey: ["artigo", artigoId],
    queryFn: () => artigosApi.get(artigoId),
    enabled: !isNaN(artigoId),
  });

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "resumo",   label: "Resumo",   icon: <BookOpen className="w-4 h-4" /> },
    { key: "insights", label: "Insights", icon: <Lightbulb className="w-4 h-4" /> },
  ];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      </AppLayout>
    );
  }

  if (!artigo) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-slate-600 font-semibold">Artigo não encontrado</p>
          <Link href="/conhecimento/artigos" className="text-sm text-primary hover:underline mt-2 block">← Voltar aos artigos</Link>
        </div>
      </AppLayout>
    );
  }

  const dt = formatDate(artigo.dataLeitura);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Breadcrumb */}
        <Link href="/conhecimento/artigos" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 self-start transition-colors">
          <ChevronLeft className="w-4 h-4" /> Artigos
        </Link>

        {/* Article header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-5">
            {/* Icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ backgroundColor: `${artigo.cor}20` }}
            >
              <FileText className="w-8 h-8" style={{ color: artigo.cor }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Conhecimento · Artigos</p>
                  <h1 className="text-xl font-black text-slate-900 leading-tight">{artigo.titulo}</h1>
                </div>
                <button
                  onClick={() => setEditModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 border border-slate-200 flex-shrink-0"
                >
                  <Pencil className="w-3 h-3" /> Editar
                </button>
              </div>

              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: `${artigo.cor}18`, color: artigo.cor }}
                >
                  <Tag className="w-3 h-3" /> {artigo.tema}
                </span>
                {dt && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" /> {dt}
                  </span>
                )}
                {artigo.fonte && (
                  <a
                    href={artigo.fonte}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Ver fonte
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold transition-all flex-1 justify-center ${
                  tab === t.key
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === "resumo"   && <TabResumo artigo={artigo} />}
            {tab === "insights" && <TabInsights artigo={artigo} />}
          </div>
        </div>
      </div>

      {editModal && <EditModal artigo={artigo} onClose={() => setEditModal(false)} />}
    </AppLayout>
  );
}
