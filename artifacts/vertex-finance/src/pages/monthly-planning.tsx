import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { useListMonthlyPlans } from "@workspace/api-client-react";

export default function MonthlyPlanningPage() {
  const { data: plans, isLoading } = useListMonthlyPlans({ year: new Date().getFullYear() });

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900">Planejamento Mensal</h1>
        <p className="text-slate-500 mt-1">Organize suas expectativas financeiras para cada mês do ano.</p>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 text-left font-medium">Categoria</th>
                <th className="px-6 py-4 text-right font-medium">Previsto</th>
                <th className="px-6 py-4 text-right font-medium">Realizado</th>
                <th className="px-6 py-4 text-right font-medium">Diferença</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center">Carregando...</td></tr>
              ) : plans?.map(plan => {
                const diff = plan.actualExpense - plan.plannedExpense;
                return (
                  <tr key={plan.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{plan.categoryName}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(plan.plannedExpense)}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(plan.actualExpense)}</td>
                    <td className={`px-6 py-4 text-right font-bold ${diff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                    </td>
                  </tr>
                )
              })}
              {(!plans || plans.length === 0) && !isLoading && (
                 <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhum planejamento encontrado para este ano.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppLayout>
  );
}
