import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useGetReportExpensesByCategory, useGetReportMonthlyEvolution } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { formatCurrency } from "@/lib/format";

export default function ReportsPage() {
  const year = new Date().getFullYear();
  const { data: categoryData } = useGetReportExpensesByCategory({ year, month: new Date().getMonth() + 1 });
  const { data: evolutionData } = useGetReportMonthlyEvolution({ year });

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900">Relatórios Analíticos</h1>
        <p className="text-slate-500 mt-1">Insights detalhados para tomada de decisão.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="border-slate-200 shadow-sm">
           <div className="p-6 border-b border-slate-100 bg-white rounded-t-xl">
             <h3 className="font-semibold text-lg text-slate-900">Evolução do Patrimônio e Resultado ({year})</h3>
           </div>
           <CardContent className="p-6 bg-slate-50/50">
             <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorResult" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                    <Tooltip formatter={(val: number) => formatCurrency(val)} cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}/>
                    <Area type="monotone" dataKey="cumulativeResult" name="Resultado Acumulado" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorResult)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
           </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-100 bg-white rounded-t-xl">
              <h3 className="font-semibold text-lg text-slate-900">Top Despesas por Categoria</h3>
            </div>
            <div className="p-0">
               <table className="w-full text-sm">
                 <tbody className="divide-y divide-slate-100">
                   {categoryData?.sort((a,b) => b.totalAmount - a.totalAmount).slice(0, 8).map(cat => (
                     <tr key={cat.categoryId} className="hover:bg-slate-50">
                       <td className="px-6 py-4 font-medium text-slate-700">{cat.categoryName}</td>
                       <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(cat.totalAmount)}</td>
                       <td className="px-6 py-4 text-right text-slate-500 w-24">{cat.percentage.toFixed(1)}%</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </Card>
          
          <Card className="border-slate-200 shadow-sm bg-primary text-white overflow-hidden relative">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-10 -mt-10" />
             <div className="p-8 relative z-10 h-full flex flex-col justify-center">
               <h2 className="text-3xl font-display font-bold mb-4">Vertex Premium</h2>
               <p className="text-primary-foreground/80 mb-8 text-lg leading-relaxed">
                 Desbloqueie relatórios avançados de IA, previsões de fluxo de caixa e integração automática de bancos.
               </p>
               <button className="bg-white text-primary px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all self-start hover:-translate-y-0.5">
                 Fazer Upgrade
               </button>
             </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
