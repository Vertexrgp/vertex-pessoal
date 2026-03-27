import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { livrosApi, type Livro } from "@/lib/conhecimento-api";
import {
  BookOpen, Plus, Star, CheckCircle2, Clock, BookMarked,
  Loader2, X, Trash2, Edit2, Heart, Search, Upload, BookCopy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_MAP = {
  quero_ler:  { label: "Na fila",   cls: "bg-slate-100 text-slate-600" },
  lendo:      { label: "Lendo",     cls: "bg-indigo-100 text-indigo-700" },
  concluido:  { label: "Concluído", cls: "bg-emerald-100 text-emerald-700" },
  abandonado: { label: "Parei",     cls: "bg-red-100 text-red-600" },
};

const GENEROS = ["Desenvolvimento", "Finanças", "Produtividade", "Saúde", "Filosofia", "Ficção", "História", "Negócios", "Ciência", "Outro"];
const CORES = ["#F59E0B", "#6366F1", "#10B981", "#EF4444", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#64748B"];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function LivroModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: Livro | null;
  onSave: (d: Omit<Livro, "id" | "createdAt" | "updatedAt">) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [autor, setAutor] = useState(initial?.autor ?? "");
  const [genero, setGenero] = useState(initial?.genero ?? "Desenvolvimento");
  const [status, setStatus] = useState<Livro["status"]>(initial?.status ?? "quero_ler");
  const [totalPaginas, setTotalPaginas] = useState(initial?.totalPaginas?.toString() ?? "");
  const [currentPage, setCurrentPage] = useState(initial?.currentPage?.toString() ?? "");
  const [nota, setNota] = useState(initial?.nota?.toString() ?? "0");
  const [cor, setCor] = useState(initial?.cor ?? "#F59E0B");
  const [capaPreview, setCapaPreview] = useState<string | null>(initial?.capa ?? null);
  const [uploadingCapa, setUploadingCapa] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = !!initial;

  const computedProgresso = (() => {
    const cp = parseInt(currentPage);
    const tp = parseInt(totalPaginas);
    if (!isNaN(cp) && !isNaN(tp) && tp > 0) return Math.min(100, Math.round((cp / tp) * 100));
    return 0;
  })();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) return;
    setUploadingCapa(true);
    try {
      const dataUrl = await fileToBase64(file);
      setCapaPreview(dataUrl);
    } finally {
      setUploadingCapa(false);
    }
  };

  const handleSave = () => {
    if (!titulo.trim() || !autor.trim()) return;
    const cp = currentPage.trim() ? parseInt(currentPage) : null;
    const tp = totalPaginas.trim() ? parseInt(totalPaginas) : null;
    const progresso = (() => {
      if (cp != null && tp != null && tp > 0) return Math.min(100, Math.round((cp / tp) * 100));
      return 0;
    })();
    onSave({
      titulo, autor, genero, status,
      progresso,
      currentPage: cp,
      nota: nota ? parseInt(nota) : 0,
      dataInicio: initial?.dataInicio ?? null,
      dataFim: initial?.dataFim ?? null,
      resumo: initial?.resumo ?? null,
      cor,
      totalPaginas: tp,
      capa: capaPreview ?? null,
      favorito: initial?.favorito ?? false,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{isEdit ? "Editar Livro" : "Adicionar Livro"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Atomic Habits" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Autor *</label>
            <input value={autor} onChange={(e) => setAutor(e.target.value)} placeholder="James Clear" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Gênero</label>
              <select value={genero} onChange={(e) => setGenero(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {GENEROS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as Livro["status"])} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {Object.entries(STATUS_MAP).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Total págs.</label>
              <input type="number" value={totalPaginas} onChange={(e) => setTotalPaginas(e.target.value)} placeholder="320" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Página atual</label>
              <input type="number" value={currentPage} onChange={(e) => setCurrentPage(e.target.value)} placeholder="0" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nota (0–5)</label>
              <input type="number" min="0" max="5" value={nota} onChange={(e) => setNota(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          {(currentPage || totalPaginas) && (
            <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${computedProgresso}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-700 tabular-nums w-10 text-right">{computedProgresso}%</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Capa do livro</label>
            <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
            {capaPreview ? (
              <div className="relative group">
                <img src={capaPreview} alt="capa" className="h-32 object-cover rounded-xl border border-slate-200 w-full" />
                <button
                  onClick={() => { setCapaPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-slate-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingCapa}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-6 text-sm text-slate-400 hover:border-primary/40 hover:text-primary/60 transition-colors"
              >
                {uploadingCapa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploadingCapa ? "Carregando..." : "Clique para enviar foto da capa"}
              </button>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Cor {capaPreview ? "(fallback)" : "da capa"}</label>
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
            onClick={handleSave}
            disabled={saving || !titulo.trim() || !autor.trim()}
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

function BookCard({
  livro,
  onEdit,
  onDelete,
  onToggleFavorito,
}: {
  livro: Livro;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorito: () => void;
}) {
  const st = STATUS_MAP[livro.status] ?? STATUS_MAP.quero_ler;
  const showProgress = livro.status === "lendo" || livro.progresso > 0;
  const pageLabel = livro.currentPage != null && livro.totalPaginas != null
    ? `Pág. ${livro.currentPage}/${livro.totalPaginas}`
    : livro.progresso > 0 ? `${livro.progresso}%` : null;

  return (
    <div className="group relative bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col">
      <Link href={`/conhecimento/livros/${livro.id}`}>
        <div className="aspect-[2/3] relative overflow-hidden flex-shrink-0">
          {livro.capa ? (
            <img
              src={livro.capa}
              alt={livro.titulo}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3" style={{ backgroundColor: livro.cor }}>
              <BookOpen className="w-8 h-8 text-white/80" />
              <p className="text-white/90 text-[10px] font-bold text-center leading-tight line-clamp-3">{livro.titulo}</p>
              {livro.nota > 0 && (
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(livro.nota, 5) }).map((_, i) => (
                    <Star key={i} className="w-2.5 h-2.5 text-white fill-white" />
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>

      <button
        onClick={(e) => { e.preventDefault(); onToggleFavorito(); }}
        className={`absolute top-2 right-2 p-1.5 rounded-full shadow-sm transition-all ${livro.favorito ? "bg-rose-500 text-white" : "bg-white/90 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"}`}
      >
        <Heart className="w-3.5 h-3.5" fill={livro.favorito ? "currentColor" : "none"} />
      </button>

      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button onClick={(e) => { e.preventDefault(); onEdit(); }} className="p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white">
          <Edit2 className="w-3 h-3 text-slate-600" />
        </button>
        <button onClick={(e) => { e.preventDefault(); onDelete(); }} className="p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-red-50">
          <Trash2 className="w-3 h-3 text-red-400" />
        </button>
      </div>

      <Link href={`/conhecimento/livros/${livro.id}`}>
        <div className="p-3 flex flex-col gap-1 flex-1">
          <p className="font-semibold text-slate-900 text-xs leading-tight line-clamp-2">{livro.titulo}</p>
          <p className="text-[11px] text-slate-400 truncate">{livro.autor}</p>
          <div className="flex items-center justify-between mt-1">
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${st.cls}`}>{st.label}</span>
            <span className="text-[10px] text-slate-300">{livro.genero}</span>
          </div>
          {showProgress && (
            <div className="mt-1">
              <div className="w-full bg-slate-100 rounded-full h-1">
                <div className="h-1 rounded-full transition-all" style={{ width: `${livro.progresso}%`, backgroundColor: livro.cor }} />
              </div>
              {pageLabel && <p className="text-[9px] text-slate-400 mt-0.5">{pageLabel}</p>}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

export default function LivrosPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState<"new" | null>(null);
  const [editing, setEditing] = useState<Livro | null>(null);
  const [filter, setFilter] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  const { data: livros = [], isLoading } = useQuery<Livro[]>({
    queryKey: ["livros"],
    queryFn: livrosApi.list,
  });

  const create = useMutation({
    mutationFn: livrosApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["livros"] }); setModal(null); toast({ title: "Livro adicionado!" }); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Livro> }) => livrosApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["livros"] }); setEditing(null); toast({ title: "Livro atualizado!" }); },
  });

  const remove = useMutation({
    mutationFn: livrosApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["livros"] }); toast({ title: "Livro removido" }); },
  });

  const toggleFavorito = useMutation({
    mutationFn: livrosApi.toggleFavorito,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["livros"] }),
    onError: () => toast({ title: "Erro ao favoritar", variant: "destructive" }),
  });

  const lendo = livros.filter((l) => l.status === "lendo").length;
  const concluidos = livros.filter((l) => l.status === "concluido").length;
  const naFila = livros.filter((l) => l.status === "quero_ler").length;
  const favoritos = livros.filter((l) => l.favorito).length;

  const filtered = livros
    .filter((l) => filter === "todos" ? true : filter === "favoritos" ? l.favorito : l.status === filter)
    .filter((l) => busca.trim() ? (
      l.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      l.autor.toLowerCase().includes(busca.toLowerCase()) ||
      l.genero.toLowerCase().includes(busca.toLowerCase())
    ) : true);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Conhecimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-500" /> Livros
            </h1>
          </div>
          <button onClick={() => setModal("new")} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm">
            <Plus className="w-4 h-4" /> Adicionar Livro
          </button>
        </div>

        {livros.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Lendo", value: lendo, icon: <Clock className="w-4 h-4" />, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Concluídos", value: concluidos, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Na fila", value: naFila, icon: <BookMarked className="w-4 h-4" />, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Favoritos", value: favoritos, icon: <Heart className="w-4 h-4" />, color: "text-rose-600", bg: "bg-rose-50" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${s.bg} ${s.color} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {livros.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar livros..."
                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                ["todos", "Todos"],
                ["lendo", "Lendo"],
                ["quero_ler", "Na fila"],
                ["concluido", "Concluídos"],
                ["favoritos", "❤ Favoritos"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setFilter(v)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filter === v ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : livros.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4"><BookOpen className="w-8 h-8 text-amber-400" /></div>
            <p className="font-semibold text-slate-700 mb-1">Biblioteca vazia</p>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">Adicione o primeiro livro e comece a registrar resumos, frases e insights.</p>
            <button onClick={() => setModal("new")} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4" /> Adicionar primeiro livro
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400">Nenhum livro encontrado.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {filtered.map((livro) => (
              <BookCard
                key={livro.id}
                livro={livro}
                onEdit={() => setEditing(livro)}
                onDelete={() => remove.mutate(livro.id)}
                onToggleFavorito={() => toggleFavorito.mutate(livro.id)}
              />
            ))}
          </div>
        )}
      </div>

      {modal === "new" && (
        <LivroModal
          saving={create.isPending}
          onClose={() => setModal(null)}
          onSave={create.mutate}
        />
      )}

      {editing && (
        <LivroModal
          initial={editing}
          saving={update.isPending}
          onClose={() => setEditing(null)}
          onSave={(data) => update.mutate({ id: editing.id, data })}
        />
      )}
    </AppLayout>
  );
}
