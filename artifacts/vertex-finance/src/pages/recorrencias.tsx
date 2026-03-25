import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatCurrency } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, RefreshCw, X, Check,
  TrendingUp, TrendingDown, Calendar, Wallet, AlertCircle, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/lib/api-base";

interface Recorrencia {
  id: number;
  tipo: "receita" | "despesa";
  descricao: string;
  categoriaId: number | null;
  categoriaName: string | null;
  valor: number;
  formaPagamento: string | null;
  contaId: number | null;
  contaName: string | null;
  diaVencimento: number;
  frequencia: string;
  dataInicio: string;
  dataFim: string | null;
  ativo: boolean;
  tipoCusto: string;
  obrigatorio: boolean;
  observacoes: string | null;
  createdAt: string;
}

const TIPO_CUSTO_LABELS: Record<string, string> = {
  essencial: "Essencial",
  fixo: "Fixo",
  variavel: "Variável",
  investimento: "Investimento",
  luxo: "Lazer/Luxo",
};

const FORMA_LABELS: Record<string, string> = {
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  boleto: "Boleto",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
};

const FREQ_LABELS: Record<string, string> = {
  mensal: "Mensal",
  anual: "Anual",
  semanal: "Semanal",
};

const emptyForm = {
  tipo: "despesa" as "receita" | "despesa",
  descricao: "",
  valor: "",
  diaVencimento: "5",
  frequencia: "mensal",
  formaPagamento: "debito",
  dataInicio: new Date().toISOString().split("T")[0],
  dataFim: "",
  tipoCusto: "fixo",
  obrigatorio: true,
  observacoes: "",
};

async function fetchRecorrencias(): Promise<Recorrencia[]> {
  const res = await fetch(`${getApiBase()}/api/recurring`);
  if (!res.ok) throw new Error("Erro ao carregar");
  return res.json();
}

