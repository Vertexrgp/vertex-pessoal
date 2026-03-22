import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/format";
import { useListAssets, useListDebts, useListReceivables, useListIncomes } from "@workspace/api-client-react";
import { Building, CreditCard, Receipt, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AssetsPage() {
  const { data: assets } = useListAssets();
  const { data: debts } = useListDebts();
  const { data: receivables } = useListReceivables();
  const { data: incomes } = useListIncomes();

  const totalAssets = assets?.reduce((acc, val) => acc + val.amount, 0) || 0;
  const totalDebts = debts?.reduce((acc, val) => acc + val.remainingAmount, 0) || 0;
  const totalReceivables = receivables?.reduce((acc, val) => acc + val.amount, 0) || 0;
  const netWorth = totalAssets + totalReceivables - totalDebts;

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Patrimônio</h1>
          <p className="text-slate-500 mt-1">Visão consolidada de seus ativos, passivos e fontes de renda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-slate-900 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <p className="text-slate-400 font-medium mb-1">Patrimônio Líquido</p>
            <h2 className="text-3xl font-bold">{formatCurrency(netWorth)}</h2>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-slate-500 font-medium mb-1">Total Ativos</p>
            <h2 className="text-2xl font-bold text-emerald-600">{formatCurrency(totalAssets)}</h2>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-slate-500 font-medium mb-1">Total a Receber</p>
            <h2 className="text-2xl font-bold text-blue-600">{formatCurrency(totalReceivables)}</h2>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-slate-500 font-medium mb-1">Total Dívidas</p>
            <h2 className="text-2xl font-bold text-rose-600">{formatCurrency(totalDebts)}</h2>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="investments" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl mb-6">
          <TabsTrigger value="investments" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">Investimentos</TabsTrigger>
          <TabsTrigger value="receivables" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">Recebíveis</TabsTrigger>
          <TabsTrigger value="debts" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">Dívidas</TabsTrigger>
          <TabsTrigger value="income" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">Fontes de Renda</TabsTrigger>
        </TabsList>

        <TabsContent value="investments" className="animate-in fade-in slide-in-from-bottom-2">
          <Card className="border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-xl">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Building className="w-5 h-5 text-emerald-500"/> Meus Investimentos</h3>
              <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1"/> Adicionar</Button>
            </div>
            <div className="p-0">
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
                    <tr key={asset.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{asset.description}</td>
                      <td className="px-6 py-4 text-slate-600">{asset.category}</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">{formatCurrency(asset.amount)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">{asset.status}</span>
                      </td>
                    </tr>
                  ))}
                  {(!assets || assets.length === 0) && (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhum investimento cadastrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="debts" className="animate-in fade-in slide-in-from-bottom-2">
           <Card className="border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-xl">
              <h3 className="font-semibold text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-rose-500"/> Minhas Dívidas</h3>
              <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1"/> Adicionar</Button>
            </div>
             <div className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Descrição</th>
                    <th className="px-6 py-3 text-left font-medium">Credor</th>
                    <th className="px-6 py-3 text-right font-medium">Valor Restante</th>
                    <th className="px-6 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {debts?.map(debt => (
                    <tr key={debt.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{debt.description}</td>
                      <td className="px-6 py-4 text-slate-600">{debt.creditor}</td>
                      <td className="px-6 py-4 text-right font-bold text-rose-600">{formatCurrency(debt.remainingAmount)}</td>
                      <td className="px-6 py-4 text-center">
                         <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">{debt.status}</span>
                      </td>
                    </tr>
                  ))}
                   {(!debts || debts.length === 0) && (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhuma dívida cadastrada. Excelente!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
        
        {/* Placeholder for Receivables and Income to ensure completeness of standard requirement */}
        <TabsContent value="receivables">
          <Card className="p-12 text-center border-slate-200 shadow-sm text-slate-500">Listagem de recebíveis em construção.</Card>
        </TabsContent>
        <TabsContent value="income">
           <Card className="p-12 text-center border-slate-200 shadow-sm text-slate-500">Listagem de fontes de renda em construção.</Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
