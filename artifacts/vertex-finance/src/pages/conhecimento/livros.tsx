import { AppLayout } from "@/components/layout/AppLayout";
import { BookOpen, Plus, Star, CheckCircle2, Clock } from "lucide-react";

const LIVROS = [
  { id: 1, titulo: "Atomic Habits", autor: "James Clear", status: "lendo", progresso: 67, nota: 5, genero: "Desenvolvimento" },
  { id: 2, titulo: "O Investidor Inteligente", autor: "Benjamin Graham", status: "concluido", progresso: 100, nota: 5, genero: "Finanças" },
  { id: 3, titulo: "Deep Work", autor: "Cal Newport", status: "concluido", progresso: 100, nota: 4, genero: "Produtividade" },
  { id: 4, titulo: "Sapiens", autor: "Yuval Noah Harari", status: "quero_ler", progresso: 0, nota: 0, genero: "História" },
];

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  lendo:     { label: "Lendo",     cls: "bg-indigo-100 text-indigo-700" },
  concluido: { label: "Concluído", cls: "bg-emerald-100 text-emerald-700" },
  quero_ler: { label: "Na fila",   cls: "bg-slate-100 text-slate-600" },
};

export default function LivrosPage() {
  const lendo = LIVROS.filter((l) => l.status === "lendo").length;
  const concluidos = LIVROS.filter((l) => l.status === "concluido").length;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Conhecimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-500" /> Livros
            </h1>
            <p className="text-sm text-slate-400 mt-1">Sua biblioteca pessoal com progresso e anotações.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Adicionar Livro
          </button>
        </div>

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
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><BookOpen className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-xs text-slate-500">Meta 2026</p><p className="text-xl font-bold text-slate-900">24 livros</p></div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {LIVROS.map((livro) => {
            const st = STATUS_LABEL[livro.status]!;
            return (
              <div key={livro.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{livro.titulo}</p>
                  <p className="text-xs text-slate-500">{livro.autor}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                    <span className="text-[11px] text-slate-400">{livro.genero}</span>
                  </div>
                  {livro.status === "lendo" && (
                    <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${livro.progresso}%` }} />
                    </div>
                  )}
                </div>
                {livro.nota > 0 && (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {Array.from({ length: livro.nota }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
