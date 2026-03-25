import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatCurrency } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Home, Heart, Star, Briefcase, Sparkles,
  Shield, Wallet, TrendingUp, AlertTriangle,
  CheckCircle, Circle, RefreshCw, Scissors,
  Zap, ArrowRight, ChevronDown, ChevronUp,
  Target, BarChart2, Lightbulb, ArrowUpRight, ArrowDownRight, MinusCircle,
} from "lucide-react";
import { getApiBase } from "@/lib/api-base";

interface CustoItem {
  id: number;
  descricao: string;
  valor: number;
  tipoCusto: string;
  obrigatorio: boolean;
  categoriaName: string | null;
  formaPagamento: string | null;
  frequencia: string;
}

interface CustoData {
  custoEssencial: number;
  custoFixo: number;
  custoRecorrente: number;
  custoReal: number;
  totalReceitas: number;
  totalInvestimentos: number;
  patrimonio: number;
  reserva6meses: number;
  reserva12meses: number;
  mesesAutonomiaEssencial: number | null;
  mesesAutonomiaFixo: number | null;
  byType: Record<string, { total: number; items: CustoItem[] }>;
  receitas: CustoItem[];
}

async function fetchCustoDeVida(): Promise<CustoData> {
  const res = await fetch(`${getApiBase()}/api/custo-de-vida`);
  if (!res.ok) throw new Error("Erro ao carregar");
  return res.json();
}

const TYPE_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  barColor: string;
  desc: string;
}> = {
  essencial: {
    label: "Essenciais",
    icon: Home,
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-100",
    barColor: "bg-rose-400",
    desc: "Moradia, alimentação, saúde, transporte básico",
  },
  fixo: {
    label: "Fixos não Essenciais",
    icon: Briefcase,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-100",
    barColor: "bg-amber-400",
    desc: "Assinaturas, serviços, contas regulares",
  },
  variavel: {
    label: "Variáveis Recorrentes",
    icon: RefreshCw,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-100",
    barColor: "bg-blue-400",
    desc: "Gastos que variam mas se repetem",
  },
  investimento: {
    label: "Investimentos",
    icon: TrendingUp,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    barColor: "bg-emerald-400",
    desc: "Aportes, previdência, renda fixa",
  },
  luxo: {
    label: "Conforto & Lazer",
    icon: Sparkles,
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-100",
    barColor: "bg-violet-400",
    desc: "Assinaturas premium, viagens, entretenimento",
  },
};

function AutonomiaDisplay({ meses }: { meses: number | null }) {
  if (meses === null) return <span className="text-slate-400 text-2xl font-bold">—</span>;
  const color = meses >= 12 ? "text-emerald-400" : meses >= 6 ? "text-amber-400" : "text-rose-400";
  return (
    <span className={cn("text-3xl font-bold font-mono", color)}>
      {meses}{" "}
      <span className="text-base font-semibold text-slate-300">meses</span>
    </span>
  );
}

function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   MODO ENXUTO VIEW
   ──────────────────────────────────────────────────────────────────────────── */
