import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { getApiBase } from "@/lib/api-base";
import { cn } from "@/lib/utils";
import {
  CreditCard, Tag, Landmark, User, Plus, Edit2, Trash2, X, Check,
  Wallet, TrendingUp, Building2, Banknote, ChevronRight, AlertCircle,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Link } from "wouter";

const API = getApiBase();

type Category = {
  id: number; name: string; type: string; color: string | null;
  icon: string | null; group: string | null; isActive: boolean;
};
type Account = {
  id: number; name: string; type: string; balance: number;
  banco: string | null; color: string | null; isActive: boolean;
};

type Tab = "categorias" | "contas" | "cartoes" | "perfil";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "categorias", label: "Categorias", icon: Tag },
  { id: "contas", label: "Contas", icon: Landmark },
  { id: "cartoes", label: "Cartões", icon: CreditCard },
  { id: "perfil", label: "Perfil", icon: User },
];

const CATEGORY_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#f59e0b", "#eab308",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
  "#ef4444", "#64748b", "#0a0a0a",
];

const ACCOUNT_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  checking: { label: "Conta Corrente", icon: Building2, color: "text-blue-400 bg-blue-500/10" },
  savings: { label: "Poupança", icon: Banknote, color: "text-emerald-400 bg-emerald-500/10" },
  wallet: { label: "Carteira", icon: Wallet, color: "text-amber-400 bg-amber-500/10" },
  investment: { label: "Investimentos", icon: TrendingUp, color: "text-violet-400 bg-violet-500/10" },
  credit: { label: "Crédito", icon: CreditCard, color: "text-rose-400 bg-rose-500/10" },
};

