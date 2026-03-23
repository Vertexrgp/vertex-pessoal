import { AppLayout } from "@/components/layout/AppLayout";
import { Target, Plus, CheckCircle2, Circle, ChevronRight } from "lucide-react";

const OBJETIVOS = [
  {
    id: 1, titulo: "Saúde & Bem-estar", descricao: "Construir hábitos sólidos de saúde", etapas: [
      { label: "Academia 4x/semana", done: true },
      { label: "Dormir 8h por noite", done: true },
      { label: "Beber 2L de água", done: false },
      { label: "Meditação diária", done: false },
    ],
  },
  {
    id: 2, titulo: "Independência Financeira", descricao: "Construir patrimônio e liberdade financeira", etapas: [
      { label: "Reserva de emergência de 12 meses", done: true },
      { label: "Investir 30% da renda mensal", done: false },
      { label: "Renda passiva de R$ 10k/mês", done: false },
    ],
  },
];

export default function ObjetivosPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Crescimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Target className="w-6 h-6 text-indigo-500" /> Objetivos
            </h1>
            <p className="text-sm text-slate-400 mt-1">Grandes objetivos de vida divididos em etapas concretas.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Novo Objetivo
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {OBJETIVOS.map((obj) => {
            const done = obj.etapas.filter((e) => e.done).length;
            const total = obj.etapas.length;
            const pct = Math.round((done / total) * 100);
            return (
              <div key={obj.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-bold text-slate-900">{obj.titulo}</p>
                    <span className="text-sm font-bold text-indigo-600">{pct}%</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">{obj.descricao}</p>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mb-4">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex flex-col gap-2">
                    {obj.etapas.map((etapa, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        {etapa.done
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                        <span className={`text-sm ${etapa.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{etapa.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="w-full flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                  <span>Ver detalhes</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
