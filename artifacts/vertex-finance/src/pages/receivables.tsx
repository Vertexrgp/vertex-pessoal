import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { useListReceivables } from "@workspace/api-client-react";
import { HandCoins, Plus, CheckCircle2, Clock } from "lucide-react";

export default function ReceivablesPage() {
  const { data: receivables } = useListReceivables();
  const total = receivables?.reduce((acc, val) => acc + val.amount, 0) || 0;

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Recebíveis</h1>
          <p className="text-slate-500 mt-1">Tudo que você tem a receber.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Novo Recebível
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Total a Receber</p>
          <p className="text-3xl font-bold text-blue-700">{formatCurrency(total)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Registros</p>
          <p className="text-3xl font-bold text-slate-900">{receivables?.length ?? 0}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Pendentes</p>
          <p className="text-3xl font-bold text-amber-600">
            {receivables?.filter(r => r.status !== "received").length ?? 0}
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-slate-900">Lista de Recebíveis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Descrição</th>
                <th className="px-6 py-3 text-left font-medium">Devedor</th>
                <th className="px-6 py-3 text-left font-medium">Vencimento</th>
                <th className="px-6 py-3 text-right font-medium">Valor</th>
                <th className="px-6 py-3 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receivables?.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{r.description}</td>
                  <td className="px-6 py-4 text-slate-500">{r.debtor ?? "—"}</td>
                  <td className="px-6 py-4 text-slate-500">{r.dueDate ? formatDate(r.dueDate) : "—"}</td>
                  <td className="px-6 py-4 text-right font-bold text-blue-600">{formatCurrency(r.amount)}</td>
                  <td className="px-6 py-4 text-center">
                    {r.status === "received" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Recebido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" /> Pendente
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {(!receivables || receivables.length === 0) && (
                <tr><td colSpan={5} className="p-10 text-center text-slate-400">Nenhum recebível cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppLayout>
  );
}
