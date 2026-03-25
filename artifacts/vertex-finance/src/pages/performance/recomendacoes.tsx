import { useQuery } from "@tanstack/react-query";
import { PerformanceLayout } from "@/components/layout/PerformanceLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Lightbulb, Target, Activity, AlertTriangle, CheckCircle,
  ArrowRight, Zap, TrendingDown, TrendingUp, Minus, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/lib/api-base";

/* ─── Reference Ranges ───────────────────────────────────────────────── */
const MARCADORES_REF: Record<string, { min?: number; max?: number; unit: string; lowerBetter?: boolean; label?: string }> = {
  "Hemoglobina":         { min: 13.0, max: 17.0, unit: "g/dL" },
  "Hematócrito":         { min: 40.0, max: 50.0, unit: "%" },
  "Eritrócitos":         { min: 4.50, max: 5.50, unit: "10⁶/µL" },
  "Glicose":             { min: 70, max: 99, unit: "mg/dL", label: "Glicemia" },
  "Insulina":            { min: 2.6, max: 24.9, unit: "µUI/mL" },
  "HOMA-IR":             { max: 2.5, unit: "", lowerBetter: true },
  "Colesterol total":    { max: 190, unit: "mg/dL", lowerBetter: true },
  "LDL":                 { max: 130, unit: "mg/dL", lowerBetter: true },
  "HDL":                 { min: 40, unit: "mg/dL" },
  "Triglicerídeos":      { max: 150, unit: "mg/dL", lowerBetter: true },
  "Vitamina D":          { min: 30, max: 100, unit: "ng/mL" },
  "TSH":                 { min: 0.4, max: 4.0, unit: "µUI/mL" },
  "T3 livre":            { min: 2.3, max: 4.2, unit: "pg/mL" },
  "T4 livre":            { min: 0.8, max: 1.8, unit: "ng/dL" },
  "Testosterona total":  { min: 300, max: 1000, unit: "ng/dL" },
  "Estradiol":           { min: 10, max: 40, unit: "pg/mL" },
  "IGF-1":               { min: 115, max: 307, unit: "ng/mL" },
  "Cortisol":            { min: 6.2, max: 19.4, unit: "µg/dL" },
  "PCR ultra-sensível":  { max: 0.10, unit: "mg/dL", lowerBetter: true, label: "Inflamação (PCR)" },
  "Leucócitos":          { min: 4000, max: 10000, unit: "/µL" },
  "Plaquetas":           { min: 150000, max: 450000, unit: "/µL" },
  "Ferritina":           { min: 12, max: 300, unit: "ng/mL" },
  "Ferro sérico":        { min: 60, max: 180, unit: "µg/dL" },
  "Creatinina":          { min: 0.7, max: 1.2, unit: "mg/dL" },
  "TGO (AST)":           { max: 40, unit: "U/L", lowerBetter: true },
  "TGP (ALT)":           { max: 41, unit: "U/L", lowerBetter: true },
  "PSA total":           { max: 4.0, unit: "ng/mL", lowerBetter: true },
};

function calcStatus(valor: number, ref: { min?: number; max?: number }): "normal" | "baixo" | "alto" {
  if (ref.min !== undefined && valor < ref.min) return "baixo";
  if (ref.max !== undefined && valor > ref.max) return "alto";
  return "normal";
}

/* ─── Gap analysis ───────────────────────────────────────────────────── */
type Gap = { campo: string; atual?: string; objetivo?: string; gap: number; prioridade: "alta" | "media" | "baixa"; recomendacao: string };

function calcBodyGaps(current: any, goal: any): Gap[] {
  const gaps: Gap[] = [];
  if (goal?.metaPeso && current?.peso) {
    const metaPeso = parseFloat(goal.metaPeso);
    const pesoAtual = parseFloat(current.peso);
    const diff = pesoAtual - metaPeso;
    if (Math.abs(diff) > 0.5) {
      gaps.push({
        campo: "Peso corporal",
        atual: `${pesoAtual.toFixed(1)} kg`,
        objetivo: `${metaPeso.toFixed(1)} kg`,
        gap: Math.abs(diff),
        prioridade: Math.abs(diff) > 10 ? "alta" : Math.abs(diff) > 5 ? "media" : "baixa",
        recomendacao: diff > 0
          ? `Reduzir ${diff.toFixed(1)} kg. Aplique déficit calórico de 300–500 kcal/dia com treino de força 4x/semana e proteína elevada (2–2.5g/kg).`
          : `Ganhar ${Math.abs(diff).toFixed(1)} kg. Superávit moderado (200–400 kcal/dia) com alto consumo proteico e treino de hipertrofia.`,
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
          ? `Reduzir ${diff.toFixed(1)}% de gordura. Combine déficit calórico com cardio aeróbico (3x/semana) e treino de força (4x/semana).`
          : "Percentual abaixo do objetivo. Avalie se o objetivo ainda é adequado para sua fase.",
      });
    }
  }
  return gaps;
}