/* ─── MODAL BASE ─────────────────────────────────────────────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ─── CATEGORIAS TAB ─────────────────────────────────────────────────────── */
function CategoryForm({
  initial, onSave, onCancel, saving,
}: {
  initial?: Partial<Category>; onSave: (data: any) => void; onCancel: () => void; saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<"expense" | "income">(initial?.type === "income" ? "income" : "expense");
  const [color, setColor] = useState(initial?.color ?? "#6366f1");

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Nome</label>
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Ex: Alimentação, Salário..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Tipo</label>
        <div className="flex gap-2">
          {[
            { value: "expense", label: "Despesa", active: "bg-rose-500/20 text-rose-400 border-rose-500/50" },
            { value: "income", label: "Receita", active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" },
          ].map(opt => (
            <button
              key={opt.value} type="button"
              onClick={() => setType(opt.value as "expense" | "income")}
              className={cn(
                "flex-1 py-2 rounded-xl border text-sm font-medium transition-all",
                type === opt.value ? opt.active : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Cor</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map(c => (
            <button
              key={c} type="button"
              onClick={() => setColor(c)}
              className={cn("w-7 h-7 rounded-lg transition-all border-2", color === c ? "border-white scale-110" : "border-transparent hover:scale-105")}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors">
          Cancelar
        </button>
        <button
          onClick={() => { if (name.trim()) onSave({ name: name.trim(), type, color }); }}
          disabled={saving || !name.trim()}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}

function CategoriasTab() {
  const qc = useQueryClient();
  const [modalState, setModalState] = useState<{ mode: "create" | "edit"; category?: Category } | null>(null);

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => { const r = await fetch(`${API}/api/categories`); return r.json(); },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(`${API}/api/categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Erro ao criar categoria");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); setModalState(null); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const r = await fetch(`${API}/api/categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Erro ao atualizar");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); setModalState(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${API}/api/categories/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/api/categories/seed`, { method: "POST" });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  const despesas = categories.filter(c => c.type === "expense" && c.isActive);
  const receitas = categories.filter(c => c.type === "income" && c.isActive);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Categorias</h3>
          <p className="text-xs text-slate-500 mt-0.5">{categories.length} categorias cadastradas</p>
        </div>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {seedMutation.isPending ? "Criando..." : "Criar padrões"}
            </button>
          )}
          <button
            onClick={() => setModalState({ mode: "create" })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Categoria
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-10 text-center space-y-4">
          <Tag className="w-10 h-10 text-slate-600 mx-auto" />
          <div>
            <p className="text-slate-400 font-medium">Nenhuma categoria cadastrada</p>
            <p className="text-slate-500 text-sm mt-1">Crie categorias para organizar seus lançamentos.</p>
          </div>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {seedMutation.isPending ? "Criando..." : "Criar categorias padrão"}
          </button>
        </div>
      ) : (
        <>
          {despesas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Despesas</p>
              <div className="space-y-1.5">
                {despesas.map(cat => (
                  <CategoryRow key={cat.id} category={cat}
                    onEdit={() => setModalState({ mode: "edit", category: cat })}
                    onDelete={() => { if (confirm(`Excluir "${cat.name}"?`)) deleteMutation.mutate(cat.id); }}
                  />
                ))}
              </div>
            </div>
          )}
          {receitas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Receitas</p>
              <div className="space-y-1.5">
                {receitas.map(cat => (
                  <CategoryRow key={cat.id} category={cat}
                    onEdit={() => setModalState({ mode: "edit", category: cat })}
                    onDelete={() => { if (confirm(`Excluir "${cat.name}"?`)) deleteMutation.mutate(cat.id); }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {modalState && (
        <Modal
          title={modalState.mode === "create" ? "Nova Categoria" : "Editar Categoria"}
          onClose={() => setModalState(null)}
        >
          <CategoryForm
            initial={modalState.category}
            onSave={(data) => {
              if (modalState.mode === "create") createMutation.mutate(data);
              else updateMutation.mutate({ id: modalState.category!.id, data });
            }}
            onCancel={() => setModalState(null)}
            saving={createMutation.isPending || updateMutation.isPending}
          />
        </Modal>
      )}
    </div>
  );
}

function CategoryRow({ category, onEdit, onDelete }: { category: Category; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/40 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: (category.color ?? "#6366f1") + "22", border: `1.5px solid ${category.color ?? "#6366f1"}33` }}>
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color ?? "#6366f1" }} />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{category.name}</p>
          <span className={cn("text-xs", category.type === "expense" ? "text-rose-400" : "text-emerald-400")}>
            {category.type === "expense" ? "Despesa" : "Receita"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── CONTAS TAB ─────────────────────────────────────────────────────────── */
function AccountForm({
  initial, onSave, onCancel, saving,
}: {
  initial?: Partial<Account>; onSave: (data: any) => void; onCancel: () => void; saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "checking");
  const [balance, setBalance] = useState(initial?.balance?.toString() ?? "0");
  const [banco, setBanco] = useState(initial?.banco ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6366f1");

  const accountTypes = [
    { value: "checking", label: "Conta Corrente" },
    { value: "savings", label: "Poupança" },
    { value: "wallet", label: "Carteira" },
    { value: "investment", label: "Investimentos" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">Nome da Conta</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="Ex: Nubank, Itaú..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">Banco (opcional)</label>
          <input
            value={banco} onChange={e => setBanco(e.target.value)}
            placeholder="Ex: Nubank, Bradesco..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Tipo</label>
        <div className="grid grid-cols-2 gap-2">
          {accountTypes.map(opt => (
            <button
              key={opt.value} type="button"
              onClick={() => setType(opt.value)}
              className={cn(
                "py-2 rounded-xl border text-xs font-medium transition-all",
                type === opt.value ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/50" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Saldo Inicial (R$)</label>
        <input
          type="number" step="0.01"
          value={balance} onChange={e => setBalance(e.target.value)}
          placeholder="0,00"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Cor</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={cn("w-7 h-7 rounded-lg transition-all border-2", color === c ? "border-white scale-110" : "border-transparent hover:scale-105")}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors">
          Cancelar
        </button>
        <button
          onClick={() => { if (name.trim()) onSave({ name: name.trim(), type, balance: parseFloat(balance) || 0, banco: banco.trim() || null, color }); }}
          disabled={saving || !name.trim()}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}

function ContasTab() {
  const qc = useQueryClient();
  const [modalState, setModalState] = useState<{ mode: "create" | "edit"; account?: Account } | null>(null);

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: async () => { const r = await fetch(`${API}/api/accounts`); return r.json(); },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch(`${API}/api/accounts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Erro ao criar conta");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); setModalState(null); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const r = await fetch(`${API}/api/accounts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Erro ao atualizar");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); setModalState(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${API}/api/accounts/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Contas</h3>
          <p className="text-xs text-slate-500 mt-0.5">{accounts.length} contas · saldo total: <span className="text-emerald-400 font-medium">{formatCurrency(totalBalance)}</span></p>
        </div>
        <button
          onClick={() => setModalState({ mode: "create" })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Conta
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-10 text-center space-y-4">
          <Landmark className="w-10 h-10 text-slate-600 mx-auto" />
          <div>
            <p className="text-slate-400 font-medium">Nenhuma conta cadastrada</p>
            <p className="text-slate-500 text-sm mt-1">Adicione suas contas bancárias, carteiras e investimentos.</p>
          </div>
          <button
            onClick={() => setModalState({ mode: "create" })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Adicionar primeira conta
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map(account => {
            const meta = ACCOUNT_TYPE_META[account.type] ?? ACCOUNT_TYPE_META.checking;
            const Icon = meta.icon;
            return (
              <div key={account.id} className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/40 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: (account.color ?? "#6366f1") + "22" }}>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: account.color ?? "#6366f1" }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{account.name}</p>
                      {account.banco && <span className="text-xs text-slate-500">· {account.banco}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn("px-1.5 py-0 rounded text-xs font-medium", meta.color)}>{meta.label}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={cn("text-sm font-bold tabular-nums", account.balance >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {formatCurrency(account.balance)}
                    </p>
                    <p className="text-xs text-slate-600">saldo</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModalState({ mode: "edit", account })} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (confirm(`Excluir "${account.name}"?`)) deleteMutation.mutate(account.id); }} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalState && (
        <Modal
          title={modalState.mode === "create" ? "Nova Conta" : "Editar Conta"}
          onClose={() => setModalState(null)}
        >
          <AccountForm
            initial={modalState.account}
            onSave={(data) => {
              if (modalState.mode === "create") createMutation.mutate(data);
              else updateMutation.mutate({ id: modalState.account!.id, data });
            }}
            onCancel={() => setModalState(null)}
            saving={createMutation.isPending || updateMutation.isPending}
          />
        </Modal>
      )}
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("categorias");

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-slate-900">Configurações</h1>
          <p className="text-slate-500 mt-1">Gerencie suas categorias, contas e preferências.</p>
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

          {/* Content */}
          <div className="flex-1 min-w-0 bg-[#0A0A0A] rounded-2xl p-6 border border-slate-800">
            {activeTab === "categorias" && <CategoriasTab />}
            {activeTab === "contas" && <ContasTab />}

            {activeTab === "cartoes" && (
              <div className="text-center py-10 space-y-4">
                <CreditCard className="w-12 h-12 text-slate-600 mx-auto" />
                <div>
                  <p className="text-white font-medium">Gerenciamento de Cartões</p>
                  <p className="text-slate-400 text-sm mt-1">Acesse o módulo completo para cadastrar e controlar seus cartões.</p>
                </div>
                <Link href="/cartoes">
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
                    <CreditCard className="w-4 h-4" /> Ir para Cartões
                  </button>
                </Link>
              </div>
            )}

            {activeTab === "perfil" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-white">Perfil</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Informações da sua conta e assinatura.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-500/15 border border-indigo-500/20 rounded-2xl flex items-center justify-center">
                    <User className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">Usuário Vertex</p>
                    <p className="text-slate-400 text-sm">usuario@email.com</p>
                  </div>
                </div>
                <div className="border border-slate-800 rounded-xl p-4 space-y-3">
                  {[
                    { label: "Plano", value: "Premium", color: "text-indigo-400" },
                    { label: "Status", value: "Ativo", color: "text-emerald-400" },
                    { label: "Próxima cobrança", value: "01/05/2026", color: "text-white" },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-slate-500">{item.label}</span>
                      <span className={cn("font-semibold", item.color)}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 rounded-xl p-5 border border-indigo-500/20">
                  <p className="font-semibold text-white mb-1">Vertex OS</p>
                  <p className="text-sm text-slate-400">Sistema de gestão pessoal de nível profissional.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
