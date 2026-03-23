import { AppLayout } from "@/components/layout/AppLayout";
import { Flag, Plus, TrendingUp, CheckCircle2, Clock, Target } from "lucide-react";

const METAS_DEMO = [
  { id: 1, titulo: "Ler 24 livros em 2026", progresso: 37, total: 100, categoria: "Conhecimento", prazo: "Dez 2026", cor: "indigo" },
  { id: 2, titulo: "Patrimônio: R$ 500k", progresso: 62, total: 100, categoria: "Financeiro", prazo: "Jul 2027", cor: "emerald" },
  { id: 3, titulo: "Nível B2 em Inglês", progresso: 55, total: 100, categoria: "Idiomas", prazo: "Mar 2027", cor: "sky" },
];

const COR: Record<string, { bar: string; badge: string; text: string }> = {
  indigo: { bar: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-700", text: "text-indigo-600" },
  emerald: { bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", text: "text-emerald-600" },
  sky:    { bar: "bg-sky-500",    badge: "bg-sky-100 text-sky-700",    text: "text-sky-600" },
};

export default function MetasPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Crescimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Flag className="w-6 h-6 text-indigo-500" /> Metas
            </h1>
            <p className="text-sm text-slate-400 mt-1">Suas grandes metas de vida, com progresso e prazo definidos.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nova Meta
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><Flag className="w-5 h-5 text-indigo-600" /></div>
            <div><p className="text-xs text-slate-500">Total de Metas</p><p className="text-xl font-bold text-slate-900">3</p></div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-xs text-slate-500">Em progresso</p><p className="text-xl font-bold text-slate-900">3</p></div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-xs text-slate-500">Próximo prazo</p><p className="text-xl font-bold text-slate-900">Mar 27</p></div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {METAS_DEMO.map((meta) => {
            const c = COR[meta.cor] ?? COR.indigo;
            return (
              <div key={meta.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-slate-900">{meta.titulo}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.badge}`}>{meta.categoria}</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {meta.prazo}</span>
                    </div>
                  </div>
                  <span className={`text-lg font-black ${c.text}`}>{meta.progresso}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${c.bar} transition-all`} style={{ width: `${meta.progresso}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0"><Target className="w-5 h-5 text-indigo-600" /></div>
          <div>
            <p className="text-sm font-semibold text-indigo-900">Próximas funcionalidades</p>
            <p className="text-xs text-indigo-700 mt-1">Divisão de metas em etapas · Lembretes automáticos · Histórico de progresso · Celebração de conquistas</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
