import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { artigosApi, type Artigo } from "@/lib/conhecimento-api";
import {
  FileText, Plus, ExternalLink, Calendar, ChevronRight,
  Loader2, X, Trash2, Tag, Edit2, Heart, Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TEMAS = [
  "Tecnologia", "Negócios", "Ciência", "Saúde", "Finanças",
  "Produtividade", "Filosofia", "Design", "Marketing", "Outro",
];

const CORES = [
  "#6366F1", "#F59E0B", "#10B981", "#EF4444", "#3B82F6",
  "#8B5CF6", "#EC4899", "#14B8A6", "#64748B",
];

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function ArtigoModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: Artigo | null;
  onSave: (d: Omit<Artigo, "id" | "createdAt" | "updatedAt">) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [fonte, setFonte] = useState(initial?.fonte ?? "");
  const [tema, setTema] = useState(initial?.tema ?? "Tecnologia");
  const [dataLeitura, setDataLeitura] = useState(initial?.dataLeitura ?? "");
  const [resumo, setResumo] = useState(initial?.resumo ?? "");
  const [cor, setCor] = useState(initial?.cor ?? "#6366F1");

  const isEdit = !!initial;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" /> {isEdit ? "Editar Artigo" : "Adicionar Artigo"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: The Future of AI in 2025" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
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
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Resumo</label>
            <textarea value={resumo} onChange={(e) => setResumo(e.target.value)} rows={3} placeholder="Principais insights do artigo..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
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
            onClick={() => titulo.trim() && onSave({ titulo, fonte: fonte || null, tema, dataLeitura: dataLeitura || null, resumo: resumo || null, cor, favorito: initial?.favorito ?? false })}
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

function ArtigoCard({
  artigo,
  onEdit,
  onDelete,
  onToggleFavorito,
}: {
  artigo: Artigo;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorito: () => void;
}) {
  const dt = formatDate(artigo.dataLeitura);
  return (
    <div className="relative group">
      <Link href={`/conhecimento/artigos/${artigo.id}`}>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${artigo.cor}18` }}>
            <FileText className="w-5 h-5" style={{ color: artigo.cor }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-900 group-hover:text-primary transition-colors truncate">{artigo.titulo}</p>
              {artigo.favorito && <Heart className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" fill="currentColor" />}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${artigo.cor}18`, color: artigo.cor }}>
                <Tag className="w-2.5 h-2.5" /> {artigo.tema}
              </span>
              {dt && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Calendar className="w-2.5 h-2.5" /> {dt}
                </span>
              )}
            </div>
            {artigo.fonte && (
              <p className="text-[11px] text-slate-400 mt-1 truncate">{artigo.fonte}</p>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => { e.preventDefault(); onToggleFavorito(); }}
              className={`p-1.5 rounded-lg transition-all ${artigo.favorito ? "text-rose-500" : "opacity-0 group-hover:opacity-100 hover:bg-rose-50 text-slate-300"}`}
            >
              <Heart className="w-3.5 h-3.5" fill={artigo.favorito ? "currentColor" : "none"} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); onEdit(); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-indigo-50 transition-all"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-300 hover:text-primary" />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); onDelete(); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
            </button>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function ArtigosPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState<"new" | null>(null);
  const [editing, setEditing] = useState<Artigo | null>(null);
  const [filter, setFilter] = useState("todos");
  const [busca, setBusca] = useState("");

  const { data: artigos = [], isLoading } = useQuery<Artigo[]>({
    queryKey: ["artigos"],
    queryFn: artigosApi.list,
  });

  const create = useMutation({
    mutationFn: artigosApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["artigos"] }); setModal(null); toast({ title: "Artigo adicionado!" }); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Artigo> }) => artigosApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["artigos"] }); setEditing(null); toast({ title: "Artigo atualizado!" }); },
  });

  const remove = useMutation({
    mutationFn: artigosApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["artigos"] }); toast({ title: "Artigo removido" }); },
  });

  const toggleFavorito = useMutation({
    mutationFn: artigosApi.toggleFavorito,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["artigos"] }),
    onError: () => toast({ title: "Erro ao favoritar", variant: "destructive" }),
  });

  const temas = [...new Set(artigos.map((a) => a.tema))].sort();
  const favoritos = artigos.filter((a) => a.favorito).length;

  const filtered = artigos
    .filter((a) => filter === "todos" ? true : filter === "favoritos" ? a.favorito : a.tema === filter)
    .filter((a) => busca.trim() ? (
      a.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      a.tema.toLowerCase().includes(busca.toLowerCase()) ||
      (a.fonte?.toLowerCase().includes(busca.toLowerCase()) ?? false)
    ) : true);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Conhecimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-500" /> Artigos
            </h1>
            <p className="text-sm text-slate-400 mt-1">Artigos lidos com resumos e insights organizados.</p>
          </div>
          <button onClick={() => setModal("new")} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm">
            <Plus className="w-4 h-4" /> Adicionar Artigo
          </button>
        </div>

        {artigos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center"><FileText className="w-4 h-4 text-indigo-600" /></div>
              <div><p className="text-xl font-bold text-slate-900">{artigos.length}</p><p className="text-xs text-slate-400">Total</p></div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center"><Tag className="w-4 h-4 text-amber-600" /></div>
              <div><p className="text-xl font-bold text-slate-900">{temas.length}</p><p className="text-xs text-slate-400">Temas</p></div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center"><ExternalLink className="w-4 h-4 text-emerald-600" /></div>
              <div><p className="text-xl font-bold text-slate-900">{artigos.filter((a) => a.fonte).length}</p><p className="text-xs text-slate-400">Com fonte</p></div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center"><Heart className="w-4 h-4 text-rose-600" /></div>
              <div><p className="text-xl font-bold text-slate-900">{favoritos}</p><p className="text-xs text-slate-400">Favoritos</p></div>
            </div>
          </div>
        )}

        {artigos.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar artigos..."
                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setFilter("todos")} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filter === "todos" ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Todos</button>
              <button onClick={() => setFilter("favoritos")} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filter === "favoritos" ? "bg-rose-500 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>❤ Favoritos</button>
              {temas.map((t) => (
                <button key={t} onClick={() => setFilter(t)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filter === t ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{t}</button>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : artigos.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4"><FileText className="w-8 h-8 text-indigo-400" /></div>
            <p className="font-semibold text-slate-700 mb-1">Nenhum artigo ainda</p>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">Adicione o primeiro artigo e comece a registrar seus resumos e insights.</p>
            <button onClick={() => setModal("new")} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4" /> Adicionar primeiro artigo
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((artigo) => (
              <ArtigoCard
                key={artigo.id}
                artigo={artigo}
                onEdit={() => setEditing(artigo)}
                onDelete={() => remove.mutate(artigo.id)}
                onToggleFavorito={() => toggleFavorito.mutate(artigo.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-10 text-sm text-slate-400">Nenhum artigo encontrado.</div>
            )}
          </div>
        )}
      </div>

      {modal === "new" && (
        <ArtigoModal saving={create.isPending} onClose={() => setModal(null)} onSave={create.mutate} />
      )}

      {editing && (
        <ArtigoModal
          initial={editing}
          saving={update.isPending}
          onClose={() => setEditing(null)}
          onSave={(data) => update.mutate({ id: editing.id, data })}
        />
      )}
    </AppLayout>
  );
}
