import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListCreditCards,
  useGetCreditCardFatura,
  useCreateCreditCard,
  useUpdateCreditCard,
  useDeleteCreditCard,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Layers,
  Plus,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const BANDEIRAS = ["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Outros"];
const CARD_COLORS = ["#6366F1", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#64748B"];

const cardSchema = z.object({
  nomeCartao: z.string().min(2, "Nome obrigatório"),
  banco: z.string().min(2, "Banco obrigatório"),
  bandeira: z.enum(["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Outros"]),
  limiteTotal: z.coerce.number().min(0),
  diaFechamento: z.coerce.number().int().min(1).max(31),
  diaVencimento: z.coerce.number().int().min(1).max(31),
  cor: z.string().default("#6366F1"),
  ativo: z.boolean().default(true),
});
type CardForm = z.infer<typeof cardSchema>;

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

export default function CreditCardsPage() {
  const now = new Date();
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const { toast } = useToast();

  const { data: cards, refetch: refetchCards } = useListCreditCards();
  const { data: faturaData, isLoading: isFaturaLoading } = useGetCreditCardFatura(
    selectedCardId ?? 0,
    { month, year },
    { query: { enabled: !!selectedCardId } }
  );

  const createCardMutation = useCreateCreditCard({
    mutation: { onSuccess: () => { toast({ title: "Cartão criado!" }); setIsCardModalOpen(false); refetchCards(); } }
  });
  const updateCardMutation = useUpdateCreditCard({
    mutation: { onSuccess: () => { toast({ title: "Cartão atualizado!" }); setIsCardModalOpen(false); setEditingCard(null); refetchCards(); } }
  });
  const deleteCardMutation = useDeleteCreditCard({
    mutation: { onSuccess: () => { toast({ title: "Cartão excluído." }); refetchCards(); if (selectedCardId) setSelectedCardId(null); } }
  });

  const form = useForm<CardForm>({
    resolver: zodResolver(cardSchema),
    defaultValues: { cor: "#6366F1", ativo: true, bandeira: "Visa", limiteTotal: 5000, diaFechamento: 5, diaVencimento: 12 },
  });

  const selectedCard = cards?.find(c => c.id === selectedCardId);

  const onSubmit = (values: CardForm) => {
    if (editingCard) {
      updateCardMutation.mutate({ id: editingCard.id, data: values });
    } else {
      createCardMutation.mutate({ data: values });
    }
  };

  const openEdit = (card: any) => {
    setEditingCard(card);
    form.reset({
      nomeCartao: card.nomeCartao,
      banco: card.banco,
      bandeira: card.bandeira,
      limiteTotal: card.limiteTotal,
      diaFechamento: card.diaFechamento,
      diaVencimento: card.diaVencimento,
      cor: card.cor,
      ativo: card.ativo,
    });
    setIsCardModalOpen(true);
  };

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
          <h1 className="text-3xl font-bold text-slate-900">Cartões de Crédito</h1>
          <p className="text-slate-500 mt-1">Controle suas faturas, limites e parcelamentos.</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md shadow-primary/20"
          onClick={() => { setEditingCard(null); form.reset({ cor: "#6366F1", ativo: true, bandeira: "Visa", limiteTotal: 5000, diaFechamento: 5, diaVencimento: 12 }); setIsCardModalOpen(true); }}
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Cartão
        </Button>
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
                "flex-shrink-0 group relative rounded-2xl p-4 w-52 cursor-pointer text-left transition-all duration-200",
                selectedCardId === card.id
                  ? "ring-2 ring-offset-2 shadow-lg scale-[1.02]"
                  : "hover:scale-[1.01] hover:shadow-md opacity-80 hover:opacity-100"
              )}
              style={{
                backgroundColor: card.cor,
                outline: selectedCardId === card.id ? `2px solid ${card.cor}` : undefined,
              }}
            >
              <div className="flex justify-between items-start mb-6">
                <CreditCard className="w-6 h-6 text-white/90" />
                <BandeiraBadge bandeira={card.bandeira} />
              </div>
              <p className="text-white font-bold text-sm truncate">{card.nomeCartao}</p>
              <p className="text-white/70 text-xs mt-0.5">{card.banco}</p>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); openEdit(card); }}
                  className="p-1 bg-white/20 rounded hover:bg-white/30"
                >
                  <Edit2 className="w-3 h-3 text-white" />
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); if (confirm("Excluir cartão?")) deleteCardMutation.mutate({ id: card.id }); }}
                  className="p-1 bg-white/20 rounded hover:bg-red-500/60"
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300 mb-8">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum cartão cadastrado ainda.</p>
          <Button className="mt-4" onClick={() => setIsCardModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar Primeiro Cartão
          </Button>
        </div>
      )}

      {selectedCardId && selectedCard && (
        <>
          {/* Month Selector */}
          <div className="flex items-center gap-4 mb-6">
            <button onClick={prevMonth} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div className="text-center min-w-[180px]">
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
                    {formatCurrency(fatura.limiteUtilizado)} utilizados de {formatCurrency(fatura.limiteTotal)}
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
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Itens da Fatura</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{items.length} lançamentos no período</p>
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

              {/* Next Invoices */}
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
                          <p className="text-sm font-semibold text-slate-700">
                            {MONTH_NAMES[inv.month - 1]}
                          </p>
                          {i === 0 && <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Próxima</span>}
                        </div>
                        <p className={cn(
                          "text-2xl font-bold",
                          i === 0 ? "text-primary" : "text-slate-800"
                        )}>
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

      {/* Card Modal */}
      <Dialog open={isCardModalOpen} onOpenChange={open => { setIsCardModalOpen(open); if (!open) setEditingCard(null); }}>
        <DialogContent className="sm:max-w-[460px] bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingCard ? "Editar Cartão" : "Novo Cartão de Crédito"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="nomeCartao" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome do Cartão</FormLabel>
                    <FormControl><Input placeholder="Ex: Nubank Roxinho" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="banco" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banco / Emissor</FormLabel>
                    <FormControl><Input placeholder="Ex: Nubank" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bandeira" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bandeira</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {BANDEIRAS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="limiteTotal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite Total (R$)</FormLabel>
                  <FormControl><Input type="number" step="100" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="diaFechamento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia de Fechamento</FormLabel>
                    <FormControl><Input type="number" min={1} max={31} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="diaVencimento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia de Vencimento</FormLabel>
                    <FormControl><Input type="number" min={1} max={31} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="cor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor do Cartão</FormLabel>
                  <div className="flex gap-2 flex-wrap">
                    {CARD_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-transform",
                          field.value === color ? "border-slate-900 scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </FormItem>
              )} />
              <Button
                type="submit"
                className="w-full"
                disabled={createCardMutation.isPending || updateCardMutation.isPending}
              >
                {editingCard ? "Salvar Alterações" : "Criar Cartão"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
