import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListCreditCards,
  useGetCreditCardFatura,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  CheckCircle2,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Receipt,
  ArrowRight,
  CreditCard,
  Wallet,
  Calendar,
  ShoppingCart,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PremiumCard } from "./cartoes";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];
const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Pago
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3 h-3" /> Em aberto
    </span>
  );
}

function ItemTable({ items, emptyMessage }: { items: any[]; emptyMessage: string }) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-slate-400 text-sm">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
          <tr>
            <th className="px-5 py-3 text-left font-semibold">Data</th>
            <th className="px-5 py-3 text-left font-semibold">Descrição</th>
            <th className="px-5 py-3 text-center font-semibold">Parcela</th>
            <th className="px-5 py-3 text-right font-semibold">Valor</th>
            <th className="px-5 py-3 text-center font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map(item => (
            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-5 py-3 text-slate-400 text-xs font-medium whitespace-nowrap">
                {formatDate(item.competenceDate)}
              </td>
              <td className="px-5 py-3 font-medium text-slate-900">{item.description}</td>
              <td className="px-5 py-3 text-center">
                {item.totalInstallments && item.currentInstallment ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200">
                    <Layers className="w-3 h-3" /> {item.currentInstallment}/{item.totalInstallments}
                  </span>
                ) : (
                  <span className="text-slate-300 text-xs">—</span>
                )}
              </td>
              <td className="px-5 py-3 text-right font-bold text-rose-600 tabular-nums">
                -{formatCurrency(item.amount)}
              </td>
              <td className="px-5 py-3">
                <div className="flex justify-center">
                  <StatusBadge status={item.status} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-slate-200 bg-slate-50/50">
          <tr>
            <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-slate-500">
              Subtotal — {items.length} item{items.length !== 1 ? "s" : ""}
            </td>
            <td className="px-5 py-3 text-right font-bold text-slate-800 tabular-nums">
              -{formatCurrency(items.reduce((a, i) => a + i.amount, 0))}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function FaturasPage() {
  const now = new Date();
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: cards } = useListCreditCards();
  const { data: faturaData, isLoading: isFaturaLoading } = useGetCreditCardFatura(
    selectedCardId ?? 0,
    { month, year },
    { query: { enabled: !!selectedCardId } }
  );

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const fatura = faturaData?.fatura;
  const items = faturaData?.items ?? [];
  const nextInvoices = faturaData?.nextInvoices ?? [];
  const selectedCard = cards?.find(c => c.id === selectedCardId);

  const avistaItems = items.filter(i => i.creditType !== "parcelado");
  const parceladoItems = items.filter(i => i.creditType === "parcelado");
  const usagePercent = fatura ? Math.min(100, (fatura.limiteUtilizado / fatura.limiteTotal) * 100) : 0;
  const usageColor = usagePercent > 80 ? "bg-rose-500" : usagePercent > 50 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <AppLayout>
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Faturas</h1>
          <p className="text-slate-500 mt-1 text-sm">Controle de faturas e limites por cartão.</p>
        </div>
        <Link href="/cartoes">
          <Button variant="outline" className="rounded-xl gap-2 text-sm">
            <CreditCard className="w-4 h-4" /> Gerenciar Cartões <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {/* ── Card Selector ── */}
      {cards && cards.length > 0 ? (
        <div className="flex gap-4 mb-6 overflow-x-auto pb-1">
          {cards.map(card => (
            <PremiumCard
              key={card.id}
              card={card}
              size="sm"
              selected={selectedCardId === card.id}
              onClick={() => setSelectedCardId(card.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300 mb-6">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium mb-4">Nenhum cartão cadastrado.</p>
          <Link href="/cartoes">
            <Button className="gap-2"><CreditCard className="w-4 h-4" /> Cadastrar Cartão</Button>
          </Link>
        </div>
      )}

      {/* ── Empty State ── */}
      {cards && cards.length > 0 && !selectedCardId && (
        <div className="text-center py-20 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">Selecione um cartão para ver a fatura</p>
          <p className="text-slate-400 text-sm mt-1">Clique em um dos cartões acima</p>
        </div>
      )}

      {selectedCardId && selectedCard && (
        <>
          {/* ── Month Navigator ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-5 flex items-center justify-between gap-4">
            <button
              onClick={prevMonth}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-slate-900 leading-tight">{MONTH_NAMES[month - 1]} {year}</p>
              {fatura && (
                <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Vencimento <span className="font-semibold text-slate-600">{formatDate(fatura.vencimento)}</span>
                  </span>
                  <span className="text-slate-200">·</span>
                  <span>Ciclo <span className="font-semibold text-slate-600">{formatDate(fatura.cycleStart)} – {formatDate(fatura.cycleEnd)}</span></span>
                </p>
              )}
            </div>
            <button
              onClick={nextMonth}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 active:scale-95 transition-all"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {isFaturaLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
              <div className="w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
              Carregando fatura...
            </div>
          ) : fatura ? (
            <>
              {/* ── Hero: Fatura Total + Card Info ── */}
              <div
                className="rounded-2xl p-6 mb-5 relative overflow-hidden text-white"
                style={{ backgroundColor: selectedCard.cor }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/30 pointer-events-none" />
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Total da Fatura</p>
                    <p className="text-5xl font-extrabold tabular-nums tracking-tight">{formatCurrency(fatura.totalFatura)}</p>
                    <p className="text-white/70 text-sm mt-2">
                      {selectedCard.nomeCartao} · {selectedCard.banco}
                    </p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-1.5">
                    {fatura.totalPago > 0 && (
                      <span className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                        Pago: {formatCurrency(fatura.totalPago)}
                      </span>
                    )}
                    {fatura.totalAberto > 0 && (
                      <span className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5 text-amber-300" />
                        Em aberto: {formatCurrency(fatura.totalAberto)}
                      </span>
                    )}
                    <span className="text-white/50 text-xs">Vence em {formatDate(fatura.vencimento)}</span>
                  </div>
                </div>
              </div>

              {/* ── KPI Grid ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                  { icon: Wallet, label: "Limite Total", value: fatura.limiteTotal, color: "text-slate-900", bg: "bg-slate-50" },
                  { icon: ShoppingCart, label: "Limite Utilizado", value: fatura.limiteUtilizado, color: "text-rose-600", bg: "bg-rose-50" },
                  { icon: CheckCircle2, label: "Disponível", value: fatura.limiteDisponivel, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { icon: TrendingUp, label: "Parcelado Futuro", value: fatura.totalParceladoFuturo, color: "text-violet-600", bg: "bg-violet-50" },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-3", kpi.bg)}>
                      <kpi.icon className={cn("w-4 h-4", kpi.color)} />
                    </div>
                    <p className="text-xs font-medium text-slate-400 mb-1">{kpi.label}</p>
                    <p className={cn("text-xl font-bold tabular-nums", kpi.color)}>{formatCurrency(kpi.value)}</p>
                  </div>
                ))}
              </div>

              {/* ── Limit Usage Bar ── */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">Uso do Limite</p>
                  </div>
                  <span className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-full",
                    usagePercent > 80 ? "bg-rose-100 text-rose-700" :
                    usagePercent > 50 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                  )}>
                    {usagePercent.toFixed(0)}% utilizado
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={cn("h-3 rounded-full transition-all duration-700", usageColor)}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-3 text-xs">
                  <span className="text-slate-500">
                    Utilizado: <span className="font-bold text-slate-700">{formatCurrency(fatura.limiteUtilizado)}</span>
                  </span>
                  <span className="text-slate-500">
                    Disponível: <span className="font-bold text-emerald-600">{formatCurrency(fatura.limiteDisponivel)}</span>
                  </span>
                  <span className="text-slate-500">
                    Total: <span className="font-bold text-slate-700">{formatCurrency(fatura.limiteTotal)}</span>
                  </span>
                </div>
              </div>

              {/* ── BLOCK 1: Compras à Vista ── */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    <h3 className="font-semibold text-slate-800 text-sm">Compras à Vista</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{avistaItems.length} item{avistaItems.length !== 1 ? "s" : ""}</span>
                    {avistaItems.length > 0 && (
                      <span className="text-sm font-bold text-rose-600 tabular-nums">
                        -{formatCurrency(avistaItems.reduce((a, i) => a + i.amount, 0))}
                      </span>
                    )}
                  </div>
                </div>
                <ItemTable items={avistaItems} emptyMessage="Nenhuma compra à vista neste período." />
              </div>

              {/* ── BLOCK 2: Parcelas deste Mês ── */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                    <h3 className="font-semibold text-slate-800 text-sm">Parcelas deste Mês</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{parceladoItems.length} parcela{parceladoItems.length !== 1 ? "s" : ""}</span>
                    {parceladoItems.length > 0 && (
                      <span className="text-sm font-bold text-rose-600 tabular-nums">
                        -{formatCurrency(parceladoItems.reduce((a, i) => a + i.amount, 0))}
                      </span>
                    )}
                  </div>
                </div>
                <ItemTable items={parceladoItems} emptyMessage="Nenhuma parcela neste período." />
              </div>

              {/* ── Total Footer ── */}
              {items.length > 0 && (
                <div className="bg-slate-900 rounded-2xl px-6 py-4 mb-5 flex items-center justify-between">
                  <p className="text-slate-300 text-sm font-medium">Total da Fatura · {items.length} lançamento{items.length !== 1 ? "s" : ""}</p>
                  <p className="text-white text-2xl font-extrabold tabular-nums">
                    -{formatCurrency(fatura.totalFatura)}
                  </p>
                </div>
              )}

              {/* ── BLOCK 3: Previsão de Próximas Faturas ── */}
              {nextInvoices.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Previsão de Próximas Faturas</h3>
                      <p className="text-xs text-slate-400">Baseado nas parcelas e compras futuras cadastradas</p>
                    </div>
                  </div>

                  {/* Chart-style bar visualization */}
                  <div className="grid grid-cols-3 gap-4">
                    {nextInvoices.map((inv, i) => {
                      const maxTotal = Math.max(...nextInvoices.map(n => n.total), 1);
                      const barHeight = Math.round((inv.total / maxTotal) * 100);
                      return (
                        <div key={`${inv.month}-${inv.year}`} className={cn(
                          "rounded-2xl p-5 border transition-all",
                          i === 0 ? "border-primary/30 bg-primary/5 shadow-sm" : "border-slate-100 bg-slate-50"
                        )}>
                          <div className="flex items-center justify-between mb-4">
                            <span className={cn(
                              "text-sm font-bold",
                              i === 0 ? "text-primary" : "text-slate-600"
                            )}>
                              {MONTH_SHORT[inv.month - 1]}
                            </span>
                            {i === 0 && (
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Próxima
                              </span>
                            )}
                          </div>

                          {/* Mini bar */}
                          <div className="w-full bg-white rounded-full h-1.5 mb-4 overflow-hidden border border-slate-100">
                            <div
                              className={cn("h-full rounded-full", i === 0 ? "bg-primary" : "bg-slate-300")}
                              style={{ width: `${barHeight}%` }}
                            />
                          </div>

                          <p className={cn(
                            "text-2xl font-extrabold tabular-nums",
                            i === 0 ? "text-primary" : "text-slate-700"
                          )}>
                            {formatCurrency(inv.total)}
                          </p>

                          {inv.installmentCount > 0 ? (
                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {inv.installmentCount} parcela{inv.installmentCount !== 1 ? "s" : ""} futuras
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 mt-2">Sem parcelas</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Parcelado futuro total */}
                  {fatura.totalParceladoFuturo > 0 && (
                    <div className="mt-4 flex items-center justify-between bg-violet-50 rounded-xl px-5 py-3.5 border border-violet-100">
                      <span className="flex items-center gap-2 text-sm text-violet-700 font-medium">
                        <Layers className="w-4 h-4" />
                        Total comprometido em parcelas futuras
                      </span>
                      <span className="font-bold text-violet-800 tabular-nums text-lg">
                        {formatCurrency(fatura.totalParceladoFuturo)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhuma fatura encontrada para este período.</p>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
