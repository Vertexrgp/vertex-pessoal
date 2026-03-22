import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useListDebts } from "@workspace/api-client-react";
import { FileText, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function DebtsPage() {
  const { data: debts } = useListDebts();
  const total = debts?.reduce((acc, val) => acc + val.remainingAmount, 0) || 0;
  const active = debts?.filter(d => d.status !== "paid") ?? [];

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Dívidas</h1>
          <p className="text-slate-500 mt-1">Tudo que você deve ou tem a pagar.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Nova Dívida
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-rose-600 uppercase tracking-wide mb-1">Total Devendo</p>
          <p className="text-3xl font-bold text-rose-700">{formatCurrency(total)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Dívidas Ativas</p>
          <p className="text-3xl font-bold text-slate-900">{active.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Quitadas</p>
          <p className="text-3xl font-bold text-emerald-600">
            {(debts?.length ?? 0) - active.length}
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-rose-500" />
          <h3 className="font-semibold text-slate-900">Lista de Dívidas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Descrição</th>
                <th className="px-6 py-3 text-left font-medium">Credor</th>
                <th className="px-6 py-3 text-right font-medium">Valor Original</th>
                <th className="px-6 py-3 text-right font-medium">Saldo Restante</th>
                <th className="px-6 py-3 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {debts?.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{d.description}</td>
                  <td className="px-6 py-4 text-slate-500">{d.creditor ?? "—"}</td>
                  <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(d.totalAmount)}</td>
                  <td className="px-6 py-4 text-right font-bold text-rose-600">{formatCurrency(d.remainingAmount)}</td>
                  <td className="px-6 py-4 text-center">
                    {d.status === "paid" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Quitada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle className="w-3 h-3" /> Ativa
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {(!debts || debts.length === 0) && (
                <tr><td colSpan={5} className="p-10 text-center text-slate-400">Nenhuma dívida cadastrada. Excelente!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppLayout>
  );
}
