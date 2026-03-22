import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useListIncomes } from "@workspace/api-client-react";
import { TrendingUp, Plus } from "lucide-react";

export default function IncomesPage() {
  const { data: incomes } = useListIncomes();
  const total = incomes?.reduce((acc, val) => acc + val.amount, 0) || 0;

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Rendas</h1>
          <p className="text-slate-500 mt-1">Entradas recorrentes e fontes de receita.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Nova Renda
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-violet-600 uppercase tracking-wide mb-1">Renda Total</p>
          <p className="text-3xl font-bold text-violet-700">{formatCurrency(total)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Fontes</p>
          <p className="text-3xl font-bold text-slate-900">{incomes?.length ?? 0}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Média por Fonte</p>
          <p className="text-3xl font-bold text-slate-700">
            {formatCurrency(incomes?.length ? total / incomes.length : 0)}
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-500" />
          <h3 className="font-semibold text-slate-900">Fontes de Renda</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Descrição</th>
                <th className="px-6 py-3 text-left font-medium">Tipo</th>
                <th className="px-6 py-3 text-left font-medium">Frequência</th>
                <th className="px-6 py-3 text-right font-medium">Valor Mensal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incomes?.map(income => (
                <tr key={income.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{income.description}</td>
                  <td className="px-6 py-4 text-slate-500">{income.type ?? "—"}</td>
                  <td className="px-6 py-4 text-slate-500">{income.frequency ?? "Mensal"}</td>
                  <td className="px-6 py-4 text-right font-bold text-violet-600">{formatCurrency(income.amount)}</td>
                </tr>
              ))}
              {(!incomes || incomes.length === 0) && (
                <tr><td colSpan={4} className="p-10 text-center text-slate-400">Nenhuma renda cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppLayout>
  );
}
