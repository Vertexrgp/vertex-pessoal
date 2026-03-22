import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  useListTransactions,
  useCreateTransaction,
  useCreateInstallments,
  useListCategories,
  useListAccounts,
  useListCreditCards,
  useDeleteTransaction,
  useDeleteInstallmentGroup,
} from "@workspace/api-client-react";
import { Plus, Search, Trash2, Edit2, FileText, CheckCircle2, Clock, CreditCard, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = ["Dinheiro", "Débito", "Crédito", "Pix", "Transferência", "Outros"];
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const singleSchema = z.object({
  mode: z.literal("single"),
  description: z.string().min(2, "Descrição obrigatória"),
  amount: z.coerce.number().min(0.01, "Valor obrigatório"),
  type: z.enum(["income", "expense", "transfer"]),
  status: z.enum(["planned", "paid", "received"]),
  competenceDate: z.string().min(10),
  movementDate: z.string().min(10),
  categoryId: z.coerce.number().nullable().optional(),
  accountId: z.coerce.number().nullable().optional(),
  creditCardId: z.coerce.number().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  creditType: z.enum(["avista", "parcelado"]).nullable().optional(),
  modoUsoCartao: z.enum(["fisico", "online"]).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const installmentSchema = z.object({
  mode: z.literal("installment"),
  description: z.string().min(2, "Descrição obrigatória"),
  totalAmount: z.coerce.number().min(0.01, "Valor obrigatório"),
  totalInstallments: z.coerce.number().int().min(2).max(72),
  firstInstallmentDate: z.string().min(10),
  firstInstallmentStatus: z.enum(["planned", "paid"]),
  categoryId: z.coerce.number().nullable().optional(),
  accountId: z.coerce.number().nullable().optional(),
  creditCardId: z.coerce.number().nullable().optional(),
  modoUsoCartao: z.enum(["fisico", "online"]).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const formSchema = z.discriminatedUnion("mode", [singleSchema, installmentSchema]);
type FormValues = z.infer<typeof formSchema>;

function ParcelaBadge({ tx }: { tx: any }) {
  if (tx.creditType === "parcelado" && tx.currentInstallment && tx.totalInstallments) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
        <Layers className="w-3 h-3" />
        {tx.currentInstallment}/{tx.totalInstallments}
      </span>
    );
  }
  if (tx.creditType === "avista") {
    return (
      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
        À vista
      </span>
    );
  }
  return <span className="text-slate-300 text-xs">—</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid" || status === "received") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" /> Efetivado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3.5 h-3.5" /> Previsto
    </span>
  );
}

function PaymentBadge({
  method, modoUso, cardNome, cardApelido, cardDigitos, cardCor,
}: {
  method: string | null | undefined;
  modoUso?: string | null;
  cardNome?: string | null;
  cardApelido?: string | null;
  cardDigitos?: string | null;
  cardCor?: string | null;
}) {
  if (!method) return <span className="text-slate-300 text-xs">—</span>;
  const isCredit = method === "Crédito";
  const cardLabel = cardApelido
    ? `${cardNome?.split(" ")[0] ?? ""} ${cardApelido}`.trim()
    : cardNome ?? null;

  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
        isCredit ? "bg-violet-50 text-violet-700 border border-violet-100" : "bg-slate-100 text-slate-600"
      )}>
        {isCredit && <CreditCard className="w-3 h-3" />}
        {method}
      </span>
      {isCredit && cardLabel && (
        <span className="flex items-center gap-1 text-[10px] text-slate-500 pl-0.5">
          {cardCor && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: cardCor }} />}
          <span className="font-medium">{cardLabel}</span>
          {cardDigitos && <span className="font-mono text-slate-400">•••• {cardDigitos}</span>}
        </span>
      )}
      {isCredit && modoUso && (
        <span className="text-[10px] text-slate-400 pl-0.5">
          {modoUso === "online" ? "🌐 Online" : "💳 Físico"}
        </span>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear] = useState(new Date().getFullYear());
  const { toast } = useToast();

  const { data: transactions, isLoading, refetch } = useListTransactions({
    month: filterMonth,
    year: filterYear,
    search: searchTerm || undefined,
  });
  const { data: categories } = useListCategories();
  const { data: accounts } = useListAccounts();
  const { data: creditCards } = useListCreditCards();

  const createMutation = useCreateTransaction({
    mutation: { onSuccess: () => { toast({ title: "Lançamento criado!" }); setIsModalOpen(false); refetch(); } }
  });
  const installmentMutation = useCreateInstallments({
    mutation: { onSuccess: (data) => { toast({ title: `${data.length} parcelas criadas!` }); setIsModalOpen(false); refetch(); } }
  });
  const deleteMutation = useDeleteTransaction({
    mutation: { onSuccess: () => { toast({ title: "Lançamento excluído." }); refetch(); } }
  });
  const deleteGroupMutation = useDeleteInstallmentGroup({
    mutation: { onSuccess: () => { toast({ title: "Todas as parcelas excluídas." }); refetch(); } }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      mode: "single",
      type: "expense",
      status: "paid",
      competenceDate: new Date().toISOString().split("T")[0],
      movementDate: new Date().toISOString().split("T")[0],
      paymentMethod: "Pix",
      creditType: null,
    } as any,
  });

  const mode = useWatch({ control: form.control, name: "mode" });
  const paymentMethod = useWatch({ control: form.control, name: "paymentMethod" as any });
  const creditType = useWatch({ control: form.control, name: "creditType" as any });

  useEffect(() => {
    if (paymentMethod === "Crédito" && !creditType) {
      (form as any).setValue("creditType", "avista");
    }
    if (paymentMethod !== "Crédito") {
      (form as any).setValue("creditType", null);
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (creditType === "parcelado") {
      form.setValue("mode" as any, "installment");
      (form as any).setValue("totalInstallments", 2);
      (form as any).setValue("firstInstallmentDate", new Date().toISOString().split("T")[0]);
      (form as any).setValue("firstInstallmentStatus", "paid");
    } else if (mode === "installment" && creditType !== "parcelado") {
      form.setValue("mode" as any, "single");
    }
  }, [creditType]);

  const onSubmit = (values: FormValues) => {
    if (values.mode === "installment") {
      installmentMutation.mutate({
        data: {
          description: values.description,
          totalAmount: values.totalAmount,
          totalInstallments: values.totalInstallments,
          firstInstallmentDate: values.firstInstallmentDate,
          firstInstallmentStatus: values.firstInstallmentStatus,
          categoryId: values.categoryId ?? null,
          accountId: values.accountId ?? null,
          creditCardId: values.creditCardId ?? null,
          paymentMethod: "Crédito",
          modoUsoCartao: (values as any).modoUsoCartao ?? null,
          notes: values.notes ?? null,
        } as any
      });
    } else {
      createMutation.mutate({
        data: {
          description: values.description,
          amount: values.amount,
          type: values.type,
          status: values.status,
          competenceDate: values.competenceDate,
          movementDate: values.movementDate,
          categoryId: values.categoryId ?? null,
          accountId: values.accountId ?? null,
          creditCardId: values.creditCardId ?? null,
          paymentMethod: values.paymentMethod ?? null,
          creditType: values.creditType ?? null,
          modoUsoCartao: (values as any).modoUsoCartao ?? null,
          notes: values.notes ?? null,
        } as any
      });
    }
  };

  const handleDelete = (tx: any) => {
    if (tx.installmentGroupId) {
      if (confirm(`Excluir todas as ${tx.totalInstallments} parcelas?`)) {
        deleteGroupMutation.mutate({ groupId: tx.installmentGroupId });
      }
    } else {
      if (confirm("Excluir este lançamento?")) {
        deleteMutation.mutate({ id: tx.id });
      }
    }
  };

  const isPending = createMutation.isPending || installmentMutation.isPending;

  const openNew = () => {
    form.reset({
      mode: "single", type: "expense", status: "paid",
      competenceDate: new Date().toISOString().split("T")[0],
      movementDate: new Date().toISOString().split("T")[0],
      paymentMethod: "Pix",
    } as any);
    setIsModalOpen(true);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Lançamentos</h1>
          <p className="text-slate-500 mt-1">Gerencie suas receitas, despesas e transferências.</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md shadow-primary/20"
          onClick={openNew}
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar lançamentos..."
            className="pl-9 bg-white border-slate-200 rounded-xl"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {MONTHS.map((m, i) => (
            <button
              key={i}
              onClick={() => setFilterMonth(i + 1)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                filterMonth === i + 1
                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-medium border-b border-slate-200 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3.5">Data</th>
                <th className="px-5 py-3.5">Descrição</th>
                <th className="px-5 py-3.5">Categoria</th>
                <th className="px-5 py-3.5">Pagamento</th>
                <th className="px-5 py-3.5 text-center">Parcela</th>
                <th className="px-5 py-3.5 text-right">Valor</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Carregando...</td></tr>
              ) : !transactions?.length ? (
                <tr>
                  <td colSpan={8} className="p-14 text-center">
                    <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Nenhum lançamento encontrado.</p>
                    <p className="text-slate-400 text-xs mt-1">Clique em "Novo Lançamento" para começar.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-5 py-3.5 text-slate-400 text-xs font-medium whitespace-nowrap">
                      {formatDate(tx.competenceDate)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-900 text-sm">{tx.description}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {tx.categoryName ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {tx.categoryName}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <PaymentBadge
                        method={tx.paymentMethod}
                        modoUso={(tx as any).modoUsoCartao}
                        cardNome={(tx as any).creditCardNome}
                        cardApelido={(tx as any).creditCardApelido}
                        cardDigitos={(tx as any).creditCardDigitos}
                        cardCor={(tx as any).creditCardCor}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <ParcelaBadge tx={tx} />
                    </td>
                    <td className={cn(
                      "px-5 py-3.5 text-right font-bold tracking-tight tabular-nums",
                      tx.type === "income" ? "text-emerald-600" : tx.type === "expense" ? "text-rose-600" : "text-slate-600"
                    )}>
                      {tx.type === "expense" ? "-" : tx.type === "income" ? "+" : ""}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-primary hover:bg-primary/10">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title={tx.installmentGroupId ? `Excluir todas as ${tx.totalInstallments} parcelas` : "Excluir"}
                          onClick={() => handleDelete(tx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {transactions && transactions.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between text-xs text-slate-400">
            <span>{transactions.length} lançamento{transactions.length !== 1 ? "s" : ""}</span>
            <span>
              Total despesas:{" "}
              <span className="font-semibold text-rose-600">
                -{formatCurrency(transactions.filter(t => t.type === "expense").reduce((a, t) => a + t.amount, 0))}
              </span>
            </span>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[520px] bg-white border-slate-200 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Novo Lançamento</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">

              {/* Tipo */}
              {mode !== "installment" && (
                <FormField control={form.control} name={"type" as any} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <div className="flex gap-2">
                      {[
                        { value: "expense", label: "Despesa", color: "hover:border-rose-400 data-[active=true]:bg-rose-50 data-[active=true]:border-rose-500 data-[active=true]:text-rose-700" },
                        { value: "income", label: "Receita", color: "hover:border-emerald-400 data-[active=true]:bg-emerald-50 data-[active=true]:border-emerald-500 data-[active=true]:text-emerald-700" },
                        { value: "transfer", label: "Transferência", color: "hover:border-blue-400 data-[active=true]:bg-blue-50 data-[active=true]:border-blue-500 data-[active=true]:text-blue-700" },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          data-active={field.value === opt.value}
                          onClick={() => field.onChange(opt.value)}
                          className={cn(
                            "flex-1 py-2 rounded-xl border text-sm font-medium transition-all",
                            field.value === opt.value ? "" : "border-slate-200 text-slate-500 bg-white",
                            opt.color
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* Descrição + Valor */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name={"description" as any} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl><Input placeholder="Ex: Mercado, Salário..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={mode === "installment" ? "totalAmount" as any : "amount" as any} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{mode === "installment" ? "Valor Total (R$)" : "Valor (R$)"}</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Forma de Pagamento */}
              <FormField control={form.control} name={"paymentMethod" as any} render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Crédito fields */}
              {paymentMethod === "Crédito" && (
                <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> Cartão de Crédito
                  </p>
                  <FormField control={form.control} name={"creditCardId" as any} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cartão</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() ?? ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {[...(creditCards ?? [])]
                            .sort((a, b) => (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1))
                            .map(c => {
                              const label = (c as any).apelidoCartao
                                ? `${c.banco} ${(c as any).apelidoCartao}`
                                : `${c.nomeCartao}`;
                              const digits = (c as any).ultimos4Digitos;
                              return (
                                <SelectItem key={c.id} value={c.id.toString()}>
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 inline-block"
                                      style={{ backgroundColor: c.cor }}
                                    />
                                    <span className="font-medium">{label}</span>
                                    {digits ? (
                                      <span className="text-slate-400 font-mono text-xs">•••• {digits}</span>
                                    ) : (
                                      <span className="text-slate-400 text-xs">{c.banco}</span>
                                    )}
                                    {!c.ativo && <span className="text-xs text-slate-400">(inativo)</span>}
                                  </span>
                                </SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name={"creditType" as any} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Crédito</FormLabel>
                        <div className="flex gap-2">
                          {[
                            { value: "avista", label: "À Vista" },
                            { value: "parcelado", label: "Parcelado" },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => field.onChange(opt.value)}
                              className={cn(
                                "flex-1 py-2 rounded-lg border text-xs font-medium transition-all",
                                field.value === opt.value
                                  ? "bg-primary text-white border-primary shadow-sm"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name={"modoUsoCartao" as any} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modo de Uso</FormLabel>
                        <div className="flex gap-2">
                          {[
                            { value: "fisico", label: "Físico" },
                            { value: "online", label: "Online" },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => field.onChange(field.value === opt.value ? null : opt.value)}
                              className={cn(
                                "flex-1 py-2 rounded-lg border text-xs font-medium transition-all",
                                field.value === opt.value
                                  ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}

              {/* Parcelamento fields */}
              {mode === "installment" && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-violet-800 flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Parcelamento
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name={"totalInstallments" as any} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº de Parcelas</FormLabel>
                        <FormControl><Input type="number" min={2} max={72} placeholder="Ex: 12" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={"firstInstallmentDate" as any} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data 1ª Parcela</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name={"firstInstallmentStatus" as any} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status da 1ª Parcela</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? "paid"}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="paid">Já paga</SelectItem>
                          <SelectItem value="planned">Prevista</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {(form.getValues("totalInstallments" as any) ?? 0) >= 2 && (form.getValues("totalAmount" as any) ?? 0) > 0 && (
                    <div className="flex items-center justify-between bg-violet-100 rounded-lg px-3 py-2">
                      <span className="text-xs text-violet-700">Valor por parcela:</span>
                      <span className="text-sm font-bold text-violet-900">
                        {formatCurrency((form.getValues("totalAmount" as any) ?? 0) / (form.getValues("totalInstallments" as any) ?? 1))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Categoria + Conta */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name={"categoryId" as any} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString() ?? ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={"accountId" as any} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString() ?? ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {accounts?.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Data + Status (single mode only) */}
              {mode !== "installment" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name={"competenceDate" as any} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Competência</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={"status" as any} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="paid">Pago</SelectItem>
                          <SelectItem value="received">Recebido</SelectItem>
                          <SelectItem value="planned">Previsto</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Observações */}
              <FormField control={form.control} name={"notes" as any} render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações <span className="text-slate-400 font-normal">(opcional)</span></FormLabel>
                  <FormControl><Input placeholder="Anotações..." {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full mt-2 h-11" disabled={isPending}>
                {isPending
                  ? "Salvando..."
                  : mode === "installment"
                    ? `Criar ${form.getValues("totalInstallments" as any) || "N"} parcelas`
                    : "Salvar Lançamento"
                }
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
