import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  useDeleteTransaction,
  useDeleteInstallmentGroup,
} from "@workspace/api-client-react";
import { Plus, Search, Trash2, Edit2, Copy, FileText, CheckCircle2, Clock, CreditCard, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PAYMENT_METHODS = ["Dinheiro", "Débito", "Crédito", "Pix", "Transferência", "Outros"];

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
  paymentMethod: z.string().nullable().optional(),
  creditType: z.enum(["avista", "parcelado"]).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const installmentSchema = z.object({
  mode: z.literal("installment"),
  description: z.string().min(2, "Descrição obrigatória"),
  totalAmount: z.coerce.number().min(0.01, "Valor obrigatório"),
  totalInstallments: z.coerce.number().int().min(2, "Mínimo 2 parcelas").max(72, "Máximo 72 parcelas"),
  firstInstallmentDate: z.string().min(10),
  firstInstallmentStatus: z.enum(["planned", "paid"]),
  categoryId: z.coerce.number().nullable().optional(),
  accountId: z.coerce.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const formSchema = z.discriminatedUnion("mode", [singleSchema, installmentSchema]);
type FormValues = z.infer<typeof formSchema>;

function InstallmentBadge({ current, total }: { current: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
      <Layers className="w-3 h-3" />
      {current}/{total}
    </span>
  );
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

  const createMutation = useCreateTransaction({
    mutation: { onSuccess: () => { toast({ title: "Lançamento criado!" }); setIsModalOpen(false); refetch(); } }
  });

  const installmentMutation = useCreateInstallments({
    mutation: { onSuccess: (data) => { toast({ title: `${data.length} parcelas criadas com sucesso!` }); setIsModalOpen(false); refetch(); } }
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
  const txType = useWatch({ control: form.control, name: "type" as any });

  // When payment method is Crédito, set creditType default
  useEffect(() => {
    if (paymentMethod === "Crédito" && !creditType) {
      (form as any).setValue("creditType", "avista");
    }
    if (paymentMethod !== "Crédito") {
      (form as any).setValue("creditType", null);
    }
  }, [paymentMethod]);

  // When creditType switches to parcelado, switch mode
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
          paymentMethod: "Crédito",
          notes: values.notes ?? null,
        }
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
          paymentMethod: values.paymentMethod ?? null,
          creditType: values.creditType ?? null,
          notes: values.notes ?? null,
        }
      });
    }
  };

  const handleDelete = (tx: any) => {
    if (tx.installmentGroupId) {
      if (confirm(`Excluir todas as ${tx.totalInstallments} parcelas desta compra?`)) {
        deleteGroupMutation.mutate({ groupId: tx.installmentGroupId });
      }
    } else {
      if (confirm("Excluir este lançamento?")) {
        deleteMutation.mutate({ id: tx.id });
      }
    }
  };

  const isPending = createMutation.isPending || installmentMutation.isPending;

  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lançamentos</h1>
          <p className="text-slate-500 mt-1">Gerencie suas receitas e despesas.</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md shadow-primary/20"
          onClick={() => { form.reset({ mode: "single", type: "expense", status: "paid", competenceDate: new Date().toISOString().split("T")[0], movementDate: new Date().toISOString().split("T")[0], paymentMethod: "Pix" } as any); setIsModalOpen(true); }}
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar lançamentos..."
            className="pl-9 bg-white border-slate-200"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {MONTHS.map((m, i) => (
            <button
              key={i}
              onClick={() => setFilterMonth(i + 1)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterMonth === i + 1 ? "bg-primary text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
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
            <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-5 py-4">Data</th>
                <th className="px-5 py-4">Descrição</th>
                <th className="px-5 py-4">Categoria</th>
                <th className="px-5 py-4">Pagamento</th>
                <th className="px-5 py-4 text-right">Valor</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Carregando...</td></tr>
              ) : !transactions?.length ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Nenhum lançamento encontrado.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{formatDate(tx.competenceDate)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{tx.description}</span>
                        {tx.totalInstallments && tx.currentInstallment && (
                          <InstallmentBadge current={tx.currentInstallment} total={tx.totalInstallments} />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {tx.categoryName && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {tx.categoryName}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {tx.paymentMethod && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${tx.paymentMethod === "Crédito" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"}`}>
                          {tx.paymentMethod === "Crédito" && <CreditCard className="w-3 h-3" />}
                          {tx.paymentMethod}
                        </span>
                      )}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-bold tracking-tight ${tx.type === "income" ? "text-emerald-600" : tx.type === "expense" ? "text-rose-600" : "text-slate-700"}`}>
                      {tx.type === "expense" ? "-" : ""}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-primary">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-destructive"
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
      </Card>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[520px] bg-white border-slate-200 max-h-[90vh] overflow-y-auto">
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="expense">Despesa</SelectItem>
                        <SelectItem value="income">Receita</SelectItem>
                        <SelectItem value="transfer">Transferência</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* Descrição + Valor */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name={"description" as any} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl><Input placeholder="Ex: iPhone 15 Pro" {...field} /></FormControl>
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

              {/* Crédito: à vista ou parcelado */}
              {paymentMethod === "Crédito" && (
                <FormField control={form.control} name={"creditType" as any} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Crédito</FormLabel>
                    <div className="flex gap-3">
                      {[
                        { value: "avista", label: "À Vista" },
                        { value: "parcelado", label: "Parcelado" },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${field.value === opt.value ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* Parcelamento fields */}
              {mode === "installment" && (
                <>
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
                    {/* Preview */}
                    {form.getValues("totalInstallments" as any) >= 2 && form.getValues("totalAmount" as any) > 0 && (
                      <p className="text-xs text-violet-700">
                        ≈ {formatCurrency(form.getValues("totalAmount" as any) / form.getValues("totalInstallments" as any))} / parcela
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Categoria + Conta */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name={"categoryId" as any} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString() ?? ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger></FormControl>
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
                      <FormControl><SelectTrigger><SelectValue placeholder="Conta" /></SelectTrigger></FormControl>
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
                      <FormLabel>Data Competência</FormLabel>
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
                  <FormControl><Input placeholder="Anotações sobre este lançamento..." {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full mt-2" disabled={isPending}>
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
