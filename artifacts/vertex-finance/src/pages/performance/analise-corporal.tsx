import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PerformanceLayout } from "@/components/layout/PerformanceLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { getApiBase } from "@/lib/api-base";
import { cn } from "@/lib/utils";
import {
  Brain, Sparkles, Camera, Target, Dumbbell, TrendingUp, TrendingDown,
  AlertTriangle, ChevronRight, Zap, BarChart3, Calendar, RefreshCw,
  CheckCircle2, Star, ArrowRight, Shield, Flame, Activity,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Analise = {
  id: number;
  status: "pending" | "done" | "error";
  erro?: string | null;
  createdAt: string;
  corpoAtual?: {
    resumo: string;
    pontoFortes: string[];
    proporcao: string;
    postura: string;
    gruposDestaques: string[];
    acumuloGordura: string;
  } | null;
  corpoDesejado?: {
    resumo: string;
    silhueta: string;
    gruposDestacados: string[];
    definicao: string;
    caracteristicas: string[];
  } | null;
  comparacao?: {
    diferencasPrincipais: string[];
    precisaEvolucao: string[];
    jaRelativamenteBom: string[];
  } | null;
  prioridades?: {
    rank: number;
    grupo: string;
    descricao: string;
  }[] | null;
  estrategia?: {
    tipo: string;
    titulo: string;
    explicacao: string;
  } | null;
  treino?: {
    frequenciaSemanal: number;
    divisao: { dia: string; foco: string; musculos: string[] }[];
    destaquesVolume: string[];
  } | null;
  observacoes?: string[] | null;
};

type BodyPhoto = {
  id: number;
  tipo: string;
  imageUrl: string | null;
  objectPath: string | null;
  imageData: string | null;
  createdAt?: string;
};

const ESTRATEGIA_MAP: Record<string, { label: string; color: string; bg: string; icon: typeof Flame }> = {
  cutting:          { label: "Cutting",                    color: "text-orange-600", bg: "bg-orange-50 border-orange-200",   icon: TrendingDown },
  bulking:          { label: "Bulking",                    color: "text-blue-600",   bg: "bg-blue-50 border-blue-200",       icon: TrendingUp },
  recomposicao:     { label: "Recomposição Corporal",      color: "text-violet-600", bg: "bg-violet-50 border-violet-200",   icon: RefreshCw },
  ganho_controlado: { label: "Ganho com Controle",         color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-200", icon: TrendingUp },
  reducao_massa:    { label: "Redução com Preservação",    color: "text-amber-600",  bg: "bg-amber-50 border-amber-200",     icon: Flame },
};

const DIA_COLORS = ["bg-indigo-500", "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-slate-500"];

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function SectionTitle({ icon: Icon, title, subtitle, color = "text-indigo-600", bg = "bg-indigo-100" }: {
  icon: typeof Brain; title: string; subtitle?: string; color?: string; bg?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", bg)}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

function PhotoGrid({ photos, label }: { photos: BodyPhoto[]; label: string }) {
  if (!photos.length) return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
      <Camera className="w-8 h-8 text-slate-200" />
      <p className="text-xs text-slate-400">Sem fotos de {label}</p>
    </div>
  );
  return (
    <div className={cn("grid gap-2", photos.length === 1 ? "grid-cols-1" : photos.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
      {photos.map(p => (
        <div key={p.id} className="aspect-[2/3] rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <img src={p.imageUrl ?? p.imageData ?? ""} alt={p.tipo} className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}

function TagList({ items, color = "bg-indigo-100 text-indigo-700" }: { items: string[]; color?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={i} className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", color)}>{item}</span>
      ))}
    </div>
  );
}

function BulletList({ items, icon: Icon = ChevronRight, iconColor = "text-indigo-400" }: {
  items: string[]; icon?: typeof ChevronRight; iconColor?: string;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <Icon className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", iconColor)} />
          <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function AnaliseCorporal() {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: analise, isLoading } = useQuery<Analise | null>({
    queryKey: ["corpo-analise"],
    queryFn: () => fetch(`${getApiBase()}/api/performance/corpo-analise`).then(r => r.json()),
    refetchInterval: generating ? 3000 : false,
  });

  const { data: photos = [] } = useQuery<BodyPhoto[]>({
    queryKey: ["body-photos"],
    queryFn: () => fetch(`${getApiBase()}/api/performance/body-photos`).then(r => r.json()),
  });

  const gerarAnalise = useMutation({
    mutationFn: () => fetch(`${getApiBase()}/api/performance/corpo-analise`, { method: "POST" }).then(r => {
      if (!r.ok) throw new Error("Falha na análise");
      return r.json();
    }),
    onMutate: () => setGenerating(true),
    onSuccess: () => {
      setGenerating(false);
      qc.invalidateQueries({ queryKey: ["corpo-analise"] });
    },
    onError: () => setGenerating(false),
  });

  const currentPhotos = photos.filter(p => p.tipo.startsWith("atual_"));
  const refPhotos = photos.filter(p => p.tipo === "objetivo");
  const hasPhotos = currentPhotos.length > 0 || refPhotos.length > 0;
  const hasAnalise = analise?.status === "done";

  const estrategiaInfo = analise?.estrategia
    ? ESTRATEGIA_MAP[analise.estrategia.tipo] ?? ESTRATEGIA_MAP.recomposicao
    : null;

  return (
    <AppLayout>
      <PerformanceLayout>

        {/* ─── Header ─── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                <Brain className="w-4.5 h-4.5 text-white" />
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Análise Corporal IA</h1>
            </div>
            <p className="text-sm text-slate-500 ml-10">
              Diagnóstico visual, priorização muscular e estratégia de treino gerados por inteligência artificial
            </p>
          </div>
          <button
            onClick={() => gerarAnalise.mutate()}
            disabled={generating}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm",
              generating
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-indigo-200"
            )}
          >
            {generating ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Analisando...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> {hasAnalise ? "Reanalisar" : "Gerar Análise"}</>
            )}
          </button>
        </div>

        {/* ─── Loading ─── */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-slate-500">Carregando análise...</p>
            </div>
          </div>
        )}

        {/* ─── No analysis yet ─── */}
        {!isLoading && !analise && !generating && (
          <div className="max-w-2xl mx-auto">

            {/* Intro card */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-8 text-white mb-6 shadow-xl shadow-indigo-200">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-5">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-black mb-2">Diagnóstico Corporal com IA</h2>
              <p className="text-indigo-200 text-sm leading-relaxed mb-6">
                A IA analisa suas fotos e dados para gerar um diagnóstico visual completo, identificar pontos fortes e fracos, e montar uma estratégia de treino personalizada.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { icon: Camera, label: "Análise visual das fotos" },
                  { icon: Target, label: "Priorização muscular" },
                  { icon: Zap, label: "Estratégia corporal" },
                  { icon: Dumbbell, label: "Treino personalizado" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5">
                    <Icon className="w-4 h-4 text-indigo-200" />
                    <span className="text-xs font-semibold text-indigo-100">{label}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => gerarAnalise.mutate()}
                className="w-full py-3 rounded-xl bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-colors shadow-sm"
              >
                Gerar Minha Análise Corporal
              </button>
            </div>

            {/* Photo status */}
            {!hasPhotos && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Sem fotos cadastradas</p>
                  <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                    Para uma análise mais precisa, adicione fotos do seu físico atual e fotos de referência na aba "Objetivo Físico". A análise pode ser feita apenas com dados numéricos, mas as fotos tornam o diagnóstico muito mais completo.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Generating spinner ─── */}
        {generating && (
          <div className="max-w-xl mx-auto py-12">
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-5">
                <Brain className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">Analisando seu corpo...</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                A IA está examinando suas fotos e dados. Isso pode levar alguns segundos.
              </p>
              <div className="mt-6 space-y-2">
                {["Analisando físico atual", "Analisando físico desejado", "Gerando diagnóstico", "Montando estratégia"].map((step, i) => (
                  <div key={step} className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Error state ─── */}
        {!generating && analise?.status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Erro na análise</p>
              <p className="text-xs text-red-600 mt-1">{analise.erro ?? "Erro desconhecido"}</p>
              <button onClick={() => gerarAnalise.mutate()} className="mt-2 text-xs font-semibold text-red-700 underline">
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* ─── Analysis Results ─── */}
        {!generating && hasAnalise && analise && (
          <div className="space-y-6">

            {/* ─── Timestamp ─── */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              Análise gerada em {new Date(analise.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </div>

            {/* ─── ROW 1: Fotos lado a lado ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <SectionTitle icon={Camera} title="Físico Atual" subtitle="Suas fotos de referência" color="text-blue-600" bg="bg-blue-100" />
                <PhotoGrid
                  photos={currentPhotos}
                  label="físico atual"
                />
                {analise.corpoAtual && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-slate-700 leading-relaxed">{analise.corpoAtual.resumo}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <p className="text-slate-400 font-semibold mb-1">Proporção</p>
                        <p className="text-slate-700">{analise.corpoAtual.proporcao}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <p className="text-slate-400 font-semibold mb-1">Postura</p>
                        <p className="text-slate-700">{analise.corpoAtual.postura}</p>
                      </div>
                    </div>
                    {analise.corpoAtual.acumuloGordura && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">Acúmulo de Gordura</p>
                        <p className="text-xs text-amber-800">{analise.corpoAtual.acumuloGordura}</p>
                      </div>
                    )}
                    {analise.corpoAtual.pontoFortes?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Pontos Fortes</p>
                        <TagList items={analise.corpoAtual.pontoFortes} color="bg-emerald-100 text-emerald-700" />
                      </div>
                    )}
                    {analise.corpoAtual.gruposDestaques?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Grupos Mais Desenvolvidos</p>
                        <TagList items={analise.corpoAtual.gruposDestaques} color="bg-blue-100 text-blue-700" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <SectionTitle icon={Target} title="Físico Desejado" subtitle="Seu objetivo visual" color="text-violet-600" bg="bg-violet-100" />
                <PhotoGrid
                  photos={refPhotos}
                  label="referência"
                />
                {analise.corpoDesejado && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-slate-700 leading-relaxed">{analise.corpoDesejado.resumo}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <p className="text-slate-400 font-semibold mb-1">Silhueta</p>
                        <p className="text-slate-700">{analise.corpoDesejado.silhueta}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <p className="text-slate-400 font-semibold mb-1">Definição</p>
                        <p className="text-slate-700">{analise.corpoDesejado.definicao}</p>
                      </div>
                    </div>
                    {analise.corpoDesejado.gruposDestacados?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Grupos em Destaque</p>
                        <TagList items={analise.corpoDesejado.gruposDestacados} color="bg-violet-100 text-violet-700" />
                      </div>
                    )}
                    {analise.corpoDesejado.caracteristicas?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Características do Objetivo</p>
                        <TagList items={analise.corpoDesejado.caracteristicas} color="bg-indigo-100 text-indigo-700" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ─── ROW 2: Comparação ─── */}
            {analise.comparacao && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <SectionTitle icon={BarChart3} title="Comparação: Atual vs. Objetivo" subtitle="O que muda entre seu corpo atual e o desejado" color="text-slate-600" bg="bg-slate-100" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Principais Diferenças</p>
                    </div>
                    <BulletList items={analise.comparacao.diferencasPrincipais} icon={ArrowRight} iconColor="text-slate-400" />
                  </div>
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-rose-500" />
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-500">Precisa Evoluir</p>
                    </div>
                    <BulletList items={analise.comparacao.precisaEvolucao} icon={TrendingUp} iconColor="text-rose-400" />
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">Já Relativamente Bom</p>
                    </div>
                    <BulletList items={analise.comparacao.jaRelativamenteBom} icon={CheckCircle2} iconColor="text-emerald-400" />
                  </div>
                </div>
              </div>
            )}

            {/* ─── ROW 3: Prioridades + Estratégia ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">

              {/* Prioridades */}
              {analise.prioridades && analise.prioridades.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <SectionTitle icon={Star} title="Priorização Muscular" subtitle="Grupos para focar na evolução" color="text-amber-600" bg="bg-amber-100" />
                  <div className="space-y-3">
                    {analise.prioridades.map((p, i) => (
                      <div key={p.rank} className={cn(
                        "flex gap-3 p-3 rounded-xl border transition-all",
                        i === 0 ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200" :
                        i === 1 ? "bg-slate-50 border-slate-200" :
                        "bg-white border-slate-100 hover:bg-slate-50"
                      )}>
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0",
                          i === 0 ? "bg-amber-500 text-white" :
                          i === 1 ? "bg-slate-400 text-white" :
                          i === 2 ? "bg-amber-700 text-white" :
                          "bg-slate-200 text-slate-600"
                        )}>
                          {p.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800">{p.grupo}</p>
                          <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{p.descricao}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Estratégia */}
              {analise.estrategia && estrategiaInfo && (
                <div className={cn("border rounded-2xl p-5 shadow-sm flex flex-col", estrategiaInfo.bg)}>
                  <SectionTitle
                    icon={estrategiaInfo.icon}
                    title="Estratégia Corporal"
                    subtitle="Abordagem recomendada"
                    color={estrategiaInfo.color}
                    bg="bg-white/60"
                  />
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-white">
                      <div className={cn("text-xs font-bold uppercase tracking-wider mb-1", estrategiaInfo.color)}>
                        {estrategiaInfo.label}
                      </div>
                      <h3 className="text-lg font-black text-slate-900">{analise.estrategia.titulo}</h3>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed flex-1">{analise.estrategia.explicacao}</p>
                    <div className="flex items-center gap-2 bg-white/60 rounded-xl p-3">
                      <Shield className="w-4 h-4 text-slate-400" />
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Esta é uma recomendação baseada em análise visual e não substitui avaliação de profissional de saúde.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── ROW 4: Treino Sugerido ─── */}
            {analise.treino && (
              <div className="bg-slate-900 rounded-2xl p-5 shadow-sm shadow-slate-900/20">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Treino Sugerido</h2>
                      <p className="text-xs text-slate-400">Divisão semanal baseada na análise corporal</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-full">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-semibold text-indigo-300">{analise.treino.frequenciaSemanal}x / semana</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                  {analise.treino.divisao.map((d, i) => (
                    <div key={d.dia} className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <div className={cn("w-full h-1 rounded-full mb-3", DIA_COLORS[i % DIA_COLORS.length])} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{d.dia}</p>
                      <p className="text-xs font-semibold text-white mb-2 leading-tight">{d.foco}</p>
                      <div className="flex flex-wrap gap-1">
                        {d.musculos.map(m => (
                          <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300">{m}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {analise.treino.destaquesVolume && analise.treino.destaquesVolume.length > 0 && (
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Destaques de Volume</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {analise.treino.destaquesVolume.map((d, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Zap className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-slate-300 leading-relaxed">{d}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── ROW 5: Observações ─── */}
            {analise.observacoes && analise.observacoes.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 shadow-sm">
                <SectionTitle icon={AlertTriangle} title="Observações & Alertas" subtitle="Pontos de atenção da análise" color="text-amber-600" bg="bg-amber-100" />
                <ul className="space-y-2.5">
                  {analise.observacoes.map((obs, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-amber-700">{i + 1}</span>
                      </div>
                      <p className="text-sm text-amber-900 leading-relaxed">{obs}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        )}
      </PerformanceLayout>
    </AppLayout>
  );
}
