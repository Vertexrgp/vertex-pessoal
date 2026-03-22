import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useListCreditCards,
  useGetCreditCardFatura,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  BarChart3,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function BandeiraBadge({ bandeira }: { bandeira: string }) {
  const colors: Record<string, string> = {
    Visa: "bg-blue-100 text-blue-800",
    Mastercard: "bg-orange-100 text-orange-800",
    Elo: "bg-yellow-100 text-yellow-800",
    Amex: "bg-indigo-100 text-indigo-800",
    Hipercard: "bg-red-100 text-red-800",
    Outros: "bg-slate-100 text-slate-600",
  };
  return <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", colors[bandeira] ?? colors.Outros)}>{bandeira}</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> Pago
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3 h-3" /> Em aberto
    </span>
  );
}

export default function FaturasPage() {
  const now = new Date();
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  const { data: cards } = useListCreditCards();
  const { data: faturaData, isLoading: isFaturaLoading } = useGetCreditCardFatura(
    selectedCardId ?? 0,
    { month, year },
    { query: { enabled: !!selectedCardId } }
  );

  const selectedCard = cards?.find(c => c.id === selectedCardId);
  const prevMonth = () => setMonth(m => m === 1 ? 12 : m - 1);
  const nextMonth = () => setMonth(m => m === 12 ? 1 : m + 1);

  const fatura = faturaData?.fatura;
  const items = faturaData?.items ?? [];
  const nextInvoices = faturaData?.nextInvoices ?? [];

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Faturas</h1>
          <p className="text-slate-500 mt-1">Controle de faturas por cartão de crédito.</p>
        </div>
        <Link href="/cartoes">
          <Button variant="outline" className="rounded-xl gap-2">
            <CreditCard className="w-4 h-4" /> Gerenciar Cartões <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {/* Card Selector */}
      {cards && cards.length > 0 ? (
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {cards.map(card => (
            <div
              key={card.id}
              onClick={() => setSelectedCardId(card.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === "Enter" && setSelectedCardId(card.id)}
              className={cn(
                "flex-shrink-0 relative rounded-2xl p-4 w-52 cursor-pointer text-left transition-all duration-200",
                selectedCardId === card.id
                  ? "shadow-xl scale-[1.03]"
                  : "hover:scale-[1.01] hover:shadow-md opacity-75 hover:opacity-100"
              )}
              style={{ backgroundColor: card.cor }}
            >
              {selectedCardId === card.id && (
                <div className="absolute inset-0 rounded-2xl ring-2 ring-white ring-offset-2" style={{ ringColor: card.cor }} />
              )}
              <div className="flex justify-between items-start mb-6">
                <CreditCard className="w-6 h-6 text-white/90" />
                <BandeiraBadge bandeira={card.bandeira} />
              </div>
              <p className="text-white font-bold text-sm truncate">{card.nomeCartao}</p>
              <p className="text-white/70 text-xs mt-0.5">{card.banco}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300 mb-8">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum cartão cadastrado.</p>
          <Link href="/cartoes">
            <Button className="mt-4">
              <CreditCard className="w-4 h-4 mr-2" /> Cadastrar Cartão
            </Button>
          </Link>
        </div>
      )}

      {/* Prompt to select card */}
      {cards && cards.length > 0 && !selectedCardId && (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Selecione um cartão para ver a fatura</p>
        </div>
      )}

      {selectedCardId && selectedCard && (
        <>
          {/* Month Selector */}
          <div className="flex items-center gap-4 mb-6">
            <button onClick={prevMonth} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div className="text-center min-w-[200px]">
              <p className="text-lg font-bold text-slate-900">{MONTH_NAMES[month - 1]} {year}</p>
              {fatura && (
                <p className="text-xs text-slate-500">Venc. {formatDate(fatura.vencimento)} • Ciclo: {formatDate(fatura.cycleStart)} – {formatDate(fatura.cycleEnd)}</p>
              )}
            </div>
            <button onClick={nextMonth} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {isFaturaLoading ? (
            <div className="text-center py-12 text-slate-400">Carregando fatura...</div>
          ) : fatura && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total da Fatura</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(fatura.totalFatura)}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pago</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(fatura.totalPago)}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Em Aberto</p>
                  <p className="text-2xl font-bold text-rose-600 mt-1">{formatCurrency(fatura.totalAberto)}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Próx. Fatura</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(fatura.proximaFatura)}</p>
                </div>
              </div>

              {/* Limit Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-700">Limite do Cartão</p>
                  <span className="text-xs text-slate-500">
                    {formatCurrency(fatura.limiteUtilizado)} de {formatCurrency(fatura.limiteTotal)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div
                    className={cn(
                      "h-3 rounded-full transition-all duration-500",
                      (fatura.limiteUtilizado / fatura.limiteTotal) > 0.8 ? "bg-rose-500" :
                      (fatura.limiteUtilizado / fatura.limiteTotal) > 0.5 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(100, (fatura.limiteUtilizado / fatura.limiteTotal) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-slate-500">Disponível: <span className="font-semibold text-emerald-600">{formatCurrency(fatura.limiteDisponivel)}</span></span>
                  <span className="text-slate-500">Parcelado futuro: <span className="font-semibold text-violet-600">{formatCurrency(fatura.totalParceladoFuturo)}</span></span>
                </div>
              </div>

              {/* Invoice Items Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Itens da Fatura</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{items.length} lançamentos no período</p>
                  </div>
                </div>
                {items.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhuma compra nesta fatura.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-3 text-left">Data</th>
                          <th className="px-5 py-3 text-left">Descrição</th>
                          <th className="px-5 py-3 text-left">Tipo</th>
                          <th className="px-5 py-3 text-right">Valor</th>
                          <th className="px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-3 text-slate-500 text-xs">{formatDate(item.competenceDate)}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900">{item.description}</span>
                                {item.totalInstallments && item.currentInstallment && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                                    <Layers className="w-3 h-3" /> {item.currentInstallment}/{item.totalInstallments}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              {item.creditType === "parcelado" ? (
                                <span className="text-xs font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded">Parcelado</span>
                              ) : (
                                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">À Vista</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-rose-600">
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
                      <tfoot className="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-slate-700">Total</td>
                          <td className="px-5 py-3 text-right font-bold text-slate-900 text-base">
                            -{formatCurrency(fatura.totalFatura)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Next Invoices Forecast */}
              {nextInvoices.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-slate-900">Previsão de Próximas Faturas</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {nextInvoices.map((inv, i) => (
                      <div
                        key={`${inv.month}-${inv.year}`}
                        className={cn(
                          "rounded-xl p-4 border",
                          i === 0 ? "border-primary/30 bg-primary/5" : "border-slate-100 bg-slate-50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-slate-700">{MONTH_NAMES[inv.month - 1]}</p>
                          {i === 0 && <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Próxima</span>}
                        </div>
                        <p className={cn("text-2xl font-bold", i === 0 ? "text-primary" : "text-slate-800")}>
                          {formatCurrency(inv.total)}
                        </p>
                        {inv.installmentCount > 0 && (
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Layers className="w-3 h-3" /> {inv.installmentCount} parcela{inv.installmentCount !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </AppLayout>
  );
}
