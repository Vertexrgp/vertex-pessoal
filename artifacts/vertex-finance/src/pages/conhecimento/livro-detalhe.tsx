import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { livrosApi, frasesApi, insightsApi, ocrApi, type Livro, type Frase, type Insight } from "@/lib/conhecimento-api";
import {
  BookOpen, ChevronLeft, Star, Quote, Lightbulb, BarChart3, FileText,
  Plus, Trash2, Loader2, Check, Pencil, X, Save, Tag, Camera, Upload, Heart,
  ImageIcon, Sparkles,
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

function fileToBase64(file: File): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(",");
      const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      resolve({ dataUrl, base64, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
    currentPage: livro.currentPage ?? null as number | null,
    nota: livro.nota,
    dataInicio: livro.dataInicio ?? "",
    dataFim: livro.dataFim ?? "",
  });
  const [saved, setSaved] = useState(false);

  const update = useMutation({
    mutationFn: (data: Partial<Livro>) => livrosApi.update(livro.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["livro", livro.id] }); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm((p) => ({ ...p, [k]: v }));

  const computedProgresso = (() => {
    if (form.currentPage != null && livro.totalPaginas != null && livro.totalPaginas > 0) {
      return Math.min(100, Math.round((form.currentPage / livro.totalPaginas) * 100));
    }
    return form.progresso;
  })();

  const handleSave = () => {
    const payload: Partial<Livro> = {
      status: form.status as Livro["status"],
      nota: form.nota,
      dataInicio: form.dataInicio || null,
      dataFim: form.dataFim || null,
    };
    if (form.currentPage != null) {
      payload.currentPage = form.currentPage;
    } else {
      payload.progresso = form.progresso;
    }
    update.mutate(payload);
  };

  return (
    <div className="flex flex-col gap-6">
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

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Status</label>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(STATUS_MAP).map(([v, l]) => (
            <button key={v} onClick={() => set("status", v as typeof form["status"])} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${form.status === v ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {livro.totalPaginas != null ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Progresso por páginas</label>
            <span className="text-2xl font-black text-slate-800">{computedProgresso}%</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Página atual</label>
              <input
                type="number"
                min={0}
                max={livro.totalPaginas}
                value={form.currentPage ?? ""}
                onChange={(e) => set("currentPage", e.target.value ? parseInt(e.target.value) : null)}
                placeholder="0"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="text-slate-300 mt-5 text-sm">/</div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Total de páginas</label>
              <input
                type="number"
                value={livro.totalPaginas}
                disabled
                className="w-full border border-slate-100 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${computedProgresso}%`, backgroundColor: livro.cor }} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {form.currentPage != null ? `${livro.totalPaginas - form.currentPage} páginas restantes` : "Informe a página atual para calcular automaticamente"}
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Percentual lido</label>
            <span className="text-2xl font-black text-slate-800">{form.progresso}%</span>
          </div>
          <input type="range" min={0} max={100} value={form.progresso} onChange={(e) => set("progresso", parseInt(e.target.value))} className="w-full accent-primary" />
          <div className="mt-2 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${form.progresso}%`, backgroundColor: livro.cor }} />
          </div>
          <p className="text-xs text-slate-400 mt-1">Adicione o total de páginas na aba Dados para rastrear por páginas.</p>
        </div>
      )}

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
        onClick={handleSave}
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

// ─── Tab: Frases & Trechos ────────────────────────────────────────────────────

function TabFrases({ livro }: { livro: Livro }) {
  const qc = useQueryClient();
  const { data: frases = [], isLoading } = useQuery<Frase[]>({
    queryKey: ["frases", livro.id],
    queryFn: () => frasesApi.list(livro.id),
  });

  const [mode, setMode] = useState<"text" | "imagem">("text");
  const [text, setText] = useState("");
  const [pagina, setPagina] = useState("");
  const [tag, setTag] = useState("");
  const [adding, setAdding] = useState(false);

  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imgBase64, setImgBase64] = useState<string | null>(null);
  const [imgMime, setImgMime] = useState<string>("image/jpeg");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [ocrDone, setOcrDone] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  const create = useMutation({
    mutationFn: () => frasesApi.create({
      livroId: livro.id,
      frase: text,
      pagina: pagina || undefined,
      tag: tag || undefined,
      imagemUrl: imgPreview || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["frases", livro.id] });
      resetForm();
    },
  });

  const toggleFav = useMutation({
    mutationFn: frasesApi.toggleFavorito,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["frases", livro.id] }),
  });

  const remove = useMutation({
    mutationFn: frasesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["frases", livro.id] }),
  });

  const resetForm = () => {
    setText(""); setPagina(""); setTag("");
    setImgPreview(null); setImgBase64(null); setImgMime("image/jpeg");
    setOcrText(""); setOcrDone(false); setAdding(false);
    if (imgRef.current) imgRef.current.value = "";
  };

  const handleImgChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { dataUrl, base64, mimeType } = await fileToBase64(file);
    setImgPreview(dataUrl);
    setImgBase64(base64);
    setImgMime(mimeType);
    setOcrText("");
    setOcrDone(false);
  };

  const handleOcr = async () => {
    if (!imgBase64) return;
    setOcrLoading(true);
    try {
      const { texto } = await ocrApi.extrairTexto(imgBase64, imgMime);
      setOcrText(texto);
      setText(texto);
      setOcrDone(true);
    } catch {
      setOcrText("Erro ao extrair texto. Verifique a imagem e tente novamente.");
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-400">{frases.length} {frases.length === 1 ? "trecho" : "trechos"} marcados</p>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold hover:bg-amber-100">
          <Plus className="w-3.5 h-3.5" /> Adicionar trecho
        </button>
      </div>

      {adding && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setMode("text")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${mode === "text" ? "bg-amber-500 text-white border-amber-500" : "bg-white border-amber-200 text-amber-700"}`}
            >
              <Quote className="w-3.5 h-3.5" /> Digitar
            </button>
            <button
              onClick={() => setMode("imagem")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${mode === "imagem" ? "bg-amber-500 text-white border-amber-500" : "bg-white border-amber-200 text-amber-700"}`}
            >
              <Camera className="w-3.5 h-3.5" /> Foto da página
            </button>
          </div>

          {mode === "imagem" && (
            <div className="flex flex-col gap-3">
              <input ref={imgRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleImgChange} />
              {!imgPreview ? (
                <button
                  onClick={() => imgRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-amber-300 rounded-xl py-8 text-amber-500 hover:bg-amber-50/50 transition-colors"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-sm font-medium">Foto ou screenshot da página</span>
                  <span className="text-xs text-amber-400">JPG, PNG ou WebP</span>
                </button>
              ) : (
                <div className="relative">
                  <img src={imgPreview} alt="página" className="w-full max-h-64 object-contain rounded-xl border border-amber-200" />
                  <button onClick={() => { setImgPreview(null); setImgBase64(null); setOcrText(""); setOcrDone(false); if (imgRef.current) imgRef.current.value = ""; }} className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow">
                    <X className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                </div>
              )}
              {imgPreview && !ocrDone && (
                <button
                  onClick={handleOcr}
                  disabled={ocrLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {ocrLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {ocrLoading ? "Extraindo texto com IA..." : "Extrair texto com IA"}
                </button>
              )}
              {ocrDone && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <Check className="w-3.5 h-3.5" /> Texto extraído — revise e edite abaixo antes de salvar
                </div>
              )}
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus={mode === "text"}
            placeholder={mode === "text" ? "Digite a frase ou citação..." : "O texto extraído aparecerá aqui. Você pode editar antes de salvar..."}
            rows={4}
            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
          />
          <div className="flex gap-3">
            <input value={pagina} onChange={(e) => setPagina(e.target.value)} placeholder="Pág. 123" className="w-28 bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag (ex: hábitos)" className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-xl">Cancelar</button>
            <button
              onClick={() => text.trim() && create.mutate()}
              disabled={!text.trim() || create.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {create.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Salvar trecho
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
      ) : frases.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Quote className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium">Nenhum trecho marcado ainda.</p>
          <p className="text-xs mt-1">Adicione passagens que te tocaram, ou fotografe uma página para extrair o texto com IA.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {frases.map((f) => (
            <div key={f.id} className="group bg-white border border-slate-200 rounded-2xl p-5 relative hover:shadow-sm transition-shadow">
              <div className="absolute top-0 left-5 right-0 h-0.5 rounded-full" style={{ backgroundColor: livro.cor, width: "40px" }} />
              {f.imagemUrl && (
                <div className="mb-3 rounded-xl overflow-hidden border border-slate-100">
                  <img src={f.imagemUrl} alt="página" className="w-full max-h-40 object-contain" />
                </div>
              )}
              <p className="text-sm text-slate-700 leading-relaxed italic mt-1">"{f.frase}"</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  {f.pagina && <span className="text-[11px] text-slate-400">Pág. {f.pagina}</span>}
                  {f.imagemUrl && <span className="flex items-center gap-1 text-[10px] text-slate-300"><ImageIcon className="w-2.5 h-2.5" /> foto</span>}
                  {f.tag && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                      <Tag className="w-2.5 h-2.5" /> {f.tag}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleFav.mutate(f.id)} className="p-1.5 rounded-lg hover:bg-rose-50">
                    <Heart className={`w-3.5 h-3.5 ${f.favorito ? "text-rose-500 fill-rose-500" : "text-slate-300"}`} />
                  </button>
                  <button onClick={() => remove.mutate(f.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
                  </button>
                </div>
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
    { key: "dados",     label: "Dados",             icon: <FileText className="w-4 h-4" /> },
    { key: "progresso", label: "Progresso",          icon: <BarChart3 className="w-4 h-4" /> },
    { key: "resumo",    label: "Resumo",             icon: <BookOpen className="w-4 h-4" /> },
    { key: "frases",    label: "Frases & Trechos",   icon: <Quote className="w-4 h-4" /> },
    { key: "insights",  label: "Insights",           icon: <Lightbulb className="w-4 h-4" /> },
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
  const pageLabel = livro.currentPage != null && livro.totalPaginas != null
    ? `pág. ${livro.currentPage} / ${livro.totalPaginas}`
    : `${livro.progresso}%`;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <Link href="/conhecimento/livros" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 self-start transition-colors">
          <ChevronLeft className="w-4 h-4" /> Voltar à biblioteca
        </Link>

        <div className="flex gap-5 items-start">
          <div className="w-24 flex-shrink-0 rounded-2xl overflow-hidden shadow-md">
            {livro.capa ? (
              <img src={livro.capa} alt={livro.titulo} className="w-full aspect-[2/3] object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="w-full aspect-[2/3] flex flex-col items-center justify-center gap-1 p-2" style={{ backgroundColor: livro.cor }}>
                <BookOpen className="w-6 h-6 text-white/80" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${st.cls}`}>{st.label}</span>
              <span className="text-xs text-slate-400">{livro.genero}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">{livro.titulo}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{livro.autor}</p>
            {(livro.progresso > 0 || livro.currentPage != null) && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${livro.progresso}%`, backgroundColor: livro.cor }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">{pageLabel}</span>
                </div>
              </div>
            )}
            {livro.nota > 0 && (
              <div className="flex gap-0.5 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < livro.nota ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-b border-slate-100">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${tab === t.key ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          {tab === "dados"     && <TabDados livro={livro} />}
          {tab === "progresso" && <TabProgresso livro={livro} />}
          {tab === "resumo"    && <TabResumo livro={livro} />}
          {tab === "frases"    && <TabFrases livro={livro} />}
          {tab === "insights"  && <TabInsights livro={livro} />}
        </div>
      </div>
    </AppLayout>
  );
}
