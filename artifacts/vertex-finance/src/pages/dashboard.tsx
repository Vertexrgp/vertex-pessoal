import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatMonthYear, cnAmount } from "@/lib/format";
import { useGetDashboardSummary, useGetMonthlyChart, useGetCategoryChart, useListTransactions } from "@workspace/api-client-react";
import { Wallet, TrendingUp, TrendingDown, Landmark, PiggyBank, CreditCard, Building, Receipt } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({ month, year });
  const { data: monthlyChart, isLoading: isLoadingMonthly } = useGetMonthlyChart({ year });
  const { data: categoryChart, isLoading: isLoadingCategories } = useGetCategoryChart({ month, year });
  const { data: recentTx, isLoading: isLoadingTx } = useListTransactions({ month, year });

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [2023, 2024, 2025];

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Visão Geral</h1>
          <p className="text-slate-500 mt-1">Acompanhe seus resultados e saúde financeira.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
            <SelectTrigger className="w-[140px] bg-white border-slate-200 shadow-sm">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m} value={m.toString()}>{formatMonthYear(m, year).split(' ')[0]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-[100px] bg-white border-slate-200 shadow-sm">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard 
          title="Saldo do Mês" 
          value={summary?.monthBalance} 
          icon={Wallet} 
          loading={isLoadingSummary} 
          color="blue"
        />
        <KpiCard 
          title="Total Receitas" 
          value={summary?.totalIncome} 
          icon={TrendingUp} 
          loading={isLoadingSummary}
          color="emerald"
        />
        <KpiCard 
          title="Total Gastos" 
          value={summary?.totalExpenses} 
          icon={TrendingDown} 
          loading={isLoadingSummary}
          color="rose"
        />
        <KpiCard 
          title="Resultado do Mês" 
          value={summary?.monthResult} 
          icon={PiggyBank} 
          loading={isLoadingSummary}
          color={summary?.monthResult && summary.monthResult >= 0 ? "emerald" : "rose"}
        />
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard 
          title="Patrimônio Total" 
          value={summary?.netWorth} 
          icon={Landmark} 
          loading={isLoadingSummary} 
        />
        <KpiCard 
          title="Ativos (Investimentos)" 
          value={summary?.totalAssets} 
          icon={Building} 
          loading={isLoadingSummary} 
        />
        <KpiCard 
          title="Dívidas Totais" 
          value={summary?.totalDebts} 
          icon={CreditCard} 
          loading={isLoadingSummary} 
          color="rose"
        />
        <KpiCard 
          title="A Receber" 
          value={summary?.totalReceivables} 
          icon={Receipt} 
          loading={isLoadingSummary} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Monthly Chart */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-white">
            <h3 className="font-semibold text-slate-900">Receitas x Gastos ({year})</h3>
          </div>
          <CardContent className="p-6 bg-slate-50/50">
            {isLoadingMonthly ? (
              <Skeleton className="w-full h-[300px]" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChart || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                    <RechartsTooltip 
                      cursor={{fill: '#F1F5F9'}} 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => formatCurrency(val)}
                    />
                    <Bar dataKey="income" name="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="expenses" name="Gastos" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categories Chart */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-white">
            <h3 className="font-semibold text-slate-900">Gastos por Categoria</h3>
          </div>
          <CardContent className="p-6 bg-slate-50/50 flex flex-col items-center justify-center">
             {isLoadingCategories ? (
              <Skeleton className="w-48 h-48 rounded-full" />
            ) : !categoryChart || categoryChart.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-slate-400">Sem dados neste período</div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChart}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="amount"
                      nameKey="categoryName"
                    >
                      {categoryChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#6366F1'][index % 6]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </AppLayout>
  );
}

function KpiCard({ title, value, icon: Icon, loading, color = "slate" }: any) {
  const colorStyles = {
    slate: "text-slate-600 bg-slate-100",
    blue: "text-blue-600 bg-blue-50",
    emerald: "text-emerald-600 bg-emerald-50",
    rose: "text-rose-600 bg-rose-50",
  }[color] || "text-slate-600 bg-slate-100";

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className={`p-2 rounded-xl ${colorStyles}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(value || 0)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
