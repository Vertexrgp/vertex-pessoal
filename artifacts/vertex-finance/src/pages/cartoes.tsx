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
import { CreditCard, Plus, Edit2, Trash2, Receipt, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export const BANDEIRAS = [
  "Visa", "Mastercard", "Elo", "American Express", "Hipercard", "Diners", "Outra"
] as const;

export const CARD_COLORS = [
  "#6366F1", "#8B5CF6", "#7C3AED",
  "#0EA5E9", "#0369A1",
  "#10B981", "#059669",
  "#F59E0B", "#F97316",
  "#EF4444", "#EC4899",
  "#14B8A6", "#64748B", "#0F172A",
];

const cardSchema = z.object({
  nomeCartao: z.string().min(2, "Nome obrigatório"),
  apelidoCartao: z.string().max(30).optional().or(z.literal("")).transform(v => v || undefined),
  banco: z.string().min(2, "Banco obrigatório"),
  bandeira: z.enum(["Visa", "Mastercard", "Elo", "American Express", "Hipercard", "Diners", "Outra"]),
  limiteTotal: z.coerce.number().min(0),
  diaFechamento: z.coerce.number().int().min(1).max(31),
  diaVencimento: z.coerce.number().int().min(1).max(31),
  cor: z.string().default("#6366F1"),
  ultimos4Digitos: z.string().regex(/^\d{4}$/, "Informe exatamente 4 dígitos"),
  ativo: z.boolean().default(true),
});
type CardForm = z.infer<typeof cardSchema>;

export function BandeiraBadge({ bandeira }: { bandeira: string }) {
  const styles: Record<string, string> = {
    Visa: "bg-blue-50 text-blue-700 border-blue-200",
    Mastercard: "bg-orange-50 text-orange-700 border-orange-200",
    Elo: "bg-yellow-50 text-yellow-700 border-yellow-200",
    "American Express": "bg-indigo-50 text-indigo-700 border-indigo-200",
    Hipercard: "bg-red-50 text-red-700 border-red-200",
    Diners: "bg-slate-100 text-slate-700 border-slate-200",
    Outra: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={cn(
      "text-[10px] font-bold px-2 py-0.5 rounded border tracking-wide uppercase",
      styles[bandeira] ?? styles.Outra
    )}>
      {bandeira}
    </span>
  );
}

export function PremiumCard({
  card,
  size = "md",
  selected = false,
  onClick,
  onEdit,
  onDelete,
}: {
  card: any;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}) {
  const sizeClasses = {
    sm: "w-44 h-28 p-4",
    md: "w-56 h-36 p-5",
    lg: "w-72 h-44 p-6",
  };

  const digits = card.ultimos4Digitos ? card.ultimos4Digitos : "——";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => e.key === "Enter" && onClick() : undefined}
      onClick={onClick}
      className={cn(
        "relative rounded-2xl flex-shrink-0 overflow-hidden group transition-all duration-200",
        sizeClasses[size],
        onClick ? "cursor-pointer" : "cursor-default",
        selected ? "shadow-2xl scale-[1.04] ring-2 ring-white ring-offset-2" : onClick && "hover:scale-[1.02] hover:shadow-xl opacity-80 hover:opacity-100"
      )}
      style={{ backgroundColor: card.cor }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />

      {/* Actions on hover */}
      {(onEdit || onDelete) && (
        <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onEdit && (
            <button type="button" onClick={onEdit} className="p-1.5 bg-black/20 backdrop-blur-sm rounded-lg hover:bg-black/40 transition-colors">
              <Edit2 className="w-3 h-3 text-white" />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} className="p-1.5 bg-black/20 backdrop-blur-sm rounded-lg hover:bg-red-500/60 transition-colors">
              <Trash2 className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
      )}

      {/* Chip + Bandeira */}
      <div className="relative flex items-start justify-between mb-auto">
        <div className="w-7 h-5 bg-white/30 rounded-sm border border-white/20 flex items-center justify-center">
          <div className="w-4 h-3 border border-white/40 rounded-[1px]" />
        </div>
        <BandeiraBadge bandeira={card.bandeira} />
      </div>

      {/* Card info */}
      <div className="absolute bottom-4 left-5 right-5">
        {card.apelidoCartao ? (
          <>
            <p className="text-white font-bold text-sm leading-tight truncate drop-shadow-sm">
              {card.banco} {card.apelidoCartao}
            </p>
            <p className="text-white/60 text-xs mt-0.5">{card.nomeCartao}</p>
          </>
        ) : (
          <>
            <p className="text-white font-bold text-sm leading-tight truncate drop-shadow-sm">{card.nomeCartao}</p>
            <p className="text-white/60 text-xs mt-0.5">{card.banco}</p>
          </>
        )}
        {size !== "sm" && (
          <div className="flex items-center justify-between mt-2">
            <p className="text-white/80 text-xs font-mono tracking-widest">•••• {digits}</p>
            <p className="text-white/70 text-xs font-semibold">{formatCurrency(card.limiteTotal)}</p>
          </div>
        )}
        {size === "sm" && (
          <p className="text-white/70 text-[10px] font-mono tracking-widest mt-1">•••• {digits}</p>
        )}
      </div>

      {/* Inactive overlay */}
      {!card.ativo && (
        <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center backdrop-blur-[1px]">
          <span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full border border-white/20">Inativo</span>
        </div>
      )}
    </div>
  );
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
    defaultValues: {
      cor: "#6366F1", ativo: true, bandeira: "Visa",
      limiteTotal: 5000, diaFechamento: 5, diaVencimento: 12,
      ultimos4Digitos: "", apelidoCartao: "",
    },
  });

  const watchedValues = form.watch();

  const onSubmit = (values: CardForm) => {
    if (editingCard) {
      updateMutation.mutate({ id: editingCard.id, data: values });
    } else {
      createMutation.mutate({ data: values });
    }
  };

  const openNew = () => {
    setEditingCard(null);
    form.reset({
      cor: "#6366F1", ativo: true, bandeira: "Visa",
      limiteTotal: 5000, diaFechamento: 5, diaVencimento: 12,
      ultimos4Digitos: "", apelidoCartao: "",
    });
    setIsModalOpen(true);
  };

  const openEdit = (card: any) => {
    setEditingCard(card);
    form.reset({
      nomeCartao: card.nomeCartao,
      apelidoCartao: card.apelidoCartao ?? "",
      banco: card.banco,
      bandeira: card.bandeira,
      limiteTotal: card.limiteTotal,
      diaFechamento: card.diaFechamento,
      diaVencimento: card.diaVencimento,
      cor: card.cor,
      ultimos4Digitos: card.ultimos4Digitos ?? "",
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
              <Receipt className="w-4 h-4" /> Faturas <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md shadow-primary/20" onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Novo Cartão
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Cartões Cadastrados</p>
          <p className="text-3xl font-bold text-slate-900">{cards?.length ?? 0}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Limite Total</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(cards?.reduce((a, c) => a + c.limiteTotal, 0) ?? 0)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Ativos</p>
          <p className="text-3xl font-bold text-emerald-600">{cards?.filter(c => c.ativo).length ?? 0}</p>
        </div>
      </div>

      {cards && cards.length > 0 ? (
        <>
          {/* Card grid */}
          <div className="flex gap-5 mb-8 flex-wrap">
            {cards.map(card => (
              <PremiumCard
                key={card.id}
                card={card}
                size="md"
                onEdit={e => { e.stopPropagation(); openEdit(card); }}
                onDelete={e => { e.stopPropagation(); if (confirm(`Excluir "${card.nomeCartao}"?`)) deleteMutation.mutate({ id: card.id }); }}
              />
            ))}
          </div>

          {/* Detail table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Detalhes</h3>
              <span className="text-xs text-slate-400">{cards.length} cartão{cards.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-400 uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Cartão</th>
                    <th className="px-6 py-3 text-left font-semibold">Banco</th>
                    <th className="px-6 py-3 text-left font-semibold">Bandeira</th>
                    <th className="px-6 py-3 text-center font-semibold">Últimos 4</th>
                    <th className="px-6 py-3 text-right font-semibold">Limite</th>
                    <th className="px-6 py-3 text-center font-semibold">Fechamento</th>
                    <th className="px-6 py-3 text-center font-semibold">Vencimento</th>
                    <th className="px-6 py-3 text-center font-semibold">Status</th>
                    <th className="px-6 py-3 text-center font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cards.map(card => (
                    <tr key={card.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-6 rounded-lg flex-shrink-0 shadow-sm" style={{ backgroundColor: card.cor }} />
                          <div>
                            <p className="font-semibold text-slate-900">
                              {(card as any).apelidoCartao
                                ? <>{card.banco} <span className="text-primary">{(card as any).apelidoCartao}</span></>
                                : card.nomeCartao}
                            </p>
                            {(card as any).apelidoCartao && (
                              <p className="text-xs text-slate-400">{card.nomeCartao}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{card.banco}</td>
                      <td className="px-6 py-4"><BandeiraBadge bandeira={card.bandeira} /></td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-mono text-sm text-slate-700 tracking-widest">
                          {card.ultimos4Digitos ? `•••• ${card.ultimos4Digitos}` : <span className="text-slate-300">—</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(card.limiteTotal)}</td>
                      <td className="px-6 py-4 text-center text-slate-500 text-sm">Dia {card.diaFechamento}</td>
                      <td className="px-6 py-4 text-center text-slate-500 text-sm">Dia {card.diaVencimento}</td>
                      <td className="px-6 py-4 text-center">
                        {card.ativo ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Ativo</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Inativo</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openEdit(card)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4 text-slate-400 hover:text-slate-700" />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Excluir "${card.nomeCartao}"?`)) deleteMutation.mutate({ id: card.id }); }}
                            className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" />
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
        <div className="text-center py-24 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <CreditCard className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-semibold text-lg mb-2">Nenhum cartão cadastrado</p>
          <p className="text-slate-400 text-sm mb-6">Adicione seus cartões para controlar faturas e parcelamentos.</p>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Adicionar Primeiro Cartão</Button>
        </div>
      )}

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={open => { setIsModalOpen(open); if (!open) setEditingCard(null); }}>
        <DialogContent className="sm:max-w-[500px] bg-white border-slate-200 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingCard ? "Editar Cartão" : "Novo Cartão de Crédito"}
            </DialogTitle>
          </DialogHeader>

          {/* Live card preview */}
          <div className="flex justify-center py-2">
            <PremiumCard
              size="lg"
              card={{
                nomeCartao: watchedValues.nomeCartao || "Nome do Cartão",
                apelidoCartao: watchedValues.apelidoCartao || undefined,
                banco: watchedValues.banco || "Banco",
                bandeira: watchedValues.bandeira || "Visa",
                cor: watchedValues.cor || "#6366F1",
                limiteTotal: watchedValues.limiteTotal || 0,
                diaVencimento: watchedValues.diaVencimento || 12,
                ultimos4Digitos: watchedValues.ultimos4Digitos || "",
                ativo: true,
              }}
            />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-1">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="banco" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banco / Emissor</FormLabel>
                    <FormControl><Input placeholder="Ex: Nubank, Itaú" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="nomeCartao" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Cartão</FormLabel>
                    <FormControl><Input placeholder="Ex: Platinum, Roxinho" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="apelidoCartao" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Apelido <span className="text-slate-400 font-normal text-xs ml-1">(opcional — aparece no cartão)</span>
                  </FormLabel>
                  <FormControl><Input placeholder="Ex: Azul, Principal, Viagens" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
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
                <FormField control={form.control} name="ultimos4Digitos" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Últimos 4 Dígitos</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">••••</span>
                        <Input
                          placeholder="1234"
                          maxLength={4}
                          className="pl-12 font-mono tracking-widest"
                          {...field}
                          onChange={e => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="limiteTotal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite Total (R$)</FormLabel>
                  <FormControl><Input type="number" step="100" placeholder="5000" {...field} /></FormControl>
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
                          "w-7 h-7 rounded-full transition-all border-2",
                          field.value === color ? "border-slate-900 scale-110 shadow-md" : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </FormItem>
              )} />

              <Button
                type="submit"
                className="w-full h-11"
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
