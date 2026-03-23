import { AppLayout } from "@/components/layout/AppLayout";
import { FileText, Plus, ExternalLink, Tag } from "lucide-react";

const ARTIGOS = [
  { id: 1, titulo: "The Compound Effect of Daily Habits", fonte: "James Clear", tag: "Hábitos", salvo: "Mar 2026", lido: true },
  { id: 2, titulo: "How to Build Wealth Slowly", fonte: "Mr. Money Mustache", tag: "Finanças", salvo: "Mar 2026", lido: true },
  { id: 3, titulo: "Deep Work vs Shallow Work", fonte: "Cal Newport", tag: "Produtividade", salvo: "Fev 2026", lido: false },
  { id: 4, titulo: "The Science of Sleep", fonte: "Matthew Walker", tag: "Saúde", salvo: "Fev 2026", lido: false },
];

const TAG_COR: Record<string, string> = {
  Hábitos: "bg-indigo-100 text-indigo-700",
  Finanças: "bg-emerald-100 text-emerald-700",
  Produtividade: "bg-amber-100 text-amber-700",
  Saúde: "bg-rose-100 text-rose-700",
};

export default function ArtigosPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Conhecimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-amber-500" /> Artigos
            </h1>
            <p className="text-sm text-slate-400 mt-1">Guarde artigos e conteúdos relevantes para revisitar.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Salvar Artigo
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {ARTIGOS.map((art) => (
            <div key={art.id} className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow ${art.lido ? "border-slate-200" : "border-indigo-200 bg-indigo-50/20"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${art.lido ? "bg-slate-100" : "bg-indigo-100"}`}>
                <FileText className={`w-5 h-5 ${art.lido ? "text-slate-500" : "text-indigo-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${art.lido ? "text-slate-700" : "text-slate-900"}`}>{art.titulo}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">{art.fonte}</span>
                  <span className="text-xs text-slate-300">·</span>
                  <span className="text-xs text-slate-400">{art.salvo}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${TAG_COR[art.tag] ?? "bg-slate-100 text-slate-600"}`}>
                  <Tag className="w-2.5 h-2.5" /> {art.tag}
                </span>
                {!art.lido && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