const PRIORIDADE_STYLES = {
  alta:  { badge: "bg-red-100 text-red-700 border-red-200", icon: "text-red-500" },
  media: { badge: "bg-amber-100 text-amber-700 border-amber-200", icon: "text-amber-500" },
  baixa: { badge: "bg-green-100 text-green-700 border-green-200", icon: "text-green-500" },
};

const PLANO_BASE = [
  { semana: "Semanas 1–2", titulo: "Estabelecer base", descricao: "Configure nutrição, rotina de treinos e comece a registrar progresso semanalmente.", color: "border-l-blue-400 bg-blue-50/50", tag: "Fundação", tagColor: "bg-blue-100 text-blue-700" },
  { semana: "Semanas 3–6", titulo: "Execução e ajustes", descricao: "Siga o plano consistentemente. Ajuste calorias e carga de treino com base nos dados registrados.", color: "border-l-primary bg-primary/5", tag: "Progresso", tagColor: "bg-primary/10 text-primary" },
  { semana: "Semanas 7–8", titulo: "Avaliação de meio de ciclo", descricao: "Faça nova avaliação corporal. Compare com a baseline. Decida se mantém, intensifica ou ajusta o plano.", color: "border-l-purple-400 bg-purple-50/50", tag: "Revisão", tagColor: "bg-purple-100 text-purple-700" },
  { semana: "Semanas 9–12", titulo: "Intensificação e refinamento", descricao: "Com a base sólida, intensifique progressivamente. Foco nos pontos identificados na revisão.", color: "border-l-green-400 bg-green-50/50", tag: "Evolução", tagColor: "bg-green-100 text-green-700" },
];

