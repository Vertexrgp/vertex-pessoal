import { AppLayout } from "@/components/layout/AppLayout";
import { Quote, Plus, Star, Copy } from "lucide-react";

const FRASES = [
  { id: 1, frase: "A disciplina é a ponte entre metas e conquistas.", autor: "Jim Rohn", categoria: "Disciplina", favorita: true },
  { id: 2, frase: "O preço de qualquer coisa é a quantidade de vida que você troca por ela.", autor: "Henry David Thoreau", categoria: "Filosofia", favorita: true },
  { id: 3, frase: "Compounds everywhere. Habits compound. Knowledge compounds. Relationships compound.", autor: "James Clear", categoria: "Hábitos", favorita: false },
  { id: 4, frase: "Se você não pode explicar de forma simples, você não entende bem o suficiente.", autor: "Albert Einstein", categoria: "Conhecimento", favorita: false },
  { id: 5, frase: "The most important investment you can make is in yourself.", autor: "Warren Buffett", categoria: "Crescimento", favorita: true },
];

const CAT_COR: Record<string, string> = {
  Disciplina:   "bg-indigo-100 text-indigo-700",
  Filosofia:    "bg-purple-100 text-purple-700",
  Hábitos:      "bg-emerald-100 text-emerald-700",
  Conhecimento: "bg-amber-100 text-amber-700",
  Crescimento:  "bg-rose-100 text-rose-700",
};

export default function FrasesPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Conhecimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Quote className="w-6 h-6 text-amber-500" /> Frases
            </h1>
            <p className="text-sm text-slate-400 mt-1">Citações que te inspiram e te lembram do que importa.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nova Frase
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {FRASES.map((f) => (
            <div key={f.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group relative">
              <Quote className="w-8 h-8 text-slate-100 absolute top-4 right-4" />
              {f.favorita && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 absolute top-4 left-4" />}
              <p className="text-sm font-medium text-slate-800 leading-relaxed mb-3 mt-2">
                "{f.frase}"
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CAT_COR[f.categoria] ?? "bg-slate-100 text-slate-600"}`}>
                    {f.categoria}
                  </span>
                  <span className="text-xs text-slate-500">— {f.autor}</span>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-slate-100">
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
