import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Dumbbell,
  Flag,
  LayoutDashboard,
  RefreshCw,
  Rocket,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function getApiBase() {
  return import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/[^/]*$/, "");
}

async function fetchGlobal() {
  const res = await fetch(`${getApiBase()}/api/dashboard/global`);
  if (!res.ok) throw new Error("Erro ao carregar dashboard global");
  return res.json();
}

function useDashboardGlobal() {
  return useQuery({
    queryKey: ["dashboard-global"],
    queryFn: fetchGlobal,
    staleTime: 60_000,
  });
}

const DIAS_PT: Record<string, string> = {
  domingo: "Domingo",
  segunda: "Segunda",
  "terça": "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sábado: "Sábado",
};

const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${DIAS_PT[iso] ?? ""} ${d.getDate()} de ${MESES_PT[d.getMonth()]}`;
}

function fmtShortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

const nivelStyle = {
  critico: "bg-rose-50 border-rose-200 text-rose-700",
  atencao: "bg-amber-50 border-amber-200 text-amber-700",
  info: "bg-slate-50 border-slate-200 text-slate-600",
};

const nivelDot = {
  critico: "bg-rose-500",
  atencao: "bg-amber-400",
  info: "bg-slate-400",
};

const moduloIcon: Record<string, React.ElementType> = {
  agenda: CalendarDays,
  financeiro: Wallet,
  crescimento: Rocket,
  performance: Dumbbell,
};

type Alerta = {
  tipo: string;
  modulo: string;
  titulo: string;
  detalhe: string;
  nivel: "critico" | "atencao" | "info";
};

type Tarefa = {
  id: number;
  titulo: string;
  prioridade: string;
  status: string;
  isFoco: boolean;
  postergadaCount: number;
  diaSemana?: string | null;
};

type Evento = {
  id: number;
  titulo: string;
  data: string;
  hora?: string | null;
  local?: string | null;
};

type Meta = {
  id: number;
  titulo: string;
  tipo: string;
  progresso: number;
  prazo?: string | null;
  cor: string;
  atrasado: boolean;
  emRisco: boolean;
  proximoCheckpoint?: { titulo: string; data?: string | null; status: string } | null;
  totalCheckpoints: number;
  checkpointsConcluidos: number;
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  label,
  color,
  badge,
  link,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  badge?: number;
  link?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", color)} />
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</h2>
        {badge !== undefined && badge > 0 && (
          <span className="text-[10px] font-bold bg-rose-100 text-rose-600 rounded-full px-1.5 py-0.5 leading-none">
            {badge}
          </span>
        )}
      </div>
      {link && (
        <Link href={link} className="text-[10px] text-slate-400 hover:text-primary flex items-center gap-0.5 transition-colors">
          Ver tudo <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function TarefaChip({ tarefa }: { tarefa: Tarefa }) {
  const prioColors = {
    alta: "border-rose-200 bg-rose-50 text-rose-700",
    media: "border-amber-200 bg-amber-50 text-amber-700",
    baixa: "border-slate-200 bg-slate-50 text-slate-600",
  }[tarefa.prioridade] ?? "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className={cn("flex items-start gap-2 px-3 py-2 rounded-xl border text-xs font-medium", prioColors)}>
      {tarefa.isFoco
        ? <Zap className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        : <Circle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-60" />}
      <span className="leading-tight">{tarefa.titulo}</span>
      {tarefa.postergadaCount >= 2 && (
        <span className="ml-auto pl-2 text-[9px] font-bold opacity-70 flex-shrink-0">
          +{tarefa.postergadaCount}x
        </span>
      )}
    </div>
  );
}

function ProgressBar({ value, color = "bg-primary" }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5">
      <div
        className={cn("h-1.5 rounded-full transition-all duration-500", color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-5 text-slate-400">
      <CheckCircle2 className="w-7 h-7 mb-1.5 text-emerald-400" />
      <p className="text-xs text-center">{msg}</p>
    </div>
  );
}

// ─── Main blocks ──────────────────────────────────────────────────────────────

function BlocoHoje({ data }: { data: any }) {
  const { tarefasFoco, tarefasCriticas, tarefasPostergadas, proximosEventos } = data;

  const semFoco = tarefasFoco.length === 0;
  const allTarefas: Tarefa[] = [
    ...tarefasFoco,
    ...tarefasCriticas.filter((t: Tarefa) => !tarefasFoco.find((f: Tarefa) => f.id === t.id)),
  ].slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
      <SectionHeader icon={CalendarDays} label="Hoje" color="text-sky-600" link="/agenda" />

      {/* Foco do dia */}
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-500" /> Foco do dia
        </p>
        {allTarefas.length === 0 ? (
          <EmptyState msg="Nenhuma tarefa de foco definida" />
        ) : (
          <div className="flex flex-col gap-1.5">
            {allTarefas.map(t => <TarefaChip key={t.id} tarefa={t} />)}
          </div>
        )}
      </div>

      {/* Postergadas */}
      {tarefasPostergadas.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Postergadas
          </p>
          <div className="flex flex-col gap-1.5">
            {tarefasPostergadas.slice(0, 3).map((t: Tarefa) => <TarefaChip key={t.id} tarefa={t} />)}
          </div>
        </div>
      )}

      {/* Próximos eventos */}
      {proximosEventos.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Próximos eventos
          </p>
          <div className="flex flex-col gap-1.5">
            {proximosEventos.slice(0, 3).map((ev: Evento) => (
              <div key={ev.id} className="flex items-center gap-2 text-xs text-slate-600 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <span className="font-mono text-[10px] text-slate-400 w-8 flex-shrink-0">{fmtShortDate(ev.data)}</span>
                {ev.hora && <span className="text-[10px] font-medium text-primary bg-primary/5 px-1.5 py-0.5 rounded">{ev.hora}</span>}
                <span className="truncate">{ev.titulo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BlocoAlertas({ alertas }: { alertas: Alerta[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
      <SectionHeader
        icon={AlertTriangle}
        label="Alertas"
        color="text-amber-500"
        badge={alertas.filter(a => a.nivel === "critico").length}
      />

      {alertas.length === 0 ? (
        <EmptyState msg="Tudo em ordem — nenhum alerta ativo" />
      ) : (
        <div className="flex flex-col gap-2 mt-1">
          {alertas.map((alerta, i) => {
            const Icon = moduloIcon[alerta.modulo] ?? AlertTriangle;
            return (
              <div
                key={i}
                className={cn("rounded-xl border px-3 py-2.5 text-xs", nivelStyle[alerta.nivel])}
              >
                <div className="flex items-start gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1", nivelDot[alerta.nivel])} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-snug">{alerta.titulo}</p>
                    <p className="opacity-75 mt-0.5 leading-snug line-clamp-2">{alerta.detalhe}</p>
                  </div>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-50 mt-0.5" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BlocoFinanceiro({ data }: { data: any }) {
  const { saldoMes, totalIncome, totalExpenses, pctOrcamento, netWorth, estouradosCount } = data;
  const resultado = saldoMes;
  const positivo = resultado >= 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
      <SectionHeader icon={Wallet} label="Financeiro" color="text-emerald-600" link="/" />

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-[10px] text-slate-400 font-medium mb-1">Saldo do Mês</p>
          <p className={cn("text-base font-bold", positivo ? "text-emerald-600" : "text-rose-600")}>
            {formatCurrency(Math.abs(resultado))}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{positivo ? "positivo" : "negativo"}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-[10px] text-slate-400 font-medium mb-1">Patrimônio</p>
          <p className="text-base font-bold text-slate-800">{formatCurrency(netWorth)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">líquido</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] text-slate-400 font-medium">Gastos vs Orçamento</p>
          <span className={cn("text-[10px] font-bold", pctOrcamento > 100 ? "text-rose-600" : "text-emerald-600")}>
            {pctOrcamento}%
          </span>
        </div>
        <ProgressBar
          value={pctOrcamento}
          color={pctOrcamento > 100 ? "bg-rose-400" : pctOrcamento > 80 ? "bg-amber-400" : "bg-emerald-500"}
        />
        {estouradosCount > 0 && (
          <p className="text-[10px] text-rose-500 mt-1.5 font-medium">
            {estouradosCount} categoria{estouradosCount > 1 ? "s" : ""} acima do limite
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400">Receitas</p>
            <p className="font-semibold text-slate-700">{formatCurrency(totalIncome)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <TrendingDown className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400">Gastos</p>
            <p className="font-semibold text-slate-700">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlocoPerformance({ data }: { data: any }) {
  const { treinoHoje, diasComRegistro, ultimoProgresso, objetivoFisico, treinosAtivos } = data;
  const consistencia = Math.round((diasComRegistro / 7) * 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
      <SectionHeader icon={Dumbbell} label="Performance" color="text-rose-600" link="/performance/objetivo" />

      {/* Treino do dia */}
      <div className={cn("rounded-xl p-3 border", treinoHoje ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100")}>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Treino de hoje
        </p>
        {treinoHoje ? (
          <div>
            <p className="text-sm font-bold text-rose-700">
              {treinoHoje.letra && <span className="mr-1">{treinoHoje.letra}</span>}
              {treinoHoje.nome}
            </p>
            {treinoHoje.grupoMuscular && (
              <p className="text-[10px] text-rose-500 mt-0.5">{treinoHoje.grupoMuscular}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Descanso — sem treino agendado</p>
        )}
      </div>

      {/* Consistência */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] text-slate-400 font-medium">Registros (7 dias)</p>
          <span className={cn("text-[10px] font-bold", consistencia >= 80 ? "text-emerald-600" : consistencia >= 50 ? "text-amber-600" : "text-rose-500")}>
            {diasComRegistro}/7 dias
          </span>
        </div>
        <ProgressBar
          value={consistencia}
          color={consistencia >= 80 ? "bg-emerald-500" : consistencia >= 50 ? "bg-amber-400" : "bg-rose-400"}
        />
      </div>

      {/* Objetivo físico */}
      {objetivoFisico && (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Target className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400">Meta corporal</p>
            <p className="font-medium truncate">{objetivoFisico.objetivo}</p>
          </div>
        </div>
      )}

      {treinosAtivos > 0 && (
        <p className="text-[10px] text-slate-400">
          {treinosAtivos} treino{treinosAtivos > 1 ? "s" : ""} no protocolo ativo
        </p>
      )}
    </div>
  );
}

function BlocoDirecao({ data }: { data: any }) {
  const { metasAtivas, totalMetas, checkpointsAtrasados, metasEmRisco } = data;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
      <SectionHeader icon={Rocket} label="Direção" color="text-indigo-600" link="/crescimento/metas" />

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-indigo-50 rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-indigo-700">{totalMetas}</p>
          <p className="text-[10px] text-indigo-400">metas</p>
        </div>
        <div className={cn("rounded-xl p-2.5 text-center", checkpointsAtrasados > 0 ? "bg-rose-50" : "bg-emerald-50")}>
          <p className={cn("text-lg font-bold", checkpointsAtrasados > 0 ? "text-rose-600" : "text-emerald-600")}>{checkpointsAtrasados}</p>
          <p className={cn("text-[10px]", checkpointsAtrasados > 0 ? "text-rose-400" : "text-emerald-400")}>atrasados</p>
        </div>
        <div className={cn("rounded-xl p-2.5 text-center", metasEmRisco > 0 ? "bg-amber-50" : "bg-slate-50")}>
          <p className={cn("text-lg font-bold", metasEmRisco > 0 ? "text-amber-600" : "text-slate-500")}>{metasEmRisco}</p>
          <p className={cn("text-[10px]", metasEmRisco > 0 ? "text-amber-400" : "text-slate-400")}>em risco</p>
        </div>
      </div>

      {/* Lista de metas */}
      <div className="flex flex-col gap-2">
        {metasAtivas.length === 0 ? (
          <EmptyState msg="Nenhuma meta ativa — crie sua primeira meta" />
        ) : (
          metasAtivas.slice(0, 4).map((meta: Meta) => (
            <Link key={meta.id} href={`/crescimento/metas/${meta.id}`}>
              <div className={cn(
                "rounded-xl p-3 border cursor-pointer hover:shadow-sm transition-all",
                meta.atrasado ? "border-rose-200 bg-rose-50/50" : meta.emRisco ? "border-amber-200 bg-amber-50/30" : "border-slate-100 bg-slate-50/50 hover:border-slate-200"
              )}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.cor }} />
                    <p className="text-xs font-semibold text-slate-800 line-clamp-1">{meta.titulo}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {meta.atrasado && <XCircle className="w-3 h-3 text-rose-500 flex-shrink-0" />}
                    {!meta.atrasado && meta.emRisco && <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                    <span className="text-[10px] font-bold text-slate-400">{meta.progresso}%</span>
                  </div>
                </div>
                <ProgressBar value={meta.progresso} color={meta.atrasado ? "bg-rose-400" : meta.emRisco ? "bg-amber-400" : "bg-indigo-500"} />
                {meta.proximoCheckpoint && (
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Flag className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">{meta.proximoCheckpoint.titulo}</span>
                    {meta.proximoCheckpoint.data && (
                      <span className="ml-auto pl-1 flex-shrink-0">{fmtShortDate(meta.proximoCheckpoint.data)}</span>
                    )}
                  </p>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-8 w-80" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2"><Skeleton className="h-80 rounded-2xl" /></div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data, isLoading, error } = useDashboardGlobal();

  const agora = new Date();
  const hojeStr = `${DIAS_PT[data?.hoje?.diaSemana ?? ""] ?? ""}, ${agora.getDate()} de ${MESES_PT[agora.getMonth()]} de ${agora.getFullYear()}`;
  const hora = agora.getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const alertasCriticos = (data?.alertas ?? []).filter((a: Alerta) => a.nivel === "critico").length;

  if (isLoading) {
    return (
      <AppLayout>
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <XCircle className="w-10 h-10 text-rose-400 mb-3" />
          <p className="text-sm font-medium">Erro ao carregar o dashboard</p>
          <p className="text-xs text-slate-400 mt-1">Verifique a conexão e tente novamente</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Greeting header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <LayoutDashboard className="w-4 h-4 text-slate-400" />
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Painel Executivo</p>
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900">{saudacao}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{hojeStr}</p>
        </div>
        {alertasCriticos > 0 && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 text-sm text-rose-700 font-semibold">
            <AlertTriangle className="w-4 h-4" />
            {alertasCriticos} alerta{alertasCriticos > 1 ? "s" : ""} crítico{alertasCriticos > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Row 1: Hoje + Alertas */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <div className="xl:col-span-2">
          <BlocoHoje data={data.hoje} />
        </div>
        <BlocoAlertas alertas={data.alertas} />
      </div>

      {/* Row 2: Financeiro + Performance + Direção */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <BlocoFinanceiro data={data.financeiro} />
        <BlocoPerformance data={data.performance} />
        <BlocoDirecao data={data.direcao} />
      </div>
    </AppLayout>
  );
}
