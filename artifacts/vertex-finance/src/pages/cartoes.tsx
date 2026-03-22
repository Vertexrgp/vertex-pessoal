import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListCreditCards,
  useCreateCreditCard,
  useUpdateCreditCard,
  useDeleteCreditCard,
} from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const BANDEIRAS = ["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Outros"];
const CARD_COLORS = ["#6366F1", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#7C3AED", "#64748B"];

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

export default function CartoesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const { toast } = useToast();

  const { data: cards, refetch } = useListCreditCards();

  const createMutation = useCreateCreditCard({
    mutation: { onSuccess: () => { toast({ title: "Cartão criado!" }); setIsModalOpen(false); refetch(); } }
  });
  const updateMutation = useUpdateCreditCard({
    mutation: { onSuccess: () => { toast({ title: "Cartão atualizado!" }); setIsModalOpen(false); setEditingCard(null); refetch(); } }
  });
  const deleteMutation = useDeleteCreditCard({
    mutation: { onSuccess: () => { toast({ title: "Cartão excluído." }); refetch(); } }
  });

  const form = useForm<CardForm>({
    resolver: zodResolver(cardSchema),
    defaultValues: { cor: "#6366F1", ativo: true, bandeira: "Visa", limiteTotal: 5000, diaFechamento: 5, diaVencimento: 12 },
  });

  const onSubmit = (values: CardForm) => {
    if (editingCard) {
      updateMutation.mutate({ id: editingCard.id, data: values });
    } else {
      createMutation.mutate({ data: values });
    }
  };

  const openNew = () => {
    setEditingCard(null);
    form.reset({ cor: "#6366F1", ativo: true, bandeira: "Visa", limiteTotal: 5000, diaFechamento: 5, diaVencimento: 12 });
    setIsModalOpen(true);
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
    setIsModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Cartões Cadastrados</h1>
          <p className="text-slate-500 mt-1">Gerencie seus cartões de crédito.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/faturas">
            <Button variant="outline" className="rounded-xl gap-2">
              <Receipt className="w-4 h-4" /> Ver Faturas <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md shadow-primary/20" onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Novo Cartão
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Cartões</p>
          <p className="text-3xl font-bold text-slate-900">{cards?.length ?? 0}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Limite Total</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(cards?.reduce((a, c) => a + c.limiteTotal, 0) ?? 0)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Ativos</p>
          <p className="text-3xl font-bold text-emerald-600">{cards?.filter(c => c.ativo).length ?? 0}</p>
        </div>
      </div>

      {/* Card Grid */}
      {cards && cards.length > 0 ? (
        <>
          <div className="flex gap-4 mb-8 flex-wrap">
            {cards.map(card => (
              <div
                key={card.id}
                className="relative rounded-2xl p-5 w-56 group shadow-md transition-all hover:shadow-xl hover:scale-[1.02]"
                style={{ backgroundColor: card.cor }}
              >
                <div className="flex justify-between items-start mb-8">
                  <CreditCard className="w-7 h-7 text-white/90" />
                  <BandeiraBadge bandeira={card.bandeira} />
                </div>
                <p className="text-white font-bold">{card.nomeCartao}</p>
                <p className="text-white/70 text-xs mt-0.5 mb-3">{card.banco}</p>
                <p className="text-white/90 text-sm font-semibold">{formatCurrency(card.limiteTotal)}</p>
                <p className="text-white/50 text-xs">Fecha dia {card.diaFechamento} • Vence dia {card.diaVencimento}</p>

                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => openEdit(card)}
                    className="p-1.5 bg-white/20 rounded-lg hover:bg-white/40 transition-colors"
                  >
                    <Edit2 className="w-3 h-3 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (confirm(`Excluir cartão "${card.nomeCartao}"?`)) deleteMutation.mutate({ id: card.id }); }}
                    className="p-1.5 bg-white/20 rounded-lg hover:bg-red-500/60 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>

                {!card.ativo && (
                  <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                    <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full">Inativo</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Table view */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Detalhes dos Cartões</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Cartão</th>
                    <th className="px-6 py-3 text-left font-medium">Banco / Bandeira</th>
                    <th className="px-6 py-3 text-right font-medium">Limite</th>
                    <th className="px-6 py-3 text-center font-medium">Fechamento</th>
                    <th className="px-6 py-3 text-center font-medium">Vencimento</th>
                    <th className="px-6 py-3 text-center font-medium">Status</th>
                    <th className="px-6 py-3 text-center font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cards.map(card => (
                    <tr key={card.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: card.cor }} />
                          <span className="font-medium text-slate-900">{card.nomeCartao}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {card.banco} · <BandeiraBadge bandeira={card.bandeira} />
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(card.limiteTotal)}</td>
                      <td className="px-6 py-4 text-center text-slate-500">Dia {card.diaFechamento}</td>
                      <td className="px-6 py-4 text-center text-slate-500">Dia {card.diaVencimento}</td>
                      <td className="px-6 py-4 text-center">
                        {card.ativo ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Ativo</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-500">Inativo</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openEdit(card)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4 text-slate-500" />
                          </button>
                          <button onClick={() => { if (confirm(`Excluir "${card.nomeCartao}"?`)) deleteMutation.mutate({ id: card.id }); }} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <CreditCard className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium text-lg mb-2">Nenhum cartão cadastrado ainda</p>
          <p className="text-slate-400 text-sm mb-6">Adicione seus cartões para controlar faturas e parcelamentos.</p>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar Primeiro Cartão
          </Button>
        </div>
      )}

      {/* Card Modal */}
      <Dialog open={isModalOpen} onOpenChange={open => { setIsModalOpen(open); if (!open) setEditingCard(null); }}>
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
                disabled={createMutation.isPending || updateMutation.isPending}
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
