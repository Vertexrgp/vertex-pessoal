import { AppLayout } from "@/components/layout/AppLayout";
import { Bookmark, Plus, BookOpen } from "lucide-react";

const RESUMOS = [
  { id: 1, livro: "Atomic Habits", autor: "James Clear", data: "Mar 2026", trecho: "Toda ação que você toma é um voto para o tipo de pessoa que deseja se tornar. Não é sobre objetivos, é sobre sistemas." },
  { id: 2, livro: "O Investidor Inteligente", autor: "Benjamin Graham", data: "Fev 2026", trecho: "O mercado de ações é um mecanismo de transferência de dinheiro do impaciente para o paciente. A margem de segurança é o conceito central do investimento." },
  { id: 3, livro: "Deep Work", autor: "Cal Newport", data: "Jan 2026", trecho: "A capacidade de se concentrar sem distrações em uma tarefa cognitivamente exigente é uma habilidade cada vez mais rara e valiosa." },
];

export default function ResumosPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Conhecimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Bookmark className="w-6 h-6 text-amber-500" /> Resumos
            </h1>
            <p className="text-sm text-slate-400 mt-1">Seus resumos e anotações de livros e artigos.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Novo Resumo
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {RESUMOS.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-amber-50/40">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-sm">{r.livro}</p>
                  <p className="text-xs text-slate-500">{r.autor} · {r.data}</p>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-slate-700 leading-relaxed italic border-l-4 border-amber-300 pl-4">
                  "{r.trecho}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
