import { AppLayout } from "@/components/layout/AppLayout";
import { Globe, Plus, TrendingUp, BookOpen, Clock, CheckCircle2, Circle, Mic } from "lucide-react";

const NIVEL_ATUAL = "B1";
const NIVEL_META = "B2";
const PROGRESS_PER_NIVEL = { A1: 0, A2: 16, B1: 33, B2: 50, C1: 66, C2: 83 };

const NIVEIS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const VOCABULARIO = [
  { palavra: "Milestone", traducao: "Marco / Etapa importante", nivel: "B1", aprendida: true },
  { palavra: "Compound", traducao: "Composto / Acumulado", nivel: "B1", aprendida: true },
  { palavra: "Deliberate", traducao: "Deliberado / Intencional", nivel: "B2", aprendida: false },
  { palavra: "Resilience", traducao: "Resiliência", nivel: "B1", aprendida: true },
];

const SESSOES = [
  { data: "Hoje", duracao: "—", tipo: "—", feita: false },
  { data: "Ontem", duracao: "45min", tipo: "Listening + Reading", feita: true },
  { data: "Seg", duracao: "30min", tipo: "Vocabulário", feita: true },
];

const nivelPct = PROGRESS_PER_NIVEL[NIVEL_ATUAL as keyof typeof PROGRESS_PER_NIVEL] ?? 0;

export default function InglesPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Idiomas</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Globe className="w-6 h-6 text-sky-500" /> Inglês
            </h1>
            <p className="text-sm text-slate-400 mt-1">Acompanhe sua evolução e plano de estudos.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Registrar Sessão
          </button>
        </div>

        {/* Nível + progressão */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Nível atual</p>
              <p className="text-5xl font-black text-indigo-600 mt-1">{NIVEL_ATUAL}</p>
              <p className="text-sm text-slate-500 mt-1">Meta: <span className="font-bold text-slate-700">{NIVEL_META}</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Classificação CEFR</p>
              <div className="flex gap-2 mt-2">
                {NIVEIS.map((n) => (
                  <div
                    key={n}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all
                      ${n === NIVEL_ATUAL ? "bg-indigo-600 text-white scale-110 shadow-md"
                        : n === NIVEL_META ? "bg-sky-100 text-sky-700 border-2 border-sky-300"
                        : NIVEIS.indexOf(n) < NIVEIS.indexOf(NIVEL_ATUAL) ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"}`}
                  >
                    {n}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Progresso até C2</span>
              <span>{nivelPct}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full" style={{ width: `${nivelPct}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Vocabulário */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-slate-900 flex items-center gap-2"><BookOpen className="w-4 h-4 text-amber-500" /> Vocabulário</p>
              <button className="text-xs text-primary font-semibold hover:underline">+ Adicionar</button>
            </div>
            <div className="flex flex-col gap-2.5">
              {VOCABULARIO.map((v) => (
                <div key={v.palavra} className="flex items-center gap-2.5">
                  {v.aprendida ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-slate-800">{v.palavra}</span>
                    <span className="text-xs text-slate-400 ml-2">{v.traducao}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 font-bold rounded">{v.nivel}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sessões recentes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-slate-900 flex items-center gap-2"><Clock className="w-4 h-4 text-sky-500" /> Sessões</p>
              <p className="text-xs text-slate-400">Últimos dias</p>
            </div>
            <div className="flex flex-col gap-3">
              {SESSOES.map((s, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${s.feita ? "bg-emerald-50/60" : "bg-slate-50 border border-dashed border-slate-200"}`}>
                  {s.feita ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300" />}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-700">{s.data}</p>
                    {s.feita && <p className="text-[11px] text-slate-400">{s.duracao} · {s.tipo}</p>}
                    {!s.feita && <p className="text-[11px] text-slate-400">Não registrada</p>}
                  </div>
                  {!s.feita && (
                    <button className="flex items-center gap-1 px-2.5 py-1 bg-primary text-white rounded-lg text-[11px] font-bold">
                      <Mic className="w-3 h-3" /> Iniciar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
