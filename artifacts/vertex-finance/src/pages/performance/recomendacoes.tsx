import { useQuery } from "@tanstack/react-query";
import { PerformanceLayout } from "@/components/layout/PerformanceLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { Lightbulb, Target, Activity, AlertTriangle, CheckCircle, ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

type Gap = { campo: string; atual?: string; objetivo?: string; gap: number; prioridade: "alta" | "media" | "baixa"; recomendacao: string };

function calcGap(current: any, goal: any): Gap[] {
  const gaps: Gap[] = [];

  if (goal?.metaPeso && current?.peso) {
    const metaPeso = parseFloat(goal.metaPeso);
    const pessoAtual = parseFloat(current.peso);
    const diff = pessoAtual - metaPeso;
    if (Math.abs(diff) > 0.5) {
      gaps.push({
        campo: "Peso corporal",
        atual: `${pessoAtual.toFixed(1)} kg`,
        objetivo: `${metaPeso.toFixed(1)} kg`,
        gap: Math.abs(diff),
        prioridade: Math.abs(diff) > 10 ? "alta" : Math.abs(diff) > 5 ? "media" : "baixa",
        recomendacao: diff > 0
          ? `Reduzir ${diff.toFixed(1)} kg. Defina um déficit calórico moderado (300–500 kcal/dia) e priorize treino de resistência para preservar massa muscular.`
          : `Ganhar ${Math.abs(diff).toFixed(1)} kg. Aplique superávit calórico moderado (200–400 kcal/dia) com alta ingestão proteica.`,
      });
    }
  }

  if (goal?.metaBf && current?.bf) {
    const metaBf = parseFloat(goal.metaBf);
    const bfAtual = parseFloat(current.bf);
    const diff = bfAtual - metaBf;
    if (Math.abs(diff) > 1) {
      gaps.push({
        campo: "Percentual de gordura",
        atual: `${bfAtual.toFixed(1)}%`,
        objetivo: `${metaBf.toFixed(1)}%`,
        gap: Math.abs(diff),
        prioridade: Math.abs(diff) > 8 ? "alta" : Math.abs(diff) > 4 ? "media" : "baixa",
        recomendacao: diff > 0
          ? `Reduzir ${diff.toFixed(1)}% de gordura. Combine déficit calórico com cardio LISS (3x/semana) e treino de força (4x/semana). Mantenha proteína elevada (2–2.5g/kg).`
          : "Percentual de gordura abaixo da meta. Avalie se o objetivo ainda é adequado para sua fase atual.",
      });
    }
  }

  return gaps;
}

const PRIORIDADE_STYLES = {
  alta: { badge: "bg-red-100 text-red-700 border-red-200", icon: "text-red-500", dot: "bg-red-500" },
  media: { badge: "bg-amber-100 text-amber-700 border-amber-200", icon: "text-amber-500", dot: "bg-amber-500" },
  baixa: { badge: "bg-green-100 text-green-700 border-green-200", icon: "text-green-500", dot: "bg-green-500" },
};

const PLANO_BASE = [
  {
    semana: "Semanas 1–2",
    titulo: "Estabelecer base",
    descricao: "Configure nutrição, rotina de treinos e comece a registrar progresso semanalmente.",
    color: "border-l-blue-400 bg-blue-50/50",
    tag: "Fundação",
    tagColor: "bg-blue-100 text-blue-700",
  },
  {
    semana: "Semanas 3–6",
    titulo: "Execução e ajustes",
    descricao: "Siga o plano consistentemente. Ajuste calorias e carga de treino com base nos dados registrados.",
    color: "border-l-primary bg-primary/5",
    tag: "Progresso",
    tagColor: "bg-primary/10 text-primary",
  },
  {
    semana: "Semanas 7–8",
    titulo: "Avaliação de meio de ciclo",
    descricao: "Faça nova avaliação corporal. Compare com a baseline. Decida se mantém, intensifica ou ajusta o plano.",
    color: "border-l-purple-400 bg-purple-50/50",
    tag: "Revisão",
    tagColor: "bg-purple-100 text-purple-700",
  },
  {
    semana: "Semanas 9–12",
    titulo: "Intensificação e refinamento",
    descricao: "Com a base sólida, intensifique progressivamente. Foco em pontos de melhoria identificados na revisão.",
    color: "border-l-green-400 bg-green-50/50",
    tag: "Evolução",
    tagColor: "bg-green-100 text-green-700",
  },
];

const CHECKLIST = [
  { done: false, item: "Objetivo definido", sub: "Acesse Objetivo e preencha sua meta" },
  { done: false, item: "Avaliação inicial registrada", sub: "Acesse Avaliação e registre o ponto de partida" },
  { done: false, item: "Plano de treino criado", sub: "Acesse Treinos e monte sua divisão semanal" },
  { done: false, item: "Estratégia nutricional definida", sub: "Acesse Nutrição e configure seus macros" },
  { done: false, item: "Protocolos cadastrados", sub: "Acesse Protocolos e registre suplementos e medicamentos" },
  { done: false, item: "Exames recentes anexados", sub: "Acesse Exames e suba seus resultados" },
];

