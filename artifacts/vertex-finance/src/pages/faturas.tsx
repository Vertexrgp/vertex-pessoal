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
  BarChart3,
  Receipt,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PremiumCard } from "./cartoes";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

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

  const prevMonth = () => setMonth(m => m === 1 ? 12 : m - 1);
  const nextMonth = () => setMonth(m => m === 12 ? 1 : m + 1);

  const fatura = faturaData?.fatura;
  const items = faturaData?.items ?? [];
  const nextInvoices = faturaData?.nextInvoices ?? [];
  const selectedCard = cards?.find(c => c.id === selectedCardId);

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
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
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
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300 mb-8">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum cartão cadastrado.</p>
          <Link href="/cartoes">
            <Button className="mt-4 gap-2">
              <CreditCard className="w-4 h-4" /> Cadastrar Cartão
            </Button>
          </Link>
        </div>
      )}

      {/* Prompt to select */}
      {cards && cards.length > 0 && !selectedCardId && (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Selecione um cartão para ver a fatura</p>
          <p className="text-slate-400 text-sm mt-1">Clique em um dos cartões acima</p>
        </div>
      )}

      {selectedCardId && selectedCard && (
        <>
          {/* Month Selector */}
          <div className="flex items-center justify-between gap-4 mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
            <button onClick={prevMonth} className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900">{MONTH_NAMES[month - 1]} {year}</p>
              {fatura && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Vencimento: <span className="font-medium text-slate-600">{formatDate(fatura.vencimento)}</span>
                  {" "}·{" "}
                  Ciclo: <span className="font-medium text-slate-600">{formatDate(fatura.cycleStart)} – {formatDate(fatura.cycleEnd)}</span>
                </p>
              )}
            </div>
            <button onClick={nextMonth} className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {isFaturaLoading ? (
            <div className="text-center py-12 text-slate-400">Carregando fatura...</div>
          ) : fatura && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                  { label: "Total da Fatura", value: fatura.totalFatura, color: "text-slate-900" },
                  { label: "Pago", value: fatura.totalPago, color: "text-emerald-600" },
                  { label: "Em Aberto", value: fatura.totalAberto, color: "text-rose-600" },
                  { label: "Próxima Fatura", value: fatura.proximaFatura, color: "text-amber-600" },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{kpi.label}</p>
                    <p className={cn("text-2xl font-bold mt-1.5 tabular-nums", kpi.color)}>{formatCurrency(kpi.value)}</p>
                  </div>
                ))}
              </div>

              {/* Limit Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-700">Limite do Cartão</p>
                  <div className="text-xs text-slate-400 text-right">
                    <span className="font-semibold text-slate-700">{formatCurrency(fatura.limiteUtilizado)}</span> utilizados de <span className="font-semibold text-slate-700">{formatCurrency(fatura.limiteTotal)}</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={cn(
                      "h-2.5 rounded-full transition-all duration-700",
                      (fatura.limiteUtilizado / fatura.limiteTotal) > 0.8 ? "bg-rose-500" :
                      (fatura.limiteUtilizado / fatura.limiteTotal) > 0.5 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(100, (fatura.limiteUtilizado / fatura.limiteTotal) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2.5 text-xs">
                  <span className="text-slate-400">
                    Disponível: <span className="font-semibold text-emerald-600">{formatCurrency(fatura.limiteDisponivel)}</span>
                  </span>
                  <span className="text-slate-400">
                    Parcelado futuro: <span className="font-semibold text-violet-600">{formatCurrency(fatura.totalParceladoFuturo)}</span>
                  </span>
                </div>
              </div>

              {/* Invoice Items Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Itens da Fatura</h3>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                    {items.length} lançamento{items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {items.length === 0 ? (
                  <div className="py-14 text-center text-slate-400">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma compra nesta fatura.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-3.5 text-left font-semibold">Data</th>
                          <th className="px-5 py-3.5 text-left font-semibold">Descrição</th>
                          <th className="px-5 py-3.5 text-center font-semibold">Tipo</th>
                          <th className="px-5 py-3.5 text-center font-semibold">Parcela</th>
                          <th className="px-5 py-3.5 text-right font-semibold">Valor</th>
                          <th className="px-5 py-3.5 text-center font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3.5 text-slate-400 text-xs font-medium whitespace-nowrap">
                              {formatDate(item.competenceDate)}
                            </td>
                            <td className="px-5 py-3.5 font-medium text-slate-900">{item.description}</td>
                            <td className="px-5 py-3.5 text-center">
                              {item.creditType === "parcelado" ? (
                                <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-100">Parcelado</span>
                              ) : (
                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">À vista</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              {item.totalInstallments && item.currentInstallment ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200">
                                  <Layers className="w-3 h-3" /> {item.currentInstallment}/{item.totalInstallments}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right font-bold text-rose-600 tabular-nums">
                              -{formatCurrency(item.amount)}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex justify-center">
                                <StatusBadge status={item.status} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td colSpan={4} className="px-5 py-3.5 text-sm font-semibold text-slate-700">Total da Fatura</td>
                          <td className="px-5 py-3.5 text-right font-bold text-slate-900 text-base tabular-nums">
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
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-slate-900">Previsão de Próximas Faturas</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {nextInvoices.map((inv, i) => (
                      <div
                        key={`${inv.month}-${inv.year}`}
                        className={cn(
                          "rounded-2xl p-5 border",
                          i === 0 ? "border-primary/20 bg-primary/5" : "border-slate-100 bg-slate-50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-bold text-slate-700">{MONTH_NAMES[inv.month - 1]}</p>
                          {i === 0 && (
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Próxima</span>
                          )}
                        </div>
                        <p className={cn("text-2xl font-bold tabular-nums", i === 0 ? "text-primary" : "text-slate-800")}>
                          {formatCurrency(inv.total)}
                        </p>
                        {inv.installmentCount > 0 && (
                          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {inv.installmentCount} parcela{inv.installmentCount !== 1 ? "s" : ""}
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