export default function RecorrenciasPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [filterTipo, setFilterTipo] = useState<"todos" | "receita" | "despesa">("todos");
  const [filterAtivo, setFilterAtivo] = useState<"todos" | "ativo" | "inativo">("todos");

  const { data: items = [], isLoading } = useQuery<Recorrencia[]>({
    queryKey: ["recurring"],
    queryFn: fetchRecorrencias,
  });

  const createMutation = useMutation({
    mutationFn: async (body: typeof emptyForm) => {
      const res = await fetch(`${getApiBase()}/api/recurring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, valor: Number(body.valor), diaVencimento: Number(body.diaVencimento) }),
      });
      if (!res.ok) throw new Error("Erro ao criar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
      queryClient.invalidateQueries({ queryKey: ["annual-plans"] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: typeof emptyForm }) => {
      const res = await fetch(`${getApiBase()}/api/recurring/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, valor: Number(body.valor), diaVencimento: Number(body.diaVencimento) }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
      queryClient.invalidateQueries({ queryKey: ["annual-plans"] });
      closeForm();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${getApiBase()}/api/recurring/${id}/toggle`, { method: "PATCH" });
      if (!res.ok) throw new Error("Erro ao alternar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
      queryClient.invalidateQueries({ queryKey: ["annual-plans"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${getApiBase()}/api/recurring/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
      queryClient.invalidateQueries({ queryKey: ["annual-plans"] });
      setDeleteConfirm(null);
    },
  });

  function openCreate() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(item: Recorrencia) {
    setForm({
      tipo: item.tipo,
      descricao: item.descricao,
      valor: String(item.valor),
      diaVencimento: String(item.diaVencimento),
      frequencia: item.frequencia,
      formaPagamento: item.formaPagamento ?? "debito",
      dataInicio: item.dataInicio,
      dataFim: item.dataFim ?? "",
      tipoCusto: item.tipoCusto ?? "fixo",
      obrigatorio: item.obrigatorio ?? true,
      observacoes: item.observacoes ?? "",
    });
    setEditingId(item.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, body: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const filtered = items.filter(i => {
    if (filterTipo !== "todos" && i.tipo !== filterTipo) return false;
    if (filterAtivo === "ativo" && !i.ativo) return false;
    if (filterAtivo === "inativo" && i.ativo) return false;
    return true;
  });

  const totalMensalDespesas = items
    .filter(i => i.ativo && i.tipo === "despesa")
    .reduce((s, i) => s + i.valor, 0);
  const totalMensalReceitas = items
    .filter(i => i.ativo && i.tipo === "receita")
    .reduce((s, i) => s + i.valor, 0);
  const countAtivos = items.filter(i => i.ativo).length;
  const countInativos = items.filter(i => !i.ativo).length;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Recorrências</h1>
          <p className="text-slate-500 mt-1">
            Despesas e receitas fixas que alimentam automaticamente o planejamento mensal.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Recorrência
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Comprometido/mês</p>
          </div>
          <p className="text-xl font-bold text-rose-600 font-mono">{formatCurrency(totalMensalDespesas)}</p>
          <p className="text-xs text-slate-400 mt-0.5">despesas fixas ativas</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Receitas/mês</p>
          </div>
          <p className="text-xl font-bold text-emerald-600 font-mono">{formatCurrency(totalMensalReceitas)}</p>
          <p className="text-xs text-slate-400 mt-0.5">receitas fixas ativas</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Ativas</p>
          </div>
          <p className="text-xl font-bold text-slate-800">{countAtivos}</p>
          <p className="text-xs text-slate-400 mt-0.5">recorrências em vigor</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Pausadas</p>
          </div>
          <p className="text-xl font-bold text-slate-500">{countInativos}</p>
          <p className="text-xs text-slate-400 mt-0.5">temporariamente inativas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
          {(["todos", "despesa", "receita"] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterTipo(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                filterTipo === t ? "bg-primary text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {t === "todos" ? "Todos" : t === "despesa" ? "Despesas" : "Receitas"}
            </button>
          ))}
        </div>

        <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
          {(["todos", "ativo", "inativo"] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterAtivo(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                filterAtivo === t ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {t === "todos" ? "Todos" : t === "ativo" ? "Ativas" : "Pausadas"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400">Carregando recorrências...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p className="font-semibold text-slate-600">Nenhuma recorrência encontrada</p>
            <p className="text-sm text-slate-400 mt-1">
              {items.length === 0
                ? "Cadastre sua primeira despesa ou receita fixa para automatizar o planejamento."
                : "Tente mudar os filtros acima."}
            </p>
            {items.length === 0 && (
              <button
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary font-semibold px-4 py-2 rounded-xl text-sm hover:bg-primary/15 transition-colors"
              >
                <Plus className="w-4 h-4" /> Criar primeira recorrência
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(item => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors group",
                  !item.ativo && "opacity-50"
                )}
              >
                {/* Type badge */}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  item.tipo === "receita" ? "bg-emerald-50" : "bg-rose-50"
                )}>
                  {item.tipo === "receita"
                    ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                    : <TrendingDown className="w-4 h-4 text-rose-500" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800 text-sm">{item.descricao}</p>
                    {!item.ativo && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md uppercase">
                        Pausado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {item.categoriaName && (
                      <span className="text-xs text-slate-400">{item.categoriaName}</span>
                    )}
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Dia {item.diaVencimento} — {FREQ_LABELS[item.frequencia] ?? item.frequencia}
                    </span>
                    {item.formaPagamento && (
                      <>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                          <Wallet className="w-3 h-3" />
                          {FORMA_LABELS[item.formaPagamento] ?? item.formaPagamento}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Value */}
                <div className="text-right flex-shrink-0">
                  <p className={cn(
                    "font-bold text-base font-mono",
                    item.tipo === "receita" ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {item.tipo === "receita" ? "+" : "−"}{formatCurrency(item.valor)}
                  </p>
                  <p className="text-[10px] text-slate-400">por mês</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleMutation.mutate(item.id)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    title={item.ativo ? "Pausar" : "Ativar"}
                  >
                    {item.ativo
                      ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                      : <ToggleLeft className="w-5 h-5 text-slate-400" />
                    }
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(item.id)}
                    className="p-2 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-bold text-slate-900 text-lg">Excluir recorrência?</h3>
            <p className="text-slate-500 text-sm mt-2">
              Esta ação é irreversível. A recorrência será removida e não afetará mais o planejamento mensal.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm disabled:opacity-60"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/30 backdrop-blur-sm">
          <div className="bg-white h-full w-full max-w-lg shadow-2xl flex flex-col overflow-y-auto">
            {/* Modal header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-lg">
                {editingId !== null ? "Editar Recorrência" : "Nova Recorrência"}
              </h2>
              <button
                onClick={closeForm}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-6 gap-5">
              {/* Tipo */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["despesa", "receita"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, tipo: t }))}
                      className={cn(
                        "py-2.5 rounded-xl text-sm font-semibold transition-all border-2",
                        form.tipo === t
                          ? t === "despesa"
                            ? "bg-rose-50 border-rose-400 text-rose-700"
                            : "bg-emerald-50 border-emerald-400 text-emerald-700"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      )}
                    >
                      {t === "despesa" ? "Despesa" : "Receita"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel, Academia, Internet..."
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Valor */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="0,00"
                  value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
                />
              </div>

              {/* Dia Vencimento + Frequência */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                    Dia do Vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={form.diaVencimento}
                    onChange={e => setForm(f => ({ ...f, diaVencimento: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                    Frequência
                  </label>
                  <select
                    value={form.frequencia}
                    onChange={e => setForm(f => ({ ...f, frequencia: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="semanal">Semanal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>

              {/* Tipo de Custo de Vida */}
              {form.tipo === "despesa" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                    Tipo de Custo de Vida
                  </label>
                  <select
                    value={form.tipoCusto}
                    onChange={e => setForm(f => ({ ...f, tipoCusto: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                  >
                    <option value="essencial">Essencial (moradia, saúde, alimentação)</option>
                    <option value="fixo">Fixo não essencial (assinaturas, serviços)</option>
                    <option value="variavel">Variável recorrente</option>
                    <option value="investimento">Investimento recorrente</option>
                    <option value="luxo">Conforto / Lazer</option>
                  </select>
                </div>
              )}

              {/* Obrigatorio + Forma de Pagamento */}
              <div className="grid grid-cols-2 gap-4">
                {form.tipo === "despesa" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                      Obrigatório?
                    </label>
                    <div className="flex gap-2">
                      {([true, false] as const).map(val => (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, obrigatorio: val }))}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-2",
                            form.obrigatorio === val
                              ? val
                                ? "bg-rose-50 border-rose-400 text-rose-700"
                                : "bg-slate-100 border-slate-300 text-slate-600"
                              : "border-slate-200 text-slate-500 hover:border-slate-300"
                          )}
                        >
                          {val ? "Sim" : "Não"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className={form.tipo === "despesa" ? "" : "col-span-2"}>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                    Forma de Pagamento
                  </label>
                  <select
                    value={form.formaPagamento}
                    onChange={e => setForm(f => ({ ...f, formaPagamento: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                  >
                    <option value="debito">Débito</option>
                    <option value="pix">Pix</option>
                    <option value="credito">Crédito</option>
                    <option value="boleto">Boleto</option>
                    <option value="transferencia">Transferência</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              {/* Data Início + Fim */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                    Início
                  </label>
                  <input
                    type="date"
                    required
                    value={form.dataInicio}
                    onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                    Fim (opcional)
                  </label>
                  <input
                    type="date"
                    value={form.dataFim}
                    onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  Observações (opcional)
                </label>
                <textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Nota interna..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 mt-auto">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl transition-colors text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {editingId !== null ? "Salvar alterações" : "Criar recorrência"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
