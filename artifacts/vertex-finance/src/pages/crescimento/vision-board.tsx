import { AppLayout } from "@/components/layout/AppLayout";
import { Star, Plus, ImagePlus } from "lucide-react";

const CATEGORIAS = [
  { label: "Carreira", emoji: "💼", cor: "from-indigo-400 to-indigo-600", itens: ["Liderança de equipe", "Produto próprio", "Palestrante"] },
  { label: "Finanças", emoji: "💰", cor: "from-emerald-400 to-emerald-600", itens: ["Casa própria", "R$ 1M patrimônio", "Liberdade financeira"] },
  { label: "Saúde", emoji: "🏋️", cor: "from-rose-400 to-rose-600", itens: ["Corpo em forma", "Correr 10km", "Energia alta"] },
  { label: "Relacionamentos", emoji: "❤️", cor: "from-pink-400 to-pink-600", itens: ["Família unida", "Amizades sólidas", "Impacto positivo"] },
  { label: "Aprendizado", emoji: "📚", cor: "from-amber-400 to-amber-600", itens: ["Inglês fluente", "24 livros/ano", "Curso de IA"] },
  { label: "Experiências", emoji: "✈️", cor: "from-sky-400 to-sky-600", itens: ["Europa", "Toscana", "Tokyo"] },
];

export default function VisionBoardPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Crescimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-500" /> Vision Board
            </h1>
            <p className="text-sm text-slate-400 mt-1">Visualize sua vida ideal em todas as dimensões.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nova Área
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {CATEGORIAS.map((cat) => (
            <div key={cat.label} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className={`h-24 bg-gradient-to-br ${cat.cor} flex items-center justify-center`}>
                <div className="text-center">
                  <span className="text-4xl">{cat.emoji}</span>
                </div>
              </div>
              <div className="p-4">
                <p className="font-bold text-slate-900 mb-3">{cat.label}</p>
                <div className="flex flex-col gap-1.5">
                  {cat.itens.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                      <span className="text-xs text-slate-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 p-6 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-slate-400 hover:text-indigo-500">
            <ImagePlus className="w-6 h-6" />
            <span className="text-sm font-medium">Nova área</span>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
