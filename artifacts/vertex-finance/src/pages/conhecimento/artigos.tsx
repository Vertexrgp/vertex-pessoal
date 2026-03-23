import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { artigosApi, type Artigo } from "@/lib/conhecimento-api";
import {
  FileText, Plus, ExternalLink, Calendar, ChevronRight,
  Loader2, X, Trash2, Tag,
} from "lucide-react";

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

function AddModal({
  onSave, onClose, saving,
}: { onSave: (d: Omit<Artigo, "id" | "createdAt" | "updatedAt">) => void; onClose: () => void; saving: boolean }) {
  const [titulo, setTitulo] = useState("");
  const [fonte, setFonte] = useState("");
  const [tema, setTema] = useState("Tecnologia");
  const [dataLeitura, setDataLeitura] = useState("");
  const [cor, setCor] = useState("#6366F1");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" /> Adicionar Artigo
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
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
            onClick={() => titulo.trim() && onSave({ titulo, fonte: fonte || null, tema, dataLeitura: dataLeitura || null, resumo: null, cor })}
            disabled={saving || !titulo.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

function ArtigoCard({ artigo, onDelete }: { artigo: Artigo; onDelete: () => void }) {
  const dt = formatDate(artigo.dataLeitura);
  return (
    <Link href={`/conhecimento/artigos/${artigo.id}`}>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group">
        {/* Icon badge */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${artigo.cor}18` }}>
          <FileText className="w-5 h-5" style={{ color: artigo.cor }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 group-hover:text-primary transition-colors truncate">{artigo.titulo}</p>
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
            onClick={(e) => { e.preventDefault(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
          </button>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

export default function ArtigosPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [filter, setFilter] = useState("todos");

  const { data: artigos = [], isLoading } = useQuery<Artigo[]>({
    queryKey: ["artigos"],
    queryFn: artigosApi.list,
  });

  const create = useMutation({
    mutationFn: artigosApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["artigos"] }); setModal(false); },
  });

  const remove = useMutation({
    mutationFn: artigosApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["artigos"] }),
  });

  const temas = [...new Set(artigos.map((a) => a.tema))].sort();
  const filtered = filter === "todos" ? artigos : artigos.filter((a) => a.tema === filter);

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
          <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm">
            <Plus className="w-4 h-4" /> Adicionar Artigo
          </button>
        </div>

        {/* Stats */}
        {artigos.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-xl font-bold text-slate-900">{artigos.length}</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Tag className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Temas</p>
                <p className="text-xl font-bold text-slate-900">{temas.length}</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Com fonte</p>
                <p className="text-xl font-bold text-slate-900">{artigos.filter((a) => a.fonte).length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filter pills */}
        {temas.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilter("todos")} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === "todos" ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              Todos
            </button>
            {temas.map((t) => (
              <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === t ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {t}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : artigos.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="font-semibold text-slate-700 mb-1">Nenhum artigo ainda</p>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">
              Adicione o primeiro artigo e comece a registrar seus resumos e insights.
            </p>
            <button onClick={() => setModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4" /> Adicionar primeiro artigo
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((artigo) => (
              <ArtigoCard key={artigo.id} artigo={artigo} onDelete={() => remove.mutate(artigo.id)} />
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-10 text-sm text-slate-400">Nenhum artigo neste tema.</div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <AddModal saving={create.isPending} onClose={() => setModal(false)} onSave={create.mutate} />
      )}
    </AppLayout>
  );
}
