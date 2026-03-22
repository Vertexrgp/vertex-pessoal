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
} from "lucide-react";

const BASE = import.meta.env.BASE_URL ?? "/";

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
  const res = await fetch(`${BASE}api/custo-de-vida`);
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
   ROOT PAGE
   ──────────────────────────────────────────────────────────────────────────── */
type Tab = "atual" | "enxuto";

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
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-32 text-slate-400">Carregando...</div>
      ) : data ? (
        tab === "atual"
          ? <VisaoAtual data={data} />
          : <ModoEnxuto data={data} />
      ) : null}
    </AppLayout>
  );
}
