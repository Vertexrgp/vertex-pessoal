import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { sugestoesApi, type Sugestao } from "@/lib/sugestoes-api";
import {
  Sparkles, RefreshCw, CheckCircle2, X, Brain, Zap,
  CalendarDays, DollarSign, Activity, Rocket,
  BarChart2, ChevronDown, ChevronUp, Loader2,
  AlertCircle, TrendingUp, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MODULO_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  agenda:       { label: "Agenda",      icon: CalendarDays, color: "text-sky-600",     bg: "bg-sky-50",     border: "border-sky-200" },
  financeiro:   { label: "Financeiro",  icon: DollarSign,   color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  performance:  { label: "Performance", icon: Activity,     color: "text-rose-600",    bg: "bg-rose-50",    border: "border-rose-200" },
  crescimento:  { label: "Crescimento", icon: Rocket,       color: "text-indigo-600",  bg: "bg-indigo-50",  border: "border-indigo-200" },
};

const CONFIANCA_META: Record<string, { label: string; dot: string }> = {
  alta:  { label: "Alta confiança",  dot: "bg-green-500" },
  media: { label: "Média confiança", dot: "bg-amber-400" },
  baixa: { label: "Baixa confiança", dot: "bg-slate-400" },
};

function SugestaoCard({ s, onAplicar, onIgnorar, loading }: {
  s: Sugestao;
  onAplicar: () => void;
  onIgnorar: () => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = MODULO_META[s.modulo] ?? MODULO_META.agenda;
  const conf = CONFIANCA_META[s.confianca] ?? CONFIANCA_META.media;
  const ModuloIcon = meta.icon;

  return (
    <div className={cn(
      "bg-white rounded-2xl border shadow-sm transition-all",
      s.status === "pendente" ? meta.border : "border-slate-200 opacity-60",
    )}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", meta.bg)}>
              <ModuloIcon className={cn("w-4 h-4", meta.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", meta.bg, meta.color)}>
                  {meta.label}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <span className={cn("w-1.5 h-1.5 rounded-full", conf.dot)} />
                  {conf.label}
                </span>
                {s.status !== "pendente" && (
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    s.status === "aplicada" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                  )}>
                    {s.status === "aplicada" ? "✓ Aplicada" : "× Ignorada"}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-slate-800 text-sm leading-snug">{s.titulo}</h3>
            </div>
          </div>

          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expandible details */}
        {expanded && (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <div className="flex gap-2.5">
              <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Explicação</p>
                <p className="text-sm text-slate-700">{s.explicacao}</p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <Brain className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Motivo</p>
                <p className="text-sm text-slate-600">{s.motivo}</p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Impacto esperado</p>
                <p className="text-sm text-slate-600">{s.impacto}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {s.status === "pendente" && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={onAplicar}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Aplicar
            </button>
            <button
              onClick={onIgnorar}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Ignorar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SugestoesPage() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<"pendente" | "aplicada" | "ignorada" | "todas">("pendente");
  const [gerandoMsg, setGerandoMsg] = useState<string | null>(null);

  const { data: sugestoes = [], isLoading } = useQuery<Sugestao[]>({
    queryKey: ["sugestoes", filtro],
    queryFn: () => filtro === "todas" ? sugestoesApi.list() : sugestoesApi.list(filtro),
    refetchOnWindowFocus: false,
  });

  const { data: comportamento } = useQuery({
    queryKey: ["comportamento"],
    queryFn: sugestoesApi.comportamento,
  });

  const gerar = useMutation({
    mutationFn: sugestoesApi.gerar,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sugestoes"] });
      setGerandoMsg(
        data.geradas > 0
          ? `${data.geradas} nova(s) sugestão(ões) gerada(s) nos módulos: ${data.categorias.join(", ")}`
          : "Nenhuma sugestão nova — tudo está em ordem!"
      );
      setTimeout(() => setGerandoMsg(null), 5000);
    },
  });

  const aplicar = useMutation({
    mutationFn: sugestoesApi.aplicar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sugestoes"] });
      qc.invalidateQueries({ queryKey: ["comportamento"] });
    },
  });

  const ignorar = useMutation({
    mutationFn: sugestoesApi.ignorar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sugestoes"] });
      qc.invalidateQueries({ queryKey: ["comportamento"] });
    },
  });

  const pendentes = sugestoes.filter(s => s.status === "pendente").length;
  const aplicadas = sugestoes.filter(s => s.status === "aplicada").length;
  const ignoradas = sugestoes.filter(s => s.status === "ignorada").length;

  const filtros: { key: typeof filtro; label: string; count?: number }[] = [
    { key: "pendente",  label: "Pendentes",  count: pendentes },
    { key: "aplicada",  label: "Aplicadas",  count: aplicadas },
    { key: "ignorada",  label: "Ignoradas",  count: ignoradas },
    { key: "todas",     label: "Todas" },
  ];

  return (
    <AppLayout title="Sugestões Inteligentes">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header card */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-indigo-200" />
                <span className="text-indigo-200 text-sm font-medium">Motor de análise comportamental</span>
              </div>
              <h1 className="text-2xl font-bold mb-1">Sugestões Inteligentes</h1>
              <p className="text-indigo-200 text-sm">
                O sistema analisa seus dados, aprende com seu padrão e sugere melhorias.<br />
                <strong className="text-white">Nenhuma mudança é feita sem sua aprovação explícita.</strong>
              </p>
            </div>
            <button
              onClick={() => gerar.mutate()}
              disabled={gerar.isPending}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl transition-colors flex-shrink-0 border border-white/30"
            >
              {gerar.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
              Analisar agora
            </button>
          </div>

          {/* Stats */}
          {comportamento && (
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{comportamento.total}</div>
                <div className="text-xs text-indigo-200">Interações</div>
              </div>
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{comportamento.aceitas}</div>
                <div className="text-xs text-indigo-200">Aceitas</div>
              </div>
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{comportamento.taxaAceitacao}%</div>
                <div className="text-xs text-indigo-200">Taxa de aceite</div>
              </div>
            </div>
          )}
        </div>

        {/* Feedback de geração */}
        {gerandoMsg && (
          <div className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl px-4 py-3 text-sm">
            <Zap className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            {gerandoMsg}
          </div>
        )}

        {/* Como funciona — só aparece se não há sugestões ainda */}
        {sugestoes.length === 0 && !isLoading && filtro === "pendente" && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-500" />
              Como o sistema aprende
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="flex gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>Analisa tarefas postergadas, orçamentos estourados, checkpoints atrasados e progresso físico</span>
              </div>
              <div className="flex gap-2">
                <Brain className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>Aprende com quais sugestões você aceita ou ignora para melhorar a qualidade das próximas</span>
              </div>
              <div className="flex gap-2">
                <Zap className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>Aumenta a confiança das sugestões de módulos onde você mais aceita recomendações</span>
              </div>
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>Nunca altera nada diretamente — toda ação depende da sua aprovação</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={() => gerar.mutate()}
                disabled={gerar.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {gerar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Gerar primeiras sugestões
              </button>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        {(sugestoes.length > 0 || filtro !== "pendente") && (
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {filtros.map(f => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all",
                  filtro === f.key
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {f.label}
                {f.count !== undefined && f.count > 0 && (
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full font-bold",
                    filtro === f.key ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"
                  )}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm">Carregando sugestões...</span>
          </div>
        )}

        {/* Lista */}
        {!isLoading && sugestoes.length > 0 && (
          <div className="space-y-3">
            {sugestoes.map(s => (
              <SugestaoCard
                key={s.id}
                s={s}
                onAplicar={() => aplicar.mutate(s.id)}
                onIgnorar={() => ignorar.mutate(s.id)}
                loading={aplicar.isPending || ignorar.isPending}
              />
            ))}
          </div>
        )}

        {/* Empty state (filtro específico sem resultados) */}
        {!isLoading && sugestoes.length === 0 && filtro !== "pendente" && (
          <div className="text-center py-12 text-slate-400">
            <Sparkles className="w-8 h-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">Nenhuma sugestão {filtro === "aplicada" ? "aplicada" : "ignorada"} ainda</p>
          </div>
        )}

        {/* Aviso de segurança */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Garantia de controle total:</strong> o sistema nunca altera agenda, planejamento, metas ou dados automaticamente.
            Toda sugestão aguarda sua aprovação explícita antes de qualquer ação.
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
