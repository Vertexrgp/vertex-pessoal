import { AppLayout } from "@/components/layout/AppLayout";
import { formatCurrency } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Home, Heart, Star, Briefcase, Sparkles,
  Shield, Wallet, TrendingUp, AlertTriangle,
  CheckCircle, Circle, RefreshCw,
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
  desc: string;
}> = {
  essencial: {
    label: "Essenciais",
    icon: Home,
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-100",
    desc: "Moradia, alimentação, saúde, transporte básico",
  },
  fixo: {
    label: "Fixos não Essenciais",
    icon: Briefcase,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-100",
    desc: "Assinaturas, serviços, contas regulares",
  },
  variavel: {
    label: "Variáveis Recorrentes",
    icon: RefreshCw,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-100",
    desc: "Gastos que variam mas se repetem",
  },
  investimento: {
    label: "Investimentos",
    icon: TrendingUp,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    desc: "Aportes, previdência, renda fixa",
  },
  luxo: {
    label: "Conforto & Lazer",
    icon: Sparkles,
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-100",
    desc: "Assinaturas premium, viagens, entretenimento",
  },
};

function AutonomiaDisplay({ meses }: { meses: number | null }) {
  if (meses === null) return <span className="text-slate-400">—</span>;
  const color = meses >= 12 ? "text-emerald-600" : meses >= 6 ? "text-amber-600" : "text-rose-600";
  return (
    <span className={cn("text-3xl font-bold font-mono", color)}>
      {meses} <span className="text-lg font-semibold">meses</span>
    </span>
  );
}

function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export default function CustoDeVidaPage() {
  const { data, isLoading } = useQuery<CustoData>({
    queryKey: ["custo-de-vida"],
    queryFn: fetchCustoDeVida,
  });

  const total = data?.custoRecorrente ?? 0;
  const hasData = total > 0 || (data?.custoReal ?? 0) > 0;

  // Percentage of receitas consumed
  const pctCompromissoDaReceita = data?.totalReceitas
    ? Math.round((total / data.totalReceitas) * 100)
    : null;

  const saldoLivre = data?.totalReceitas
    ? data.totalReceitas - total
    : null;

  return (
    <AppLayout>
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900">Custo de Vida</h1>
        <p className="text-slate-500 mt-1">
          Entenda quanto custa manter seu padrão de vida e quanto você tem de autonomia financeira.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-32 text-slate-400">Carregando...</div>
      ) : (
        <>
          {/* ─── KPI cards ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Custo Essencial */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center">
                  <Home className="w-4 h-4 text-rose-600" />
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Custo Essencial</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 font-mono">{formatCurrency(data?.custoEssencial ?? 0)}</p>
              <p className="text-xs text-slate-400 mt-1">por mês — mínimo indispensável</p>
            </div>

            {/* Custo Fixo Total */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Custo Fixo Total</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 font-mono">{formatCurrency(data?.custoFixo ?? 0)}</p>
              <p className="text-xs text-slate-400 mt-1">essencial + fixos mensais</p>
            </div>

            {/* Custo de Vida Real */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Custo Real (3m)</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 font-mono">{formatCurrency(data?.custoReal ?? 0)}</p>
              <p className="text-xs text-slate-400 mt-1">média dos últimos 3 meses</p>
            </div>

            {/* Reserva 6 meses */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Reserva 6 meses</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 font-mono">{formatCurrency(data?.reserva6meses ?? 0)}</p>
              <p className="text-xs text-slate-400 mt-1">baseado no custo essencial</p>
            </div>

            {/* Reserva 12 meses */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
                  <Star className="w-4 h-4 text-violet-600" />
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Reserva 12 meses</p>
              </div>
              <p className="text-2xl font-bold text-slate-900 font-mono">{formatCurrency(data?.reserva12meses ?? 0)}</p>
              <p className="text-xs text-slate-400 mt-1">baseado no custo essencial</p>
            </div>

            {/* Saldo Livre */}
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
                  <Heart className={cn(
                    "w-4 h-4",
                    saldoLivre === null ? "text-slate-400"
                      : saldoLivre >= 0 ? "text-emerald-600" : "text-rose-600"
                  )} />
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Saldo Livre/Mês</p>
              </div>
              {saldoLivre !== null ? (
                <>
                  <p className={cn(
                    "text-2xl font-bold font-mono",
                    saldoLivre >= 0 ? "text-emerald-700" : "text-rose-700"
                  )}>
                    {saldoLivre >= 0 ? "+" : ""}{formatCurrency(saldoLivre)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {pctCompromissoDaReceita}% da receita comprometida com recorrências
                  </p>
                </>
              ) : (
                <p className="text-slate-400 text-sm">Cadastre receitas recorrentes para calcular</p>
              )}
            </div>
          </div>

          {/* ─── Composição do custo + Autonomia (side by side) ─────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Composição visual - left 2/3 */}
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
                      </a>{" "}
                      para ver a composição do custo de vida.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                      const block = data?.byType[key];
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
                          <PctBar pct={pct} color={
                            key === "essencial" ? "bg-rose-400" :
                            key === "fixo" ? "bg-amber-400" :
                            key === "variavel" ? "bg-blue-400" :
                            key === "investimento" ? "bg-emerald-400" : "bg-violet-400"
                          } />
                        </div>
                      );
                    })}

                    {/* Total bar */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">Total mensal</span>
                      <span className="text-lg font-bold text-slate-900 font-mono">{formatCurrency(total)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Autonomia Financeira - right 1/3 */}
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
                <AutonomiaDisplay meses={data?.mesesAutonomiaEssencial ?? null} />
                <p className="text-xs text-slate-500 mt-1">
                  {formatCurrency(data?.custoEssencial ?? 0)}/mês de base
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Custo fixo completo</p>
                <AutonomiaDisplay meses={data?.mesesAutonomiaFixo ?? null} />
                <p className="text-xs text-slate-500 mt-1">
                  {formatCurrency(data?.custoFixo ?? 0)}/mês de base
                </p>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1.5">Patrimônio atual</p>
                <p className="text-xl font-bold font-mono text-white">
                  {formatCurrency(data?.patrimonio ?? 0)}
                </p>
              </div>

              {(data?.mesesAutonomiaEssencial ?? 0) < 6 && (
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

          {/* ─── Blocos detalhados por tipo ──────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
              const block = data?.byType[key];
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

          {/* ─── Tabela detalhada ────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Todas as Recorrências de Despesa</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-rose-400" /> = obrigatório
                </span>
                {" · "}
                <span className="inline-flex items-center gap-1">
                  <Circle className="w-3 h-3 text-slate-300" /> = opcional
                </span>
              </p>
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
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide"></th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Descrição</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Categoria</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Frequência</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Pagamento</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Valor/Mês</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                      const block = data?.byType[key];
                      if (!block || block.items.length === 0) return null;
                      const Icon = cfg.icon;
                      return block.items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-3">
                            {item.obrigatorio
                              ? <CheckCircle className="w-3.5 h-3.5 text-rose-400" />
                              : <Circle className="w-3.5 h-3.5 text-slate-300" />
                            }
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-800">{item.descricao}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{item.categoriaName ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                              cfg.bg, cfg.color
                            )}>
                              <Icon className="w-2.5 h-2.5" />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs capitalize">{item.frequencia}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs capitalize">{item.formaPagamento ?? "—"}</td>
                          <td className="px-5 py-3 text-right font-bold text-slate-800 font-mono">
                            {formatCurrency(item.valor)}
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                    <tr>
                      <td colSpan={6} className="px-5 py-3 text-sm font-bold text-slate-700">Total mensal</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900 font-mono text-base">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}