function ModoEnxuto({ data }: { data: CustoData }) {
  const [showAllCortes, setShowAllCortes] = useState(false);

  const custoAtual = data.custoRecorrente;
  const custoEnxuto = data.custoEssencial;
  const economia = custoAtual - custoEnxuto;
  const economiaPct = custoAtual > 0 ? Math.round((economia / custoAtual) * 100) : 0;
  const patrimonio = data.patrimonio;

  const mesesAtual = patrimonio > 0 && custoAtual > 0
    ? Math.floor(patrimonio / custoAtual) : null;
  const mesesEnxuto = patrimonio > 0 && custoEnxuto > 0
    ? Math.floor(patrimonio / custoEnxuto) : null;
  const ganhoAutonomia = mesesAtual !== null && mesesEnxuto !== null
    ? mesesEnxuto - mesesAtual : null;

  // Items that would be cut (everything that's NOT essencial)
  const cortesAll: (CustoItem & { tipoLabel: string })[] = [];
  Object.entries(TYPE_CONFIG).forEach(([key, cfg]) => {
    if (key === "essencial") return;
    const block = data.byType[key];
    if (!block) return;
    block.items.forEach(item => {
      cortesAll.push({ ...item, tipoLabel: cfg.label });
    });
  });
  cortesAll.sort((a, b) => b.valor - a.valor);

  const cortesVisible = showAllCortes ? cortesAll : cortesAll.slice(0, 8);

  // Compare bar width
  const maxVal = Math.max(custoAtual, custoEnxuto, 1);
  const pctAtual = (custoAtual / maxVal) * 100;
  const pctEnxuto = (custoEnxuto / maxVal) * 100;

  const hasData = custoAtual > 0 || custoEnxuto > 0;

  return (
    <div className="space-y-6">
      {/* ─── Alert banner ─────────────────────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-start gap-3">
        <Scissors className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-900 font-semibold text-sm">Simulação — Modo de Crise</p>
          <p className="text-amber-700 text-xs mt-0.5">
            Mostra quanto você precisaria para sobreviver mantendo apenas os gastos essenciais.
            Útil para calcular reserva de emergência real ou planejar períodos de renda reduzida.
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          <Scissors className="w-8 h-8 mx-auto mb-3 text-slate-200" />
          <p className="font-medium">Nenhuma recorrência cadastrada</p>
          <p className="text-sm mt-1">
            <a href={`${BASE}recorrencias`} className="text-primary hover:underline font-medium">
              Cadastre suas recorrências
            </a>{" "}
            e classifique-as por tipo para ver o modo enxuto.
          </p>
        </div>
      ) : (
        <>
          {/* ─── Hero comparison ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Custo Atual */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-slate-400" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vida Atual</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 font-mono">{formatCurrency(custoAtual)}</p>
              <p className="text-xs text-slate-400 mt-1">custo mensal com tudo</p>
              <div className="mt-4 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 rounded-full transition-all" style={{ width: `${pctAtual}%` }} />
              </div>
            </div>

            {/* Economia */}
            <div className={cn(
              "rounded-2xl p-6 border-2 flex flex-col items-center justify-center text-center",
              economia > 0 ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-100 border-slate-200"
            )}>
              <Scissors className={cn("w-6 h-6 mb-2", economia > 0 ? "text-emerald-200" : "text-slate-400")} />
              <p className={cn("text-xs font-bold uppercase tracking-widest mb-2", economia > 0 ? "text-emerald-200" : "text-slate-500")}>
                Economia Possível
              </p>
              <p className={cn("text-3xl font-bold font-mono", economia > 0 ? "text-white" : "text-slate-400")}>
                {economia > 0 ? formatCurrency(economia) : "—"}
              </p>
              {economia > 0 && (
                <div className="mt-3 bg-emerald-700/40 rounded-full px-4 py-1">
                  <p className="text-emerald-100 text-sm font-bold">
                    −{economiaPct}% dos gastos mensais
                  </p>
                </div>
              )}
            </div>

            {/* Custo Enxuto */}
            <div className="bg-white border-2 border-emerald-300 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Modo Enxuto</p>
              </div>
              <p className="text-3xl font-bold text-emerald-700 font-mono">{formatCurrency(custoEnxuto)}</p>
              <p className="text-xs text-slate-400 mt-1">apenas essenciais</p>
              <div className="mt-4 h-2.5 bg-emerald-50 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pctEnxuto}%` }} />
              </div>
            </div>
          </div>

          {/* ─── Composição da economia ───────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* O que fica vs o que sai */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Composição dos Cortes</h2>
                <p className="text-xs text-slate-400 mt-0.5">Quanto cada categoria representa na economia</p>
              </div>
              <div className="p-6 space-y-4">
                {/* Kept — essencial */}
                {(data.byType["essencial"]?.total ?? 0) > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 flex-1">Essenciais (mantidos)</span>
                      <span className="text-sm font-bold text-emerald-700 font-mono">
                        {formatCurrency(data.byType["essencial"]?.total ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PctBar
                        pct={custoAtual > 0 ? ((data.byType["essencial"]?.total ?? 0) / custoAtual) * 100 : 0}
                        color="bg-emerald-400"
                      />
                      <span className="text-xs text-slate-400 w-10 text-right">
                        {custoAtual > 0 ? Math.round(((data.byType["essencial"]?.total ?? 0) / custoAtual) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Cut items by type */}
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                  if (key === "essencial") return null;
                  const block = data.byType[key];
                  if (!block || block.total === 0) return null;
                  const pct = custoAtual > 0 ? (block.total / custoAtual) * 100 : 0;
                  const Icon = cfg.icon;
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 opacity-60", cfg.bg)}>
                          <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                        </div>
                        <span className="text-sm font-medium text-slate-500 flex-1 line-through decoration-slate-300">
                          {cfg.label}
                        </span>
                        <span className="text-sm font-bold text-rose-500 font-mono">
                          −{formatCurrency(block.total)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PctBar pct={pct} color="bg-rose-200" />
                        <span className="text-xs text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}

                {Object.keys(TYPE_CONFIG).every(k => k === "essencial" || !(data.byType[k]?.total)) && (
                  <p className="text-slate-400 text-sm text-center py-4">
                    Todos os gastos são essenciais — não há cortes possíveis.
                  </p>
                )}
              </div>
            </div>

            {/* Autonomia comparada — dark card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-sm p-6 text-white">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-4 h-4 text-emerald-400" />
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Ganho de Autonomia</p>
              </div>

              <div className="space-y-4 mb-6">
                {/* Current */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      <p className="text-xs font-semibold text-slate-300">Vida atual</p>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">{formatCurrency(custoAtual)}/mês</p>
                  </div>
                  <AutonomiaDisplay meses={mesesAtual} />
                </div>

                {/* Lean */}
                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <p className="text-xs font-semibold text-emerald-300">Modo enxuto</p>
                    </div>
                    <p className="text-xs text-emerald-400 font-mono">{formatCurrency(custoEnxuto)}/mês</p>
                  </div>
                  <AutonomiaDisplay meses={mesesEnxuto} />
                </div>
              </div>

              {/* Gain badge */}
              {ganhoAutonomia !== null && ganhoAutonomia > 0 ? (
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                  <Zap className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-emerald-200 font-bold text-sm">
                      +{ganhoAutonomia} meses a mais de autonomia
                    </p>
                    <p className="text-emerald-400 text-xs mt-0.5">
                      Cortando gastos não essenciais você dura {ganhoAutonomia} meses a mais.
                    </p>
                  </div>
                </div>
              ) : custoAtual === 0 ? (
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-slate-400 text-sm">Cadastre recorrências para calcular</p>
                </div>
              ) : (
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-slate-400 text-sm">
                    Todos os gastos já são essenciais — autonomia idêntica.
                  </p>
                </div>
              )}

              {/* Patrimônio */}
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <p className="text-xs text-slate-500">Patrimônio base</p>
                <p className="text-sm font-bold text-white font-mono">{formatCurrency(patrimonio)}</p>
              </div>
            </div>
          </div>

          {/* ─── Lista de cortes ──────────────────────────────────────────── */}
          {cortesAll.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-rose-500" />
                    Lista de Cortes
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {cortesAll.length} item{cortesAll.length !== 1 ? "ns" : ""} que seriam eliminados no modo crise
                    {" · "}
                    <span className="text-rose-500 font-semibold">
                      −{formatCurrency(economia)}/mês
                    </span>
                  </p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-xl px-3 py-1.5">
                  <p className="text-rose-700 text-xs font-bold">{cortesAll.length} itens</p>
                </div>
              </div>

              <div className="divide-y divide-slate-50">
                {cortesVisible.map((item, idx) => {
                  const cfg = TYPE_CONFIG[item.tipoCusto] ?? TYPE_CONFIG.fixo;
                  const Icon = cfg.icon;
                  const pctDoTotal = economia > 0 ? (item.valor / economia) * 100 : 0;
                  return (
                    <div
                      key={item.id}
                      className="px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors group"
                    >
                      {/* Rank */}
                      <span className="text-xs text-slate-300 font-mono w-5 text-right flex-shrink-0">
                        {idx + 1}
                      </span>

                      {/* Type icon */}
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", cfg.bg)}>
                        <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                      </div>

                      {/* Description */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{item.descricao}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", cfg.bg, cfg.color)}>
                            {cfg.label}
                          </span>
                          {item.categoriaName && (
                            <span className="text-[10px] text-slate-400">{item.categoriaName}</span>
                          )}
                        </div>
                      </div>

                      {/* Mini bar */}
                      <div className="hidden sm:flex items-center gap-2 w-28">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-300 rounded-full"
                            style={{ width: `${Math.min(pctDoTotal * 3, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 w-8 text-right">
                          {pctDoTotal.toFixed(0)}%
                        </span>
                      </div>

                      {/* Value */}
                      <span className="text-sm font-bold text-rose-600 font-mono flex-shrink-0">
                        −{formatCurrency(item.valor)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {cortesAll.length > 8 && (
                <div className="border-t border-slate-100">
                  <button
                    onClick={() => setShowAllCortes(v => !v)}
                    className="w-full py-3.5 text-sm font-semibold text-primary flex items-center justify-center gap-2 hover:bg-slate-50/50 transition-colors"
                  >
                    {showAllCortes ? (
                      <>Ver menos <ChevronUp className="w-4 h-4" /></>
                    ) : (
                      <>Ver todos os {cortesAll.length} itens <ChevronDown className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              )}

              {/* Footer total */}
              <div className="border-t-2 border-slate-200 bg-slate-50 px-6 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-700">Total de cortes</p>
                  <p className="text-xs text-slate-400">{cortesAll.length} recorrências eliminadas</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-rose-600 font-mono">−{formatCurrency(economia)}</p>
                  <p className="text-xs text-slate-400">por mês → −{formatCurrency(economia * 12)}/ano</p>
                </div>
              </div>
            </div>
          )}

          {cortesAll.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-3 text-emerald-500" />
              <p className="text-emerald-800 font-semibold">Nenhum corte possível</p>
              <p className="text-emerald-600 text-sm mt-1">
                Todos os seus gastos recorrentes são classificados como essenciais.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   VISÃO ATUAL VIEW (original)
   ──────────────────────────────────────────────────────────────────────────── */
function VisaoAtual({ data }: { data: CustoData }) {
  const total = data.custoRecorrente;
  const hasData = total > 0 || data.custoReal > 0;

  const pctCompromissoDaReceita = data.totalReceitas
    ? Math.round((total / data.totalReceitas) * 100)
    : null;

  const saldoLivre = data.totalReceitas
    ? data.totalReceitas - total
    : null;

  return (
    <div className="space-y-8">
      {/* ─── KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center">
              <Home className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Custo Essencial</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">{formatCurrency(data.custoEssencial)}</p>
          <p className="text-xs text-slate-400 mt-1">por mês — mínimo indispensável</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Custo Fixo Total</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">{formatCurrency(data.custoFixo)}</p>
          <p className="text-xs text-slate-400 mt-1">essencial + fixos mensais</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Wallet className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Custo Real (3m)</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">{formatCurrency(data.custoReal)}</p>
          <p className="text-xs text-slate-400 mt-1">média dos últimos 3 meses</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Reserva 6 meses</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">{formatCurrency(data.reserva6meses)}</p>
          <p className="text-xs text-slate-400 mt-1">baseado no custo essencial</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
              <Star className="w-4 h-4 text-violet-600" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Reserva 12 meses</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">{formatCurrency(data.reserva12meses)}</p>
          <p className="text-xs text-slate-400 mt-1">baseado no custo essencial</p>
        </div>

        <div className={cn(
          "border rounded-2xl p-5 shadow-sm",
          saldoLivre === null ? "bg-white border-slate-200"
            : saldoLivre >= 0 ? "bg-emerald-50 border-emerald-100"
            : "bg-rose-50 border-rose-100"
        )}>
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center",
              saldoLivre === null ? "bg-slate-100"
                : saldoLivre >= 0 ? "bg-emerald-100" : "bg-rose-100"
            )}>
              <Heart className={cn("w-4 h-4",
                saldoLivre === null ? "text-slate-400"
                  : saldoLivre >= 0 ? "text-emerald-600" : "text-rose-600"
              )} />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Saldo Livre/Mês</p>
          </div>
          {saldoLivre !== null ? (
            <>
              <p className={cn("text-2xl font-bold font-mono",
                saldoLivre >= 0 ? "text-emerald-700" : "text-rose-700"
              )}>
                {saldoLivre >= 0 ? "+" : ""}{formatCurrency(saldoLivre)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {pctCompromissoDaReceita}% da receita comprometida
              </p>
            </>
          ) : (
            <p className="text-slate-400 text-sm">Cadastre receitas recorrentes para calcular</p>
          )}
        </div>
      </div>

      {/* ─── Composição + Autonomia ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Composição do Custo de Vida</h2>
            <p className="text-xs text-slate-400 mt-0.5">Distribuição das suas despesas fixas por categoria</p>
          </div>
          <div className="p-6">
            {!hasData ? (
              <div className="text-center py-10">
                <RefreshCw className="w-8 h-8 mx-auto mb-3 text-slate-200" />
                <p className="text-slate-500 font-medium">Nenhuma recorrência cadastrada</p>
                <p className="text-sm text-slate-400 mt-1">
                  <a href={`${BASE}recorrencias`} className="text-primary hover:underline font-medium">
                    Cadastre suas recorrências
                  </a>{" "}para ver a composição.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                  const block = data.byType[key];
                  if (!block || block.total === 0) return null;
                  const pct = total > 0 ? (block.total / total) * 100 : 0;
                  const Icon = cfg.icon;
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", cfg.bg)}>
                          <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 flex-1">{cfg.label}</span>
                        <span className="text-xs text-slate-400 font-mono">{pct.toFixed(0)}%</span>
                        <span className="text-sm font-bold text-slate-800 font-mono w-28 text-right">
                          {formatCurrency(block.total)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", cfg.barColor)}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">Total mensal</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">{formatCurrency(total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Autonomia dark card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-sm p-6 text-white flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-emerald-400" />
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Autonomia Financeira</p>
            </div>
            <p className="text-slate-400 text-xs mt-1">Com base no seu patrimônio atual</p>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Custo essencial</p>
            <AutonomiaDisplay meses={data.mesesAutonomiaEssencial ?? null} />
            <p className="text-xs text-slate-500 mt-1">{formatCurrency(data.custoEssencial)}/mês de base</p>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Custo fixo completo</p>
            <AutonomiaDisplay meses={data.mesesAutonomiaFixo ?? null} />
            <p className="text-xs text-slate-500 mt-1">{formatCurrency(data.custoFixo)}/mês de base</p>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1.5">Patrimônio atual</p>
            <p className="text-xl font-bold font-mono text-white">{formatCurrency(data.patrimonio)}</p>
          </div>

          {(data.mesesAutonomiaEssencial ?? 0) < 6 && (
            <div className="bg-rose-500/20 border border-rose-500/30 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300">
                  Autonomia abaixo do recomendado (6 meses). Reforce sua reserva de emergência.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Blocos por tipo ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
          const block = data.byType[key];
          if (!block || block.items.length === 0) return null;
          const pct = total > 0 ? (block.total / total) * 100 : 0;
          const Icon = cfg.icon;
          return (
            <div key={key} className={cn("border rounded-2xl overflow-hidden shadow-sm", cfg.border)}>
              <div className={cn("px-5 py-4 border-b flex items-center justify-between", cfg.bg, cfg.border)}>
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                  <span className={cn("font-semibold text-sm", cfg.color)}>{cfg.label}</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">{pct.toFixed(0)}% do total</span>
              </div>
              <div className="bg-white px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">{cfg.desc}</span>
                <span className="text-base font-bold text-slate-900 font-mono">{formatCurrency(block.total)}</span>
              </div>
              <div className="bg-white divide-y divide-slate-50">
                {block.items.slice(0, 6).map(item => (
                  <div key={item.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.obrigatorio
                        ? <CheckCircle className="w-3 h-3 text-rose-400 flex-shrink-0" />
                        : <Circle className="w-3 h-3 text-slate-300 flex-shrink-0" />
                      }
                      <span className="text-xs text-slate-700 truncate font-medium">{item.descricao}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700 font-mono flex-shrink-0">
                      {formatCurrency(item.valor)}
                    </span>
                  </div>
                ))}
                {block.items.length > 6 && (
                  <div className="px-5 py-2 text-xs text-slate-400 text-center">
                    +{block.items.length - 6} item{block.items.length - 6 > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Tabela detalhada ───────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Todas as Recorrências de Despesa</h2>
        </div>
        {!hasData ? (
          <div className="p-12 text-center text-slate-400">
            <p className="font-medium">Nenhuma recorrência de despesa cadastrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide w-8"></th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Frequência</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Valor/Mês</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                  const block = data.byType[key];
                  if (!block || block.items.length === 0) return null;
                  const Icon = cfg.icon;
                  return block.items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        {item.obrigatorio
                          ? <CheckCircle className="w-3.5 h-3.5 text-rose-400" />
                          : <Circle className="w-3.5 h-3.5 text-slate-300" />
                        }
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800">{item.descricao}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{item.categoriaName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
                          <Icon className="w-2.5 h-2.5" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs capitalize">{item.frequencia}</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-800 font-mono">
                        {formatCurrency(item.valor)}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={5} className="px-5 py-3 text-sm font-bold text-slate-700">Total mensal</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900 font-mono text-base">
                    {formatCurrency(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   MODO OTIMIZAÇÃO VIEW
   ──────────────────────────────────────────────────────────────────────────── */

interface AllocRule {
  key: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  idealPct: number;       // target %
  direction: "max" | "min"; // max = spend at most X%, min = invest at least X%
  iconColor: string;
  bg: string;
  good: string;   // tailwind color when on track
  bad: string;    // tailwind color when off track
  barGood: string;
  barBad: string;
  tipoCustoKeys: string[]; // which tipoCusto values map here
}

const ALLOC_RULES: AllocRule[] = [
  {
    key: "fixas",
    label: "Despesas Fixas",
    sublabel: "essenciais + fixos não essenciais",
    icon: Home,
    idealPct: 40,
    direction: "max",
    iconColor: "text-rose-600",
    bg: "bg-rose-50",
    good: "text-emerald-700",
    bad: "text-rose-700",
    barGood: "bg-emerald-400",
    barBad: "bg-rose-400",
    tipoCustoKeys: ["essencial", "fixo"],
  },
  {
    key: "variaveis",
    label: "Despesas Variáveis",
    sublabel: "gastos recorrentes variáveis",
    icon: RefreshCw,
    idealPct: 30,
    direction: "max",
    iconColor: "text-blue-600",
    bg: "bg-blue-50",
    good: "text-emerald-700",
    bad: "text-rose-700",
    barGood: "bg-blue-400",
    barBad: "bg-rose-400",
    tipoCustoKeys: ["variavel"],
  },
  {
    key: "lazer",
    label: "Lazer & Conforto",
    sublabel: "entretenimento, viagens, luxo",
    icon: Sparkles,
    idealPct: 10,
    direction: "max",
    iconColor: "text-violet-600",
    bg: "bg-violet-50",
    good: "text-emerald-700",
    bad: "text-rose-700",
    barGood: "bg-violet-400",
    barBad: "bg-rose-400",
    tipoCustoKeys: ["luxo"],
  },
  {
    key: "investimentos",
    label: "Investimentos",
    sublabel: "aportes, previdência, renda fixa",
    icon: TrendingUp,
    idealPct: 20,
    direction: "min",
    iconColor: "text-emerald-600",
    bg: "bg-emerald-50",
    good: "text-emerald-700",
    bad: "text-amber-700",
    barGood: "bg-emerald-400",
    barBad: "bg-amber-400",
    tipoCustoKeys: ["investimento"],
  },
];

function StatusBadge({ status, diffPct }: { status: "ok" | "acima" | "abaixo"; diffPct: number }) {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="w-3 h-3" />
        No alvo
      </span>
    );
  }
  if (status === "acima") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <ArrowUpRight className="w-3 h-3" />
        +{Math.abs(diffPct).toFixed(1)}% acima
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
      <ArrowDownRight className="w-3 h-3" />
      {Math.abs(diffPct).toFixed(1)}% abaixo
    </span>
  );
}

function ModoOtimizacao({ data }: { data: CustoData }) {
  const renda = data.totalReceitas;

  // Compute allocations
  const allocs = ALLOC_RULES.map(rule => {
    const atual = rule.tipoCustoKeys.reduce((sum, k) => sum + (data.byType[k]?.total ?? 0), 0);
    const atualPct = renda > 0 ? (atual / renda) * 100 : 0;
    const idealVal = renda > 0 ? (rule.idealPct / 100) * renda : 0;
    const diffVal = idealVal - atual; // positive = room to spend/invest more; negative = over budget
    const diffPct = atualPct - rule.idealPct; // positive = over, negative = under
    // Status logic
    let status: "ok" | "acima" | "abaixo";
    if (rule.direction === "max") {
      status = atualPct <= rule.idealPct ? "ok" : "acima";
    } else {
      // min (investimentos)
      status = atualPct >= rule.idealPct ? "ok" : "abaixo";
    }
    return { ...rule, atual, atualPct, idealVal, diffVal, diffPct, status };
  });

  // Suggestions
  const suggestions: { icon: React.ElementType; color: string; bg: string; text: string; value: number; priority: "high" | "medium" }[] = [];
  allocs.forEach(a => {
    if (a.status === "acima" && a.direction === "max") {
      suggestions.push({
        icon: ArrowDownRight,
        color: "text-rose-700",
        bg: "bg-rose-50",
        text: `Reduza ${a.label.toLowerCase()} em`,
        value: Math.abs(a.diffVal),
        priority: a.key === "fixas" ? "high" : "medium",
      });
    }
    if (a.status === "abaixo" && a.direction === "min") {
      suggestions.push({
        icon: ArrowUpRight,
        color: "text-emerald-700",
        bg: "bg-emerald-50",
        text: `Aumente ${a.label.toLowerCase()} em`,
        value: Math.abs(a.diffVal),
        priority: "high",
      });
    }
  });
  suggestions.sort((a, b) => (a.priority === "high" ? -1 : 1));

  // Impact
  const economiaMensal = allocs
    .filter(a => a.status === "acima" && a.direction === "max")
    .reduce((sum, a) => sum + Math.abs(a.diffVal), 0);
  const investimentoAdicional = allocs.find(a => a.key === "investimentos" && a.status === "abaixo");
  const investimentoGanho = investimentoAdicional ? Math.abs(investimentoAdicional.diffVal) : 0;

  const hasData = renda > 0;
  const noProblem = suggestions.length === 0 && hasData;

  // Total spending (all expenses)
  const totalDespesas = allocs.reduce((s, a) => s + a.atual, 0);

  return (
    <div className="space-y-6">
      {/* ─── Intro banner ────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl px-6 py-4 flex items-start gap-3">
        <Target className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-indigo-900 font-semibold text-sm">Estrutura Financeira Ideal</p>
          <p className="text-indigo-700 text-xs mt-0.5">
            Com base na sua renda mensal de{" "}
            <span className="font-bold">{formatCurrency(renda)}</span>, analisamos como seus gastos
            se comparam com a estrutura recomendada de alocação.
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          <Target className="w-8 h-8 mx-auto mb-3 text-slate-200" />
          <p className="font-medium">Cadastre receitas recorrentes para ver a otimização</p>
          <p className="text-sm mt-1">
            <a href={`${BASE}recorrencias`} className="text-primary hover:underline font-medium">
              Clique aqui para cadastrar
            </a>
          </p>
        </div>
      ) : (
        <>
          {/* ─── 4 allocation cards ────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allocs.map(a => {
              const Icon = a.icon;
              const isOk = a.status === "ok";
              const barPct = Math.min(a.atualPct, 100);
              const idealBarPct = Math.min(a.idealPct, 100);
              return (
                <div
                  key={a.key}
                  className={cn(
                    "bg-white border-2 rounded-2xl p-5 shadow-sm flex flex-col gap-3 transition-all",
                    isOk ? "border-slate-200" : a.status === "acima" ? "border-rose-200" : "border-amber-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", a.bg)}>
                      <Icon className={cn("w-4 h-4", a.iconColor)} />
                    </div>
                    <StatusBadge status={a.status} diffPct={a.diffPct} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{a.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{a.sublabel}</p>
                  </div>

                  {/* Values */}
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Atual</p>
                      <p className={cn("text-xl font-bold font-mono", isOk ? "text-slate-800" : a.status === "acima" ? "text-rose-700" : "text-amber-700")}>
                        {a.atualPct.toFixed(1)}%
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{formatCurrency(a.atual)}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 mb-3 flex-shrink-0" />
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 mb-0.5">Ideal</p>
                      <p className="text-xl font-bold font-mono text-emerald-600">{a.idealPct}%</p>
                      <p className="text-[10px] text-slate-400 font-mono">{formatCurrency(a.idealVal)}</p>
                    </div>
                  </div>

                  {/* Dual progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-10 text-[10px] text-slate-400">Atual</div>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", isOk ? a.barGood : a.barBad)}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 w-8 text-right">{a.atualPct.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-10 text-[10px] text-slate-400">Ideal</div>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-300 transition-all duration-500"
                          style={{ width: `${idealBarPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 w-8 text-right">{a.idealPct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─── Comparison table + stacked bar ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-slate-400" />
                <h2 className="font-semibold text-slate-900">Comparativo Atual vs Ideal</h2>
              </div>
              <div className="p-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Categoria</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">Atual</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">Ideal</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">Ajuste</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allocs.map(a => {
                      const Icon = a.icon;
                      const overUnder = a.direction === "max"
                        ? (a.atualPct > a.idealPct ? `−${formatCurrency(Math.abs(a.diffVal))}` : "OK")
                        : (a.atualPct < a.idealPct ? `+${formatCurrency(Math.abs(a.diffVal))}` : "OK");
                      const isOk = a.status === "ok";
                      const adjustColor = isOk ? "text-emerald-600" :
                        a.status === "acima" ? "text-rose-600" : "text-amber-600";
                      return (
                        <tr key={a.key} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0", a.bg)}>
                                <Icon className={cn("w-3 h-3", a.iconColor)} />
                              </div>
                              <span className="font-medium text-slate-700 text-xs">{a.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div>
                              <span className={cn("font-bold text-sm font-mono", isOk ? "text-slate-700" : a.status === "acima" ? "text-rose-600" : "text-amber-600")}>
                                {a.atualPct.toFixed(1)}%
                              </span>
                              <p className="text-[10px] text-slate-400 font-mono">{formatCurrency(a.atual)}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div>
                              <span className="font-bold text-sm text-emerald-600 font-mono">{a.idealPct}%</span>
                              <p className="text-[10px] text-slate-400 font-mono">{formatCurrency(a.idealVal)}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {isOk ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-2.5 h-2.5" />
                                OK
                              </span>
                            ) : (
                              <span className={cn("font-bold text-sm font-mono", adjustColor)}>{overUnder}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Residual row */}
                    {renda > 0 && (() => {
                      const totalIdeal = allocs.reduce((s, a) => s + a.idealPct, 0);
                      const residualPct = Math.max(0, 100 - totalIdeal);
                      const residualAtualPct = renda > 0 ? Math.max(0, ((renda - totalDespesas) / renda) * 100) : 0;
                      return (
                        <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50/50">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <MinusCircle className="w-3 h-3 text-slate-400" />
                              </div>
                              <span className="font-medium text-slate-500 text-xs">Outros / Livre</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-bold text-sm text-slate-500 font-mono">{residualAtualPct.toFixed(1)}%</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-bold text-sm text-slate-500 font-mono">{residualPct}%</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="text-xs text-slate-400">residual</span>
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stacked bar comparison */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Distribuição Visual</h2>
                <p className="text-xs text-slate-400 mt-0.5">Como sua renda está alocada hoje vs o ideal</p>
              </div>
              <div className="p-6 space-y-6">
                {/* Actual */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Distribuição atual</p>
                    <p className="text-xs text-slate-400 font-mono">{formatCurrency(renda)}</p>
                  </div>
                  <div className="flex h-8 rounded-xl overflow-hidden gap-0.5">
                    {allocs.map(a => {
                      if (a.atualPct <= 0) return null;
                      const colors: Record<string, string> = {
                        fixas: "bg-rose-400",
                        variaveis: "bg-blue-400",
                        lazer: "bg-violet-400",
                        investimentos: "bg-emerald-500",
                      };
                      return (
                        <div
                          key={a.key}
                          className={cn("h-full flex items-center justify-center text-white text-[10px] font-bold transition-all duration-500", colors[a.key])}
                          style={{ width: `${Math.min(a.atualPct, 100)}%` }}
                          title={`${a.label}: ${a.atualPct.toFixed(1)}%`}
                        >
                          {a.atualPct >= 8 ? `${a.atualPct.toFixed(0)}%` : ""}
                        </div>
                      );
                    })}
                    {/* Residual */}
                    {(() => {
                      const used = allocs.reduce((s, a) => s + Math.min(a.atualPct, 100), 0);
                      const rem = Math.max(0, 100 - used);
                      return rem > 0 ? (
                        <div className="h-full bg-slate-200 flex-1 flex items-center justify-center text-slate-500 text-[10px] font-bold">
                          {rem.toFixed(0)}%
                        </div>
                      ) : null;
                    })()}
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mt-3">
                    {allocs.map(a => {
                      const colors: Record<string, string> = {
                        fixas: "bg-rose-400",
                        variaveis: "bg-blue-400",
                        lazer: "bg-violet-400",
                        investimentos: "bg-emerald-500",
                      };
                      return (
                        <div key={a.key} className="flex items-center gap-1.5">
                          <div className={cn("w-2.5 h-2.5 rounded-full", colors[a.key])} />
                          <span className="text-[10px] text-slate-500">{a.label}</span>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                      <span className="text-[10px] text-slate-500">Livre</span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-dashed border-slate-200" />

                {/* Ideal */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Distribuição ideal</p>
                    <p className="text-xs text-slate-400 font-mono">meta de alocação</p>
                  </div>
                  <div className="flex h-8 rounded-xl overflow-hidden gap-0.5">
                    {allocs.map(a => {
                      const colors: Record<string, string> = {
                        fixas: "bg-rose-300",
                        variaveis: "bg-blue-300",
                        lazer: "bg-violet-300",
                        investimentos: "bg-emerald-400",
                      };
                      return (
                        <div
                          key={a.key}
                          className={cn("h-full flex items-center justify-center text-white text-[10px] font-bold", colors[a.key])}
                          style={{ width: `${a.idealPct}%` }}
                        >
                          {a.idealPct >= 8 ? `${a.idealPct}%` : ""}
                        </div>
                      );
                    })}
                    {/* Residual 0% */}
                    <div className="h-full bg-slate-100 flex-1 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                      {100 - allocs.reduce((s, a) => s + a.idealPct, 0)}%
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    Regra: Fixas ≤40% · Variáveis ≤30% · Lazer ≤10% · Investimentos ≥20%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Suggestions + Impact ──────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Suggestions */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h2 className="font-semibold text-slate-900">Sugestões de Ajuste</h2>
                {noProblem && (
                  <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle className="w-3 h-3" />
                    Estrutura ideal!
                  </span>
                )}
              </div>

              <div className="p-6">
                {noProblem ? (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-7 h-7 text-emerald-500" />
                    </div>
                    <p className="text-slate-700 font-semibold">Parabéns! Estrutura de gastos exemplar.</p>
                    <p className="text-slate-400 text-sm mt-1">Seus percentuais estão dentro das metas ideais de alocação.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map((s, i) => {
                      const Icon = s.icon;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-xl border transition-all",
                            s.priority === "high"
                              ? "border-rose-100 bg-rose-50/60"
                              : "border-amber-100 bg-amber-50/60"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", s.bg)}>
                            <Icon className={cn("w-5 h-5", s.color)} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800">
                              {s.text}{" "}
                              <span className={cn("font-bold font-mono", s.color)}>
                                {formatCurrency(s.value)}/mês
                              </span>
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {formatCurrency(s.value * 12)}/ano de impacto acumulado
                            </p>
                          </div>
                          {s.priority === "high" && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full flex-shrink-0">
                              Prioritário
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* Static good advice */}
                    {allocs.find(a => a.key === "investimentos" && a.status === "ok") && (
                      <div className="flex items-center gap-4 p-4 rounded-xl border border-emerald-100 bg-emerald-50/60">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Investimentos no alvo — considere aumentar ainda mais para metas de longo prazo.
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">Cada 1% a mais em investimentos pode gerar impacto significativo em 10 anos.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Impact block */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-sm p-6 text-white flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Impacto do Ajuste</p>
              </div>
              <p className="text-slate-400 text-xs">Se você seguir as sugestões acima:</p>

              {/* Economy */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Economia mensal</p>
                <p className={cn("text-2xl font-bold font-mono", economiaMensal > 0 ? "text-rose-300" : "text-slate-500")}>
                  {economiaMensal > 0 ? `−${formatCurrency(economiaMensal)}` : "—"}
                </p>
                {economiaMensal > 0 && (
                  <p className="text-xs text-slate-500 mt-1">em gastos desnecessários</p>
                )}
              </div>

              {/* Investment gain */}
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Investimento adicional</p>
                <p className={cn("text-2xl font-bold font-mono", investimentoGanho > 0 ? "text-emerald-300" : "text-slate-500")}>
                  {investimentoGanho > 0 ? `+${formatCurrency(investimentoGanho)}` : "—"}
                </p>
                {investimentoGanho > 0 && (
                  <p className="text-xs text-slate-500 mt-1">por mês em aportes</p>
                )}
              </div>

              {/* Annual impact */}
              {(economiaMensal > 0 || investimentoGanho > 0) && (
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">Impacto anual</p>
                  <p className="text-2xl font-bold font-mono text-amber-300">
                    +{formatCurrency((economiaMensal + investimentoGanho) * 12)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">recuperados ou investidos por ano</p>
                </div>
              )}

              {!economiaMensal && !investimentoGanho && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4 text-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs text-emerald-300 font-semibold">Estrutura financeira saudável</p>
                </div>
              )}

              {/* Reference */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <p className="text-xs text-slate-500">Base de cálculo</p>
                <p className="text-xs font-bold text-white font-mono">{formatCurrency(renda)}/mês</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   ROOT PAGE
   ──────────────────────────────────────────────────────────────────────────── */
type Tab = "atual" | "enxuto" | "otimizacao";

export default function CustoDeVidaPage() {
  const [tab, setTab] = useState<Tab>("atual");

  const { data, isLoading } = useQuery<CustoData>({
    queryKey: ["custo-de-vida"],
    queryFn: fetchCustoDeVida,
  });

  return (
    <AppLayout>
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Custo de Vida</h1>
          <p className="text-slate-500 mt-1">
            Entenda quanto custa manter seu padrão de vida e qual sua autonomia financeira.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-100 rounded-2xl p-1 gap-1 self-start sm:self-auto">
          <button
            onClick={() => setTab("atual")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
              tab === "atual"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Wallet className="w-4 h-4" />
            Vida Atual
          </button>
          <button
            onClick={() => setTab("enxuto")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
              tab === "enxuto"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Scissors className="w-4 h-4" />
            Modo Enxuto
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              tab === "enxuto"
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-200 text-slate-500"
            )}>
              Crise
            </span>
          </button>
          <button
            onClick={() => setTab("otimizacao")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
              tab === "otimizacao"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Target className="w-4 h-4" />
            Otimização
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              tab === "otimizacao"
                ? "bg-indigo-100 text-indigo-700"
                : "bg-slate-200 text-slate-500"
            )}>
              Ideal
            </span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-32 text-slate-400">Carregando...</div>
      ) : data ? (
        tab === "atual" ? <VisaoAtual data={data} />
        : tab === "enxuto" ? <ModoEnxuto data={data} />
        : <ModoOtimizacao data={data} />
      ) : null}
    </AppLayout>
  );
}
