import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { videosApi, type Video } from "@/lib/conhecimento-api";
import {
  Play, Plus, CheckCircle2, Clock, BookMarked,
  ChevronRight, Loader2, X, Trash2, Edit2, ExternalLink, Heart, Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_MAP = {
  quero_ver:  { label: "Na fila",   cls: "bg-slate-100 text-slate-600" },
  vendo:      { label: "Assistindo", cls: "bg-violet-100 text-violet-700" },
  concluido:  { label: "Concluído", cls: "bg-emerald-100 text-emerald-700" },
};

const PLATAFORMAS = ["YouTube", "Instagram", "Curso", "LinkedIn", "TikTok", "Outro"];
const CATEGORIAS = ["IA", "Negócios", "Liderança", "Finanças", "Produtividade", "Motivacional", "Processos", "Saúde", "Performance", "Filosofia", "Tecnologia", "Outros"];

const PLATAFORMA_COLORS: Record<string, string> = {
  YouTube: "#EF4444",
  Instagram: "#EC4899",
  Curso: "#6366F1",
  LinkedIn: "#3B82F6",
  TikTok: "#14B8A6",
  Outro: "#64748B",
};

function VideoModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: Video | null;
  onSave: (d: Omit<Video, "id" | "createdAt" | "updatedAt">) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  const [plataforma, setPlataforma] = useState(initial?.plataforma ?? "YouTube");
  const [categoria, setCategoria] = useState(initial?.categoria ?? "Outros");
  const [tema, setTema] = useState(initial?.tema ?? "");
  const [thumbnail, setThumbnail] = useState(initial?.thumbnail ?? "");
  const [status, setStatus] = useState<Video["status"]>(initial?.status ?? "quero_ver");
  const [resumo, setResumo] = useState(initial?.resumo ?? "");

  const isEdit = !!initial;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{isEdit ? "Editar Vídeo" : "Adicionar Vídeo"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Como usar IA para escalar negócios" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Link</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Plataforma</label>
              <select value={plataforma} onChange={(e) => setPlataforma(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {PLATAFORMAS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as Video["status"])} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {Object.entries(STATUS_MAP).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoria</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tema / Canal</label>
            <input value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Lex Fridman, Huberman Lab..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">URL da Miniatura (opcional)</label>
            <input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="https://..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Resumo</label>
            <textarea value={resumo} onChange={(e) => setResumo(e.target.value)} rows={3} placeholder="Sobre o que é esse vídeo..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button
            onClick={() => titulo.trim() && onSave({
              titulo,
              link: link.trim() || null,
              plataforma,
              categoria,
              tema: tema.trim() || null,
              thumbnail: thumbnail.trim() || null,
              status,
              resumo: resumo.trim() || null,
              insights: initial?.insights ?? null,
              pontosImportantes: initial?.pontosImportantes ?? null,
              frasesMarcantes: initial?.frasesMarcantes ?? null,
              dataInicio: initial?.dataInicio ?? null,
              dataFim: initial?.dataFim ?? null,
              favorito: initial?.favorito ?? false,
            })}
            disabled={saving || !titulo.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoCard({
  video,
  onEdit,
  onDelete,
  onToggleFavorito,
}: {
  video: Video;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorito: () => void;
}) {
  const st = STATUS_MAP[video.status] ?? STATUS_MAP.quero_ver;
  const cor = PLATAFORMA_COLORS[video.plataforma] ?? "#64748B";

  return (
    <div className="relative group">
      <Link href={`/conhecimento/videos/${video.id}`}>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer">
          <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-slate-100">
            {video.thumbnail ? (
              <img src={video.thumbnail} alt={video.titulo} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${cor}15` }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cor}25` }}>
                  <Play className="w-6 h-6" style={{ color: cor }} />
                </div>
              </div>
            )}
            <div className="absolute top-2 left-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: cor }}>{video.plataforma}</span>
            </div>
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                onClick={(e) => { e.preventDefault(); onToggleFavorito(); }}
                className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-all ${video.favorito ? "bg-rose-500 text-white" : "bg-black/50 text-white/70 opacity-0 group-hover:opacity-100 hover:text-rose-400"}`}
              >
                <Heart className="w-3.5 h-3.5" fill={video.favorito ? "currentColor" : "none"} />
              </button>
              {video.link && (
                <button
                  onClick={(e) => { e.preventDefault(); window.open(video.link!, "_blank", "noopener,noreferrer"); }}
                  className="w-7 h-7 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-white" />
                </button>
              )}
            </div>
          </div>

          <div className="p-4">
            <p className="font-bold text-slate-900 text-sm group-hover:text-primary transition-colors leading-snug line-clamp-2">{video.titulo}</p>
            {video.tema && <p className="text-xs text-slate-400 mt-1">{video.tema}</p>}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                <span className="text-[10px] text-slate-400">{video.categoria}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.preventDefault(); onEdit(); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-indigo-50 transition-all"
                >
                  <Edit2 className="w-3 h-3 text-slate-300 hover:text-primary" />
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); onDelete(); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-3 h-3 text-slate-300 hover:text-red-400" />
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function VideosPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState<"new" | null>(null);
  const [editing, setEditing] = useState<Video | null>(null);
  const [filter, setFilter] = useState<string>("todos");
  const [catFilter, setCatFilter] = useState<string>("todas");
  const [busca, setBusca] = useState("");

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["videos"],
    queryFn: videosApi.list,
  });

  const create = useMutation({
    mutationFn: videosApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["videos"] }); setModal(null); toast({ title: "Vídeo adicionado!" }); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Video> }) => videosApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["videos"] }); setEditing(null); toast({ title: "Vídeo atualizado!" }); },
  });

  const remove = useMutation({
    mutationFn: videosApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["videos"] }); toast({ title: "Vídeo removido" }); },
  });

  const toggleFavorito = useMutation({
    mutationFn: videosApi.toggleFavorito,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
    onError: () => toast({ title: "Erro ao favoritar", variant: "destructive" }),
  });

  const assistindo = videos.filter((v) => v.status === "vendo").length;
  const concluidos = videos.filter((v) => v.status === "concluido").length;
  const naFila = videos.filter((v) => v.status === "quero_ver").length;
  const favoritos = videos.filter((v) => v.favorito).length;

  const cats = Array.from(new Set(videos.map((v) => v.categoria))).sort();

  const filtered = videos
    .filter((v) => filter === "todos" ? true : filter === "favoritos" ? v.favorito : v.status === filter)
    .filter((v) => catFilter === "todas" || v.categoria === catFilter)
    .filter((v) => busca.trim() ? (
      v.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      v.categoria.toLowerCase().includes(busca.toLowerCase()) ||
      v.plataforma.toLowerCase().includes(busca.toLowerCase()) ||
      (v.tema?.toLowerCase().includes(busca.toLowerCase()) ?? false)
    ) : true);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Conhecimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Play className="w-6 h-6 text-violet-500" /> Vídeos
            </h1>
            <p className="text-sm text-slate-400 mt-1">Sua videoteca — registre insights, pontos-chave e frases marcantes.</p>
          </div>
          <button onClick={() => setModal("new")} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm">
            <Plus className="w-4 h-4" /> Adicionar Vídeo
          </button>
        </div>

        {videos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center"><Play className="w-4 h-4 text-violet-600" /></div>
              <div><p className="text-xl font-bold text-slate-900">{assistindo}</p><p className="text-xs text-slate-400">Assistindo</p></div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
              <div><p className="text-xl font-bold text-slate-900">{concluidos}</p><p className="text-xs text-slate-400">Concluídos</p></div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center"><BookMarked className="w-4 h-4 text-slate-500" /></div>
              <div><p className="text-xl font-bold text-slate-900">{naFila}</p><p className="text-xs text-slate-400">Na fila</p></div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center"><Heart className="w-4 h-4 text-rose-600" /></div>
              <div><p className="text-xl font-bold text-slate-900">{favoritos}</p><p className="text-xs text-slate-400">Favoritos</p></div>
            </div>
          </div>
        )}

        {videos.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar vídeos..."
                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[["todos", "Todos"], ["quero_ver", "Na fila"], ["vendo", "Assistindo"], ["concluido", "Concluídos"], ["favoritos", "❤ Favoritos"]].map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filter === v ? (v === "favoritos" ? "bg-rose-500 text-white" : "bg-primary text-white") : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{l}</button>
              ))}
            </div>
            {cats.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setCatFilter("todas")} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${catFilter === "todas" ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Todas as categorias</button>
                {cats.map((c) => (
                  <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${catFilter === c ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{c}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4"><Play className="w-8 h-8 text-violet-400" /></div>
            <p className="font-semibold text-slate-700 mb-1">Videoteca vazia</p>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">Adicione vídeos, cursos e palestras. Registre insights, pontos-chave e frases marcantes.</p>
            <button onClick={() => setModal("new")} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4" /> Adicionar primeiro vídeo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onEdit={() => setEditing(video)}
                onDelete={() => remove.mutate(video.id)}
                onToggleFavorito={() => toggleFavorito.mutate(video.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-2 text-center py-10 text-sm text-slate-400">Nenhum vídeo encontrado.</div>
            )}
          </div>
        )}
      </div>

      {modal === "new" && (
        <VideoModal
          saving={create.isPending}
          onClose={() => setModal(null)}
          onSave={create.mutate}
        />
      )}

      {editing && (
        <VideoModal
          initial={editing}
          saving={update.isPending}
          onClose={() => setEditing(null)}
          onSave={(data) => update.mutate({ id: editing.id, data })}
        />
      )}
    </AppLayout>
  );
}
