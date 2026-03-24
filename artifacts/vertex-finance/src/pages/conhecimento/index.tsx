import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { livrosApi, artigosApi, videosApi, type Livro, type Artigo, type Video } from "@/lib/conhecimento-api";
import {
  BookOpen, FileText, Play, Search, Heart, Star, Clock,
  CheckCircle2, ListTodo, BookMarked, TrendingUp, Loader2,
  ChevronRight, Youtube, Tv, Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AllItem =
  | { tipo: "livro"; item: Livro }
  | { tipo: "artigo"; item: Artigo }
  | { tipo: "video"; item: Video };

type TipoFiltro = "todos" | "livro" | "artigo" | "video";
type StatusFiltro = "todos" | "favoritos" | "em_andamento" | "na_fila" | "concluidos";

function itemFavorito(x: AllItem) {
  return x.item.favorito;
}

function itemEmAndamento(x: AllItem) {
  if (x.tipo === "livro") return x.item.status === "lendo";
  if (x.tipo === "video") return x.item.status === "vendo";
  return false;
}

function itemNaFila(x: AllItem) {
  if (x.tipo === "livro") return x.item.status === "quero_ler";
  if (x.tipo === "video") return x.item.status === "quero_ver";
  if (x.tipo === "artigo") return !x.item.dataLeitura;
  return false;
}

function itemConcluido(x: AllItem) {
  if (x.tipo === "livro") return x.item.status === "concluido";
  if (x.tipo === "video") return x.item.status === "concluido";
  if (x.tipo === "artigo") return !!x.item.dataLeitura;
  return false;
}

function matchBusca(x: AllItem, q: string) {
  const lq = q.toLowerCase();
  if (x.tipo === "livro") {
    return (
      x.item.titulo.toLowerCase().includes(lq) ||
      x.item.autor.toLowerCase().includes(lq) ||
      x.item.genero.toLowerCase().includes(lq) ||
      (x.item.resumo?.toLowerCase().includes(lq) ?? false)
    );
  }
  if (x.tipo === "artigo") {
    return (
      x.item.titulo.toLowerCase().includes(lq) ||
      x.item.tema.toLowerCase().includes(lq) ||
      (x.item.fonte?.toLowerCase().includes(lq) ?? false) ||
      (x.item.resumo?.toLowerCase().includes(lq) ?? false)
    );
  }
  if (x.tipo === "video") {
    return (
      x.item.titulo.toLowerCase().includes(lq) ||
      x.item.categoria.toLowerCase().includes(lq) ||
      x.item.plataforma.toLowerCase().includes(lq) ||
      (x.item.tema?.toLowerCase().includes(lq) ?? false) ||
      (x.item.resumo?.toLowerCase().includes(lq) ?? false)
    );
  }
  return false;
}

function itemPath(x: AllItem) {
  if (x.tipo === "livro") return `/conhecimento/livros/${x.item.id}`;
  if (x.tipo === "artigo") return `/conhecimento/artigos/${x.item.id}`;
  if (x.tipo === "video") return `/conhecimento/videos/${x.item.id}`;
  return "/conhecimento";
}

function ItemCard({ x, onToggleFavorito }: { x: AllItem; onToggleFavorito: (x: AllItem) => void }) {
  const PLATFORM_COLOR: Record<string, string> = {
    YouTube: "#EF4444",
    Vimeo: "#1AB7EA",
    Udemy: "#A435F0",
    Coursera: "#0056D2",
    Outros: "#64748B",
  };

  const tipoBadge = {
    livro: { label: "Livro", color: "bg-amber-100 text-amber-700" },
    artigo: { label: "Artigo", color: "bg-blue-100 text-blue-700" },
    video: { label: "Vídeo", color: "bg-rose-100 text-rose-700" },
  }[x.tipo];

  let thumbnail: string | null = null;
  let cor = "#6366F1";
  let subtitle = "";

  if (x.tipo === "livro") {
    thumbnail = x.item.capa;
    cor = x.item.cor;
    subtitle = x.item.autor;
  } else if (x.tipo === "artigo") {
    cor = x.item.cor;
    subtitle = x.item.tema;
  } else if (x.tipo === "video") {
    thumbnail = x.item.thumbnail;
    cor = PLATFORM_COLOR[x.item.plataforma] ?? "#64748B";
    subtitle = `${x.item.plataforma} · ${x.item.categoria}`;
  }

  const icon =
    x.tipo === "livro" ? <BookOpen className="w-5 h-5 text-white/80" /> :
    x.tipo === "artigo" ? <FileText className="w-5 h-5 text-white/80" /> :
    <Play className="w-5 h-5 text-white/80" />;

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <Link href={itemPath(x)}>
        <div className="aspect-[3/2] relative overflow-hidden flex-shrink-0">
          {thumbnail ? (
            <img src={thumbnail} alt={x.item.titulo} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: cor }}>
              {icon}
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tipoBadge.color}`}>{tipoBadge.label}</span>
          </div>
        </div>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); onToggleFavorito(x); }}
        className={`absolute top-2 right-2 p-1.5 rounded-full shadow transition-colors ${x.item.favorito ? "bg-rose-500 text-white" : "bg-white/90 text-slate-400 hover:text-rose-500"}`}
      >
        <Heart className="w-3.5 h-3.5" fill={x.item.favorito ? "currentColor" : "none"} />
      </button>
      <Link href={itemPath(x)}>
        <div className="p-3 flex flex-col gap-0.5 flex-1">
          <p className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">{x.item.titulo}</p>
          <p className="text-xs text-slate-400 truncate">{subtitle}</p>
          {x.tipo === "livro" && (
            <div className="mt-1.5">
              <div className="w-full bg-slate-100 rounded-full h-1">
                <div className="h-1 rounded-full bg-indigo-500 transition-all" style={{ width: `${x.item.progresso}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{x.item.progresso}%</p>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

function SmartBlock({
  title,
  icon,
  items,
  onToggleFavorito,
  viewAllHref,
}: {
  title: string;
  icon: React.ReactNode;
  items: AllItem[];
  onToggleFavorito: (x: AllItem) => void;
  viewAllHref?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          {icon}
          {title}
          <span className="text-xs text-slate-400 font-normal">({items.length})</span>
        </h2>
        {viewAllHref && (
          <Link href={viewAllHref}>
            <span className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {items.slice(0, 12).map((x, i) => (
          <ItemCard key={`${x.tipo}-${x.item.id}-${i}`} x={x} onToggleFavorito={onToggleFavorito} />
        ))}
      </div>
    </div>
  );
}

export default function ConhecimentoHubPage() {
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todos");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: livros = [] } = useQuery({ queryKey: ["livros"], queryFn: livrosApi.list });
  const { data: artigos = [] } = useQuery({ queryKey: ["artigos"], queryFn: artigosApi.list });
  const { data: videos = [] } = useQuery({ queryKey: ["videos"], queryFn: videosApi.list });

  const toggleLivro = useMutation({
    mutationFn: (id: number) => livrosApi.toggleFavorito(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["livros"] }),
    onError: () => toast({ title: "Erro ao favoritar", variant: "destructive" }),
  });

  const toggleArtigo = useMutation({
    mutationFn: (id: number) => artigosApi.toggleFavorito(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["artigos"] }),
    onError: () => toast({ title: "Erro ao favoritar", variant: "destructive" }),
  });

  const toggleVideo = useMutation({
    mutationFn: (id: number) => videosApi.toggleFavorito(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
    onError: () => toast({ title: "Erro ao favoritar", variant: "destructive" }),
  });

  function handleToggleFavorito(x: AllItem) {
    if (x.tipo === "livro") toggleLivro.mutate(x.item.id);
    else if (x.tipo === "artigo") toggleArtigo.mutate(x.item.id);
    else if (x.tipo === "video") toggleVideo.mutate(x.item.id);
  }

  const allItems = useMemo<AllItem[]>(() => [
    ...livros.map((l): AllItem => ({ tipo: "livro", item: l })),
    ...artigos.map((a): AllItem => ({ tipo: "artigo", item: a })),
    ...videos.map((v): AllItem => ({ tipo: "video", item: v })),
  ], [livros, artigos, videos]);

  const totalFavoritos = allItems.filter(itemFavorito).length;
  const totalEmAndamento = allItems.filter(itemEmAndamento).length;
  const totalConcluidos = allItems.filter(itemConcluido).length;

  const isSearching = busca.trim().length > 0 || tipoFiltro !== "todos" || statusFiltro !== "todos";

  const filteredItems = useMemo(() => {
    return allItems
      .filter(x => tipoFiltro === "todos" || x.tipo === tipoFiltro)
      .filter(x => {
        if (statusFiltro === "favoritos") return itemFavorito(x);
        if (statusFiltro === "em_andamento") return itemEmAndamento(x);
        if (statusFiltro === "na_fila") return itemNaFila(x);
        if (statusFiltro === "concluidos") return itemConcluido(x);
        return true;
      })
      .filter(x => busca.trim() ? matchBusca(x, busca) : true);
  }, [allItems, tipoFiltro, statusFiltro, busca]);

  const blocoFavoritos = allItems.filter(itemFavorito);
  const blocoEmAndamento = allItems.filter(itemEmAndamento);
  const blocoNaFila = allItems.filter(itemNaFila);
  const blocoConcluidos = [...allItems].filter(itemConcluido).reverse().slice(0, 12);

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="bg-black px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <BookMarked className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Biblioteca Pessoal</h1>
                <p className="text-xs text-white/50">{allItems.length} itens · {totalFavoritos} favoritos</p>
              </div>
            </div>

            <div className="mt-5 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar livros, artigos, vídeos..."
                className="w-full bg-white/10 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-400 text-sm"
              />
              {busca && (
                <button onClick={() => setBusca("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-xs">
                  ✕
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(["todos", "livro", "artigo", "video"] as TipoFiltro[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipoFiltro(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${tipoFiltro === t ? "bg-white text-black" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
                >
                  {{ todos: "Todos", livro: "Livros", artigo: "Artigos", video: "Vídeos" }[t]}
                </button>
              ))}
              <div className="w-px bg-white/20 mx-1" />
              {(["todos", "favoritos", "em_andamento", "na_fila", "concluidos"] as StatusFiltro[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFiltro(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${statusFiltro === s ? "bg-indigo-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
                >
                  {{ todos: "Todos status", favoritos: "❤ Favoritos", em_andamento: "Em andamento", na_fila: "Na fila", concluidos: "Concluídos" }[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {!isSearching && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total", value: allItems.length, icon: <BookMarked className="w-4 h-4" />, color: "text-indigo-600", bg: "bg-indigo-50" },
                { label: "Favoritos", value: totalFavoritos, icon: <Heart className="w-4 h-4" />, color: "text-rose-600", bg: "bg-rose-50" },
                { label: "Em andamento", value: totalEmAndamento, icon: <Clock className="w-4 h-4" />, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Concluídos", value: totalConcluidos, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-600", bg: "bg-emerald-50" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center flex-shrink-0`}>{stat.icon}</div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isSearching ? (
            <div>
              <p className="text-sm text-slate-500 mb-4">
                {filteredItems.length === 0 ? "Nenhum resultado" : `${filteredItems.length} resultado${filteredItems.length !== 1 ? "s" : ""}`}
                {busca && <span className="ml-1">para <strong>"{busca}"</strong></span>}
              </p>
              {filteredItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {filteredItems.map((x, i) => (
                    <ItemCard key={`${x.tipo}-${x.item.id}-${i}`} x={x} onToggleFavorito={handleToggleFavorito} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Nenhum item encontrado</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              <SmartBlock
                title="Favoritos"
                icon={<Heart className="w-4 h-4 text-rose-500" fill="currentColor" />}
                items={blocoFavoritos}
                onToggleFavorito={handleToggleFavorito}
              />
              <SmartBlock
                title="Em andamento"
                icon={<Clock className="w-4 h-4 text-amber-500" />}
                items={blocoEmAndamento}
                onToggleFavorito={handleToggleFavorito}
              />
              <SmartBlock
                title="Na fila"
                icon={<ListTodo className="w-4 h-4 text-indigo-500" />}
                items={blocoNaFila}
                onToggleFavorito={handleToggleFavorito}
              />
              <SmartBlock
                title="Concluídos recentemente"
                icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                items={blocoConcluidos}
                onToggleFavorito={handleToggleFavorito}
              />

              {allItems.length === 0 && (
                <div className="text-center py-20">
                  <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Sua biblioteca está vazia</p>
                  <p className="text-slate-300 text-xs mt-1">Comece adicionando livros, artigos ou vídeos</p>
                  <div className="flex gap-3 justify-center mt-5">
                    <Link href="/conhecimento/livros">
                      <span className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors">
                        Adicionar livro
                      </span>
                    </Link>
                    <Link href="/conhecimento/artigos">
                      <span className="px-4 py-2 bg-indigo-500 text-white text-xs font-bold rounded-xl hover:bg-indigo-600 transition-colors">
                        Adicionar artigo
                      </span>
                    </Link>
                    <Link href="/conhecimento/videos">
                      <span className="px-4 py-2 bg-rose-500 text-white text-xs font-bold rounded-xl hover:bg-rose-600 transition-colors">
                        Adicionar vídeo
                      </span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