export default function RecomendacoesPage() {
  const { data: goals = [] } = useQuery<any[]>({
    queryKey: ["perf-goals"],
    queryFn: () => fetch(`${BASE}api/performance/goals`).then(r => r.json()),
  });

  const { data: states = [] } = useQuery<any[]>({
    queryKey: ["perf-state"],
    queryFn: () => fetch(`${BASE}api/performance/current-state`).then(r => r.json()),
  });

  const { data: progress = [] } = useQuery<any[]>({
    queryKey: ["perf-progress"],
    queryFn: () => fetch(`${BASE}api/performance/progress`).then(r => r.json()),
  });

  const latestGoal = goals[0] ?? null;
  const latestState = states[0] ?? null;

  const gaps = latestGoal && latestState ? calcGap(latestState, latestGoal) : [];

  const completedItems = [
    goals.length > 0,
    states.length > 0,
    false,
    false,
    false,
    false,
  ];

  return (
    <AppLayout title="Performance">
      <PerformanceLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Recomendações</h1>
          <p className="text-slate-500 text-sm mt-1">Análise comparativa e plano de ação</p>
        </div>

        <div className="space-y-6">
          {/* Setup checklist */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-slate-900">Checklist de configuração</h2>
            </div>
            <div className="space-y-3">
              {CHECKLIST.map((item, i) => {
                const done = completedItems[i];
                return (
                  <div key={i} className={cn("flex items-center gap-3 p-3 rounded-xl transition-colors", done ? "bg-green-50" : "bg-slate-50")}>
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                      done ? "bg-green-500" : "bg-slate-200")}>
                      {done && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className={cn("text-sm font-semibold", done ? "text-green-800 line-through opacity-60" : "text-slate-800")}>
                        {item.item}
                      </p>
                      {!done && <p className="text-xs text-slate-400">{item.sub}</p>}
                    </div>
                    {done && <span className="text-xs font-semibold text-green-600">Concluído</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gap analysis */}
          {(latestGoal || latestState) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-slate-900">Análise: Atual vs. Objetivo</h2>
              </div>

              {!latestGoal || !latestState ? (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-800">
                    {!latestGoal ? "Defina seu objetivo para ver a análise comparativa." : "Registre sua avaliação atual para ver o gap."}
                  </p>
                </div>
              ) : gaps.length === 0 ? (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <p className="text-sm text-green-800 font-semibold">Parabéns! Você está dentro dos seus objetivos definidos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {gaps.map((gap, i) => {
                    const styles = PRIORIDADE_STYLES[gap.prioridade];
                    return (
                      <div key={i} className="border border-slate-100 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{gap.campo}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-slate-500">{gap.atual}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                              <span className="text-sm font-semibold text-primary">{gap.objetivo}</span>
                            </div>
                          </div>
                          <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border capitalize", styles.badge)}>
                            {gap.prioridade === "alta" ? "Alta prioridade" : gap.prioridade === "media" ? "Média prioridade" : "Baixa prioridade"}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-3">
                          <Zap className={cn("w-4 h-4 mt-0.5 shrink-0", styles.icon)} />
                          <p className="text-sm text-slate-700">{gap.recomendacao}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Plano base */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-slate-900">Plano base de 12 semanas</h2>
            </div>
            <div className="space-y-3">
              {PLANO_BASE.map((fase, i) => (
                <div key={i} className={cn("border-l-4 rounded-r-xl p-4", fase.color)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", fase.tagColor)}>{fase.tag}</span>
                    <span className="text-xs text-slate-400">{fase.semana}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mb-1">{fase.titulo}</p>
                  <p className="text-sm text-slate-600">{fase.descricao}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Progress summary */}
          {progress.length >= 2 && (() => {
            const first = progress[progress.length - 1];
            const last = progress[0];
            const pesoDiff = first?.peso && last?.peso ? parseFloat(last.peso) - parseFloat(first.peso) : null;
            return (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-bold text-slate-900">Resumo do progresso</h2>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">Registros</p>
                    <p className="text-xl font-black text-slate-900">{progress.length}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">Variação de peso</p>
                    <p className={cn("text-xl font-black", pesoDiff === null ? "text-slate-400" : pesoDiff < 0 ? "text-green-600" : "text-red-500")}>
                      {pesoDiff !== null ? `${pesoDiff > 0 ? "+" : ""}${pesoDiff.toFixed(1)} kg` : "—"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">Primeiro registro</p>
                    <p className="text-base font-bold text-slate-900">{first?.data ? (() => { const [y, m, d] = first.data.split("-"); return `${d}/${m}/${y}`; })() : "—"}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="bg-gradient-to-br from-primary/5 to-indigo-50 border border-primary/20 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900 mb-1">Recomendações com IA em breve</p>
                <p className="text-sm text-slate-600">
                  Em breve, o sistema vai analisar automaticamente seus dados, identificar padrões e gerar recomendações personalizadas com base em IA. A estrutura já está pronta para receber essa funcionalidade.
                </p>
              </div>
            </div>
          </div>
        </div>
      </PerformanceLayout>
    </AppLayout>
  );
}
