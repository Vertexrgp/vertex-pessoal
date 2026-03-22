import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useListBudgetGroups, useListBudgetItems } from "@workspace/api-client-react";
import { PieChart, AlertTriangle, CheckCircle, TrendingDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function BudgetPage() {
  const { data: groups, isLoading: isLoadingGroups } = useListBudgetGroups();
  const { data: items, isLoading: isLoadingItems } = useListBudgetItems({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  const totalPlanned = items?.reduce((acc, item) => acc + item.plannedAmount, 0) || 0;
  const totalRealized = items?.reduce((acc, item) => acc + item.realizedAmount, 0) || 0;
  const overallPercentage = totalPlanned > 0 ? (totalRealized / totalPlanned) * 100 : 0;

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Orçamento Mensal</h1>
          <p className="text-slate-500 mt-1">Controle seus limites de gastos e planeje o futuro.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">Ajustar Metas</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <p className="text-slate-400 font-medium mb-1">Orçamento Total Planejado</p>
            <h2 className="text-3xl font-bold">{formatCurrency(totalPlanned)}</h2>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-slate-500 font-medium mb-1">Total Realizado</p>
            <h2 className="text-3xl font-bold text-slate-900">{formatCurrency(totalRealized)}</h2>
            <Progress value={overallPercentage} className="h-2 mt-4" />
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-slate-500 font-medium mb-1">Disponível</p>
            <h2 className={`text-3xl font-bold ${totalPlanned - totalRealized >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(totalPlanned - totalRealized)}
            </h2>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {groups?.map(group => {
          const groupItems = items?.filter(i => i.groupId === group.id) || [];
          const groupPlanned = groupItems.reduce((acc, i) => acc + i.plannedAmount, 0);
          const groupRealized = groupItems.reduce((acc, i) => acc + i.realizedAmount, 0);
          const percent = groupPlanned > 0 ? (groupRealized / groupPlanned) * 100 : 0;
          
          return (
            <Card key={group.id} className="border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color || '#3B82F6' }} />
                  <h3 className="font-semibold text-slate-900 text-lg">{group.name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-sm text-slate-500 font-medium">Realizado: </span>
                  <span className="font-bold text-slate-900">{formatCurrency(groupRealized)}</span>
                  <span className="text-slate-400 mx-2">/</span>
                  <span className="text-sm text-slate-500 font-medium">Meta: {formatCurrency(groupPlanned)}</span>
                </div>
              </div>
              
              <div className="px-6 py-4">
                <div className="flex items-center gap-4 mb-4">
                  <Progress value={percent} className={`h-2 flex-1 ${percent > 100 ? '[&>div]:bg-rose-500' : '[&>div]:bg-emerald-500'}`} />
                  <span className="text-sm font-bold text-slate-700 w-12 text-right">{percent.toFixed(0)}%</span>
                </div>

                {groupItems.length > 0 && (
                  <table className="w-full text-sm mt-4">
                    <tbody className="divide-y divide-slate-100">
                      {groupItems.map(item => (
                        <tr key={item.id} className="group">
                          <td className="py-3 text-slate-700 font-medium">{item.description}</td>
                          <td className="py-3 text-right text-slate-500">{formatCurrency(item.plannedAmount)}</td>
                          <td className="py-3 text-right font-medium text-slate-900">{formatCurrency(item.realizedAmount)}</td>
                          <td className="py-3 text-right w-24">
                            {item.status === 'over' ? (
                              <span className="inline-flex items-center text-rose-600 bg-rose-50 px-2 py-1 rounded text-xs font-bold">
                                <AlertTriangle className="w-3 h-3 mr-1" /> Estourou
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold">
                                <CheckCircle className="w-3 h-3 mr-1" /> No limite
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          );
        })}
        {(!groups || groups.length === 0) && !isLoadingGroups && (
           <div className="text-center p-12 bg-white rounded-2xl border border-slate-200">
             <PieChart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <h3 className="text-lg font-semibold text-slate-900">Nenhum orçamento definido</h3>
             <p className="text-slate-500 mt-2">Comece criando grupos e categorias de orçamento.</p>
           </div>
        )}
      </div>
    </AppLayout>
  );
}
