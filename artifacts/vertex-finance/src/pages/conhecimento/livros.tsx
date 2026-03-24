import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { livrosApi, type Livro } from "@/lib/conhecimento-api";
import {
  BookOpen, Plus, Star, CheckCircle2, Clock, BookMarked,
  ChevronRight, Loader2, X, Trash2, Edit2,
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
  const [progresso, setProgresso] = useState(initial?.progresso?.toString() ?? "0");
  const [nota, setNota] = useState(initial?.nota?.toString() ?? "0");
  const [cor, setCor] = useState(initial?.cor ?? "#F59E0B");
  const [capa, setCapa] = useState(initial?.capa ?? "");

  const isEdit = !!initial;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
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
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Total páginas</label>
              <input type="number" value={totalPaginas} onChange={(e) => setTotalPaginas(e.target.value)} placeholder="320" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Progresso %</label>
              <input type="number" min="0" max="100" value={progresso} onChange={(e) => setProgresso(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nota (0–5)</label>
              <input type="number" min="0" max="5" value={nota} onChange={(e) => setNota(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">URL da Capa (opcional)</label>
            <input value={capa} onChange={(e) => setCapa(e.target.value)} placeholder="https://images.example.com/book-cover.jpg" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {capa && <img src={capa} alt="preview" className="mt-2 h-24 object-cover rounded-xl border border-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Cor da capa {capa ? "(usada quando sem imagem)" : ""}</label>
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
            onClick={() => titulo.trim() && autor.trim() && onSave({
              titulo, autor, genero, status,
              progresso: progresso ? parseInt(progresso) : 0,
              nota: nota ? parseInt(nota) : 0,
              dataInicio: initial?.dataInicio ?? null,
              dataFim: initial?.dataFim ?? null,
              resumo: initial?.resumo ?? null,
              cor,
              totalPaginas: totalPaginas ? parseInt(totalPaginas) : null,
              capa: capa.trim() || null,
            })}
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

function BookCard({ livro, onEdit, onDelete }: { livro: Livro; onEdit: () => void; onDelete: () => void }) {
  const st = STATUS_MAP[livro.status] ?? STATUS_MAP.quero_ler;

  return (
    <Link href={`/conhecimento/livros/${livro.id}`}>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group">
        <div className="w-12 rounded-xl flex-shrink-0 overflow-hidden relative" style={{ backgroundColor: livro.cor, minHeight: "72px", minWidth: "48px" }}>
          {livro.capa ? (
            <img src={livro.capa} alt={livro.titulo} className="w-full h-full object-cover" style={{ minHeight: "72px" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-1" style={{ minHeight: "72px" }}>
              <BookOpen className="w-5 h-5 text-white/90" />
              {livro.nota > 0 && (
                <div className="flex mt-1.5 gap-0.5">
                  {Array.from({ length: Math.min(livro.nota, 5) }).map((_, i) => (
                    <Star key={i} className="w-2 h-2 text-white fill-white" />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{livro.titulo}</p>
          <p className="text-xs text-slate-500 mt-0.5">{livro.autor}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.label}</span>
            <span className="text-[11px] text-slate-400">{livro.genero}</span>
          </div>
          {livro.status === "lendo" && (
            <div className="mt-2">
              <div className="w-full h-1.5 bg-slate-100 rounded-full">
                <div className="h-full rounded-full transition-all" style={{ width: `${livro.progresso}%`, backgroundColor: livro.cor }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{livro.progresso}% lido</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
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
  );
}

export default function LivrosPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modal, setModal] = useState<"new" | null>(null);
  const [editing, setEditing] = useState<Livro | null>(null);
  const [filter, setFilter] = useState<string>("todos");

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

  const lendo = livros.filter((l) => l.status === "lendo").length;
  const concluidos = livros.filter((l) => l.status === "concluido").length;
  const naFila = livros.filter((l) => l.status === "quero_ler").length;
  const filtered = filter === "todos" ? livros : livros.filter((l) => l.status === filter);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Conhecimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-500" /> Livros
            </h1>
            <p className="text-sm text-slate-400 mt-1">Sua biblioteca — cada livro com resumo, frases e insights.</p>
          </div>
          <button onClick={() => setModal("new")} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm">
            <Plus className="w-4 h-4" /> Adicionar Livro
          </button>
        </div>

        {livros.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><Clock className="w-5 h-5 text-indigo-600" /></div>
              <div><p className="text-xs text-slate-500">Lendo agora</p><p className="text-xl font-bold text-slate-900">{lendo}</p></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
              <div><p className="text-xs text-slate-500">Concluídos</p><p className="text-xl font-bold text-slate-900">{concluidos}</p></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><BookMarked className="w-5 h-5 text-amber-600" /></div>
              <div><p className="text-xs text-slate-500">Na fila</p><p className="text-xl font-bold text-slate-900">{naFila}</p></div>
            </div>
          </div>
        )}

        {livros.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {[["todos", "Todos"], ["quero_ler", "Na fila"], ["lendo", "Lendo"], ["concluido", "Concluídos"]].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === v ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{l}</button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : filtered.length === 0 && livros.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4"><BookOpen className="w-8 h-8 text-amber-400" /></div>
            <p className="font-semibold text-slate-700 mb-1">Biblioteca vazia</p>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">Adicione o primeiro livro e comece a registrar resumos, frases e insights.</p>
            <button onClick={() => setModal("new")} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4" /> Adicionar primeiro livro
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((livro) => (
              <BookCard
                key={livro.id}
                livro={livro}
                onEdit={() => setEditing(livro)}
                onDelete={() => remove.mutate(livro.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-10 text-sm text-slate-400">Nenhum livro nesta categoria.</div>
            )}
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
