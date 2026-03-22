import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 mt-1">Gerencie suas contas, categorias e preferências do sistema.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-2">
          <button className="w-full text-left px-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl font-medium text-slate-900">Minhas Contas</button>
          <button className="w-full text-left px-4 py-3 hover:bg-slate-100 text-slate-600 rounded-xl font-medium transition-colors">Categorias</button>
          <button className="w-full text-left px-4 py-3 hover:bg-slate-100 text-slate-600 rounded-xl font-medium transition-colors">Preferências</button>
          <button className="w-full text-left px-4 py-3 hover:bg-slate-100 text-slate-600 rounded-xl font-medium transition-colors">Assinatura</button>
        </div>

        <div className="md:col-span-2">
          <Card className="border-slate-200 shadow-sm">
             <div className="p-6 border-b border-slate-100">
               <h3 className="font-semibold text-lg">Contas Bancárias</h3>
             </div>
             <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">N</div>
                      <div>
                        <p className="font-bold text-slate-900">Nubank</p>
                        <p className="text-sm text-slate-500">Conta Corrente</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Editar</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold">I</div>
                      <div>
                        <p className="font-bold text-slate-900">Banco Inter</p>
                        <p className="text-sm text-slate-500">Investimentos</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Editar</Button>
                  </div>
                  
                  <Button className="w-full mt-4 bg-slate-900 text-white" variant="outline">+ Adicionar Nova Conta</Button>
                </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
