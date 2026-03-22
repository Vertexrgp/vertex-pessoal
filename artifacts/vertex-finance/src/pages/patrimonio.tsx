import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { useListAssets, useListDebts, useListReceivables, useListIncomes } from "@workspace/api-client-react";
import { Landmark, TrendingDown, HandCoins, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function PatrimonioPage() {
  const { data: assets } = useListAssets();
  const { data: debts } = useListDebts();
  const { data: receivables } = useListReceivables();
  const { data: incomes } = useListIncomes();

  const totalAssets = assets?.reduce((acc, val) => acc + val.amount, 0) || 0;
  const totalDebts = debts?.reduce((acc, val) => acc + val.remainingAmount, 0) || 0;
  const totalReceivables = receivables?.reduce((acc, val) => acc + val.amount, 0) || 0;
  const netWorth = totalAssets + totalReceivables - totalDebts;

  const sections = [
    {
      label: "Investimentos",
      amount: totalAssets,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
      icon: Landmark,
      link: "/patrimonio",
      count: assets?.length ?? 0,
    },
    {
      label: "Recebíveis",
      amount: totalReceivables,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
      icon: HandCoins,
      link: "/receivables",
      count: receivables?.length ?? 0,
    },
    {
      label: "Dívidas",
      amount: -totalDebts,
      color: "text-rose-600",
      bg: "bg-rose-50 border-rose-200",
      icon: TrendingDown,
      link: "/debts",
      count: debts?.length ?? 0,
    },
    {
      label: "Rendas Recorrentes",
      amount: incomes?.reduce((a, v) => a + v.amount, 0) ?? 0,
      color: "text-violet-600",
      bg: "bg-violet-50 border-violet-200",
      icon: TrendingUp,
      link: "/incomes",
      count: incomes?.length ?? 0,
    },
  ];

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900">Patrimônio Geral</h1>
        <p className="text-slate-500 mt-1">Visão consolidada de seus ativos, passivos e fontes de renda.</p>
      </div>

      {/* Net Worth Hero */}
      <Card className="bg-slate-900 text-white border-0 shadow-xl mb-8">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-1">
            <Landmark className="w-5 h-5 text-slate-400" />
            <p className="text-slate-400 font-medium">Patrimônio Líquido Estimado</p>
          </div>
          <h2 className="text-5xl font-bold tracking-tight">{formatCurrency(netWorth)}</h2>
          <p className="text-slate-400 text-sm mt-3">
            Investimentos + Recebíveis − Dívidas
          </p>
        </CardContent>
      </Card>

      {/* Section Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.link}>
              <div className={`rounded-2xl border p-5 cursor-pointer hover:shadow-md transition-all group ${s.bg}`}>
                <div className="flex items-center justify-between mb-4">
                  <Icon className={`w-5 h-5 ${s.color}`} />
                  <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{formatCurrency(Math.abs(s.amount))}</p>
                <p className="text-xs text-slate-400 mt-1">{s.count} item{s.count !== 1 ? "s" : ""}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Assets table summary */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-500" /> Meus Investimentos
          </h3>
          <span className="text-xs text-slate-400">{assets?.length ?? 0} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Descrição</th>
                <th className="px-6 py-3 text-left font-medium">Categoria</th>
                <th className="px-6 py-3 text-right font-medium">Valor Atual</th>
                <th className="px-6 py-3 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets?.map(asset => (
                <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{asset.description}</td>
                  <td className="px-6 py-4 text-slate-500">{asset.category}</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600">{formatCurrency(asset.amount)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">{asset.status}</span>
                  </td>
                </tr>
              ))}
              {(!assets || assets.length === 0) && (
                <tr><td colSpan={4} className="p-10 text-center text-slate-400">Nenhum investimento cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppLayout>
  );
}
