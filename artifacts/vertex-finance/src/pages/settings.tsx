import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Tag,
  Landmark,
  User,
  Plus,
  Edit2,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";

type Tab = "contas" | "categorias" | "cartoes" | "perfil";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "contas", label: "Contas", icon: Landmark },
  { id: "categorias", label: "Categorias", icon: Tag },
  { id: "cartoes", label: "Cartões", icon: CreditCard },
  { id: "perfil", label: "Perfil", icon: User },
];

const SAMPLE_ACCOUNTS = [
  { name: "Nubank", type: "Conta Corrente", color: "#6366F1", initial: "N" },
  { name: "Banco Inter", type: "Conta Corrente", color: "#F97316", initial: "I" },
  { name: "Itaú", type: "Conta Poupança", color: "#0EA5E9", initial: "I" },
];

const SAMPLE_CATEGORIES = [
  { name: "Moradia", color: "#6366F1", sub: ["Aluguel", "Condomínio", "Energia", "Água", "Internet"] },
  { name: "Alimentação", color: "#F97316", sub: ["Supermercado", "Restaurante", "Delivery", "Padaria"] },
  { name: "Transporte", color: "#0EA5E9", sub: ["Combustível", "Uber/99", "Pedágio", "Manutenção"] },
  { name: "Saúde", color: "#10B981", sub: ["Plano de Saúde", "Farmácia", "Consultas", "Academia"] },
  { name: "Lazer", color: "#EC4899", sub: ["Viagens", "Streaming", "Cinema", "Jogos"] },
  { name: "Investimentos", color: "#8B5CF6", sub: ["Renda Fixa", "Ações", "FIIs", "Criptomoedas"] },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("contas");

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 mt-1">Gerencie suas contas, categorias, cartões e perfil.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar nav */}
        <div className="w-full md:w-52 flex-shrink-0">
          <nav className="flex flex-col gap-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all",
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("w-4 h-4", activeTab === tab.id ? "text-primary" : "text-slate-400")} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content panel */}
        <div className="flex-1">
          {activeTab === "contas" && (
            <Card className="border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Contas Bancárias</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Suas contas correntes, poupanças e investimentos.</p>
                </div>
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </div>
              <CardContent className="p-6 space-y-3">
                {SAMPLE_ACCOUNTS.map(acc => (
                  <div key={acc.name} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: acc.color }}>
                        {acc.initial}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{acc.name}</p>
                        <p className="text-xs text-slate-500">{acc.type}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1 text-slate-400 hover:text-slate-600">
                      <Edit2 className="w-3 h-3" /> Editar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "categorias" && (
            <Card className="border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Categorias</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Organize seus lançamentos por categoria e subcategoria.</p>
                </div>
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" /> Nova Categoria
                </Button>
              </div>
              <CardContent className="p-6 space-y-3">
                {SAMPLE_CATEGORIES.map(cat => (
                  <div key={cat.name} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="font-semibold text-slate-800 text-sm">{cat.name}</span>
                        <span className="text-xs text-slate-400">{cat.sub.length} subcategorias</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-400">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                    <div className="px-4 py-2 flex flex-wrap gap-2">
                      {cat.sub.map(s => (
                        <span key={s} className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-600">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "cartoes" && (
            <Card className="border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Cartões de Crédito</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Gerencie seus cartões no módulo dedicado.</p>
                </div>
              </div>
              <CardContent className="p-8 text-center">
                <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium mb-2">Gerenciamento de Cartões</p>
                <p className="text-slate-400 text-sm mb-6">Acesse o módulo completo de cartões para cadastrar, editar e controlar limites.</p>
                <Link href="/cartoes">
                  <Button className="gap-2">
                    <CreditCard className="w-4 h-4" /> Ir para Cartões Cadastrados
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {activeTab === "perfil" && (
            <Card className="border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-semibold text-lg">Perfil</h3>
                <p className="text-sm text-slate-500 mt-0.5">Informações da sua conta e assinatura.</p>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-lg">Usuário Vertex</p>
                    <p className="text-slate-500 text-sm">usuario@email.com</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Plano</span>
                    <span className="font-semibold text-primary">Premium</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Status</span>
                    <span className="font-semibold text-emerald-600">Ativo</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Próxima cobrança</span>
                    <span className="font-semibold text-slate-900">01/05/2026</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-5 border border-primary/10">
                  <p className="font-semibold text-slate-900 mb-1">Vertex Finance OS</p>
                  <p className="text-sm text-slate-500">Sistema de gestão financeira pessoal de nível profissional.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