/* ─── Marker Analysis Section ────────────────────────────────────────── */
function MarkerAnalysis({ evolution }: { evolution: Record<string, any[]> }) {
  if (!evolution || Object.keys(evolution).length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-slate-900">Análise de Exames</h2>
        </div>
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">Nenhum marcador registrado ainda. Acesse Exames e adicione os valores dos seus resultados laboratoriais.</p>
        </div>
      </div>
    );
  }

  const latest: { marcador: string; valor: number; status: string; unit: string; ref: any }[] = [];
  for (const [marcador, vals] of Object.entries(evolution)) {
    if (!vals.length) continue;
    const sorted = [...vals].sort((a, b) => (a.data ?? "").localeCompare(b.data ?? "")).reverse();
    const latestVal = sorted[0];
    const ref = MARCADORES_REF[marcador];
    const valor = parseFloat(latestVal.valor);
    const status = ref ? calcStatus(valor, ref) : latestVal.status;
    latest.push({ marcador, valor, status, unit: latestVal.unidade || ref?.unit || "", ref });
  }

  const normais = latest.filter(m => m.status === "normal");
  const altos = latest.filter(m => m.status === "alto");
  const baixos = latest.filter(m => m.status === "baixo");
  const problemas = [...altos, ...baixos];

  function MarkerBadge({ item }: { item: typeof latest[0] }) {
    const ref = item.ref ?? MARCADORES_REF[item.marcador];
    const refStr = ref?.min !== undefined && ref?.max !== undefined
      ? `${ref.min} – ${ref.max}`
      : ref?.max !== undefined ? `< ${ref.max}` : ref?.min !== undefined ? `> ${ref.min}` : "—";

    const styles = {
      normal: "bg-emerald-50 border-emerald-100",
      alto: "bg-red-50 border-red-100",
      baixo: "bg-blue-50 border-blue-100",
    };
    const dotStyles = { normal: "bg-emerald-400", alto: "bg-red-400", baixo: "bg-blue-400" };
    const labelStyles = { normal: "text-emerald-700", alto: "text-red-700", baixo: "text-blue-700" };
    const valueStyles = { normal: "text-slate-900", alto: "text-red-700 font-black", baixo: "text-blue-700 font-black" };

    return (
      <div className={cn("border rounded-xl p-3", styles[item.status as keyof typeof styles])}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-xs font-semibold text-slate-700 leading-tight">{item.marcador}</p>
          <div className="flex items-center gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotStyles[item.status as keyof typeof dotStyles])} />
            <span className={cn("text-xs font-bold capitalize", labelStyles[item.status as keyof typeof labelStyles])}>
              {item.status === "normal" ? "Normal" : item.status === "alto" ? "Acima" : "Abaixo"}
            </span>
          </div>
        </div>
        <p className={cn("text-base font-bold", valueStyles[item.status as keyof typeof valueStyles])}>
          {item.valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
          <span className="text-xs font-normal text-slate-400 ml-1">{item.unit}</span>
        </p>
        <p className="text-xs text-slate-400 mt-0.5">Ref: {refStr}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-slate-900">Análise de Exames</h2>
        </div>
        <div className="flex gap-2">
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-semibold">{normais.length} normais</span>
          {problemas.length > 0 && (
            <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full font-semibold">{problemas.length} atenção</span>
          )}
        </div>
      </div>

      {/* Attention items */}
      {problemas.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Pontos de atenção</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {problemas.map(item => <MarkerBadge key={item.marcador} item={item} />)}
          </div>
        </div>
      )}

      {/* Good items */}
      {normais.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Pontos fortes</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {normais.map(item => <MarkerBadge key={item.marcador} item={item} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function RecomendacoesPage() {
  const { data: goals = [] } = useQuery<any[]>({
    queryKey: ["perf-goals"],
    queryFn: () => fetch(`${getApiBase()}/api/performance/goals`).then(r => r.json()),
  });

  const { data: states = [] } = useQuery<any[]>({
    queryKey: ["perf-state"],
    queryFn: () => fetch(`${getApiBase()}/api/performance/current-state`).then(r => r.json()),
  });

  const { data: progress = [] } = useQuery<any[]>({
    queryKey: ["perf-progress"],
    queryFn: () => fetch(`${getApiBase()}/api/performance/progress`).then(r => r.json()),
  });

  const { data: evolution = {} } = useQuery<Record<string, any[]>>({
    queryKey: ["perf-evolution"],
    queryFn: () => fetch(`${getApiBase()}/api/performance/exam-markers/evolution`).then(r => r.json()),
  });

  const latestGoal = goals[0] ?? null;
  const latestState = states[0] ?? null;
  const bodyGaps = latestGoal && latestState ? calcBodyGaps(latestState, latestGoal) : [];

  const completedItems = [goals.length > 0, states.length > 0, false, false, false, false];

  const CHECKLIST = [
    { item: "Objetivo definido", sub: "Acesse Objetivo e preencha sua meta" },
    { item: "Avaliação inicial registrada", sub: "Acesse Avaliação e registre o ponto de partida" },
    { item: "Plano de treino criado", sub: "Acesse Treinos e monte sua divisão semanal" },
    { item: "Estratégia nutricional definida", sub: "Acesse Nutrição e configure seu plano alimentar" },
    { item: "Protocolos cadastrados", sub: "Acesse Protocolos e registre suplementos e medicamentos" },
    { item: "Exames com marcadores", sub: "Acesse Exames e registre seus resultados laboratoriais" },
  ];

  return (
    <AppLayout title="Performance">
      <PerformanceLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Recomendações</h1>
          <p className="text-slate-500 text-sm mt-1">Análise integrada e plano de ação</p>
        </div>

        <div className="space-y-5">
          {/* Marker Analysis — now primary section */}
          <MarkerAnalysis evolution={evolution} />

          {/* Body gap analysis */}
          {(latestGoal || latestState) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-slate-900">Físico: Atual vs. Objetivo</h2>
              </div>

              {!latestGoal || !latestState ? (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-800">
                    {!latestGoal ? "Defina seu objetivo para ver a análise comparativa." : "Registre sua avaliação atual para ver o gap."}
                  </p>
                </div>
              ) : bodyGaps.length === 0 ? (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <p className="text-sm text-green-800 font-semibold">Parabéns! Você está dentro dos seus objetivos definidos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bodyGaps.map((gap, i) => {
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
                            {gap.prioridade === "alta" ? "Alta prioridade" : gap.prioridade === "media" ? "Média" : "Baixa"}
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

          {/* Checklist */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-slate-900">Checklist de configuração</h2>
            </div>
            <div className="space-y-2">
              {CHECKLIST.map((item, i) => {
                const done = completedItems[i];
                return (
                  <div key={i} className={cn("flex items-center gap-3 p-3 rounded-xl", done ? "bg-green-50" : "bg-slate-50")}>
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", done ? "bg-green-500" : "bg-slate-200")}>
                      {done && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className={cn("text-sm font-semibold", done ? "text-green-800 line-through opacity-60" : "text-slate-800")}>{item.item}</p>
                      {!done && <p className="text-xs text-slate-400">{item.sub}</p>}
                    </div>
                    {done && <span className="text-xs font-semibold text-green-600">Concluído</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 12-week plan */}
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
                    <p className="text-xs text-slate-500 mb-1">Início</p>
                    <p className="text-base font-bold text-slate-900">{first?.data ? (() => { const [y, m, d] = first.data.split("-"); return `${d}/${m}/${y}`; })() : "—"}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* AI future */}
          <div className="bg-gradient-to-br from-primary/5 to-indigo-50 border border-primary/20 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900 mb-1">Recomendações com IA em breve</p>
                <p className="text-sm text-slate-600">
                  Em breve, o sistema vai cruzar automaticamente exames, dieta, treinos e progresso para gerar recomendações personalizadas com base em IA. A estrutura de dados já está completamente preparada.
                </p>
              </div>
            </div>
          </div>
        </div>
      </PerformanceLayout>
    </AppLayout>
  );
}
