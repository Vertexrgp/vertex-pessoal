import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  ArrowLeft, Plus, Trash2, Pencil, Check, X, MapPin, Star,
  ThumbsUp, ThumbsDown, DollarSign, TrendingUp, CalendarDays,
  CheckSquare, Clock, ChevronDown, ChevronUp, BarChart3, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getApiBase } from "@/lib/api-base";

const apiUrl = (path: string) => `${getApiBase()}/api${path}`;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CustoVida { id: number; cidadeId: number; aluguel: number; transporte: number; alimentacao: number; saude: number; impostos: number; lazer: number; outros: number; }
interface ProContra { id: number; cidadeId: number; tipo: string; descricao: string; }
interface Cidade { id: number; nome: string; pais: string; moeda: string; qualidadeVida: number | null; facilidadeAdaptacao: number | null; observacoes: string | null; custoVida: CustoVida | null; prosContras: ProContra[]; }
interface PlanoItem { id: number; titulo: string; descricao: string | null; prazo: string | null; status: string; ordem: number; }
interface Checkpoint { id: number; titulo: string; descricao: string | null; dataAlvo: string | null; status: string; }
interface Projeto { id: number; titulo: string; descricao: string | null; tipo: string; status: string; cidades: Cidade[]; planoAcao: PlanoItem[]; checkpoints: Checkpoint[]; }

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-slate-100 text-slate-600" },
  em_andamento: { label: "Em andamento", color: "bg-blue-100 text-blue-700" },
  concluido: { label: "Concluído", color: "bg-emerald-100 text-emerald-700" },
};

const formatCurrency = (v: number, moeda = "USD") => {
  try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda, maximumFractionDigits: 0 }).format(v); }
  catch { return `${moeda} ${v.toFixed(0)}`; }
};

const totalCusto = (c: CustoVida | null) => !c ? 0 : (c.aluguel + c.transporte + c.alimentacao + c.saude + c.impostos + c.lazer + c.outros);

const CUSTO_FIELDS = [
  { key: "aluguel", label: "Aluguel / Moradia", icon: "🏠" },
  { key: "alimentacao", label: "Alimentação", icon: "🍽️" },
  { key: "transporte", label: "Transporte", icon: "🚆" },
  { key: "saude", label: "Saúde / Seguro", icon: "🏥" },
  { key: "impostos", label: "Impostos / Vistos", icon: "📋" },
  { key: "lazer", label: "Lazer / Cultura", icon: "🎭" },
  { key: "outros", label: "Outros", icon: "📦" },
] as const;

// ─── Sub-components ────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
        <button key={i} onClick={() => onChange(i)} className={cn("w-4 h-4 rounded-sm transition-colors", (value || 0) >= i ? "bg-amber-400" : "bg-slate-100 hover:bg-amber-200")} />
      ))}
    </div>
  );
}

function CidadeModal({ projetoId, initial, onClose, onSave }: { projetoId: number; initial?: Cidade | null; onClose: () => void; onSave: (c: object) => void }) {
  const [nome, setNome] = useState(initial?.nome || "");
  const [pais, setPais] = useState(initial?.pais || "");
  const [moeda, setMoeda] = useState(initial?.moeda || "USD");
  const [ql, setQl] = useState<number | null>(initial?.qualidadeVida ?? null);
  const [fa, setFa] = useState<number | null>(initial?.facilidadeAdaptacao ?? null);
  const [obs, setObs] = useState(initial?.observacoes || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-slate-900 mb-4">{initial ? "Editar cidade" : "Adicionar cidade"}</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Cidade</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Lisboa" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">País</label>
              <input value={pais} onChange={(e) => setPais(e.target.value)} placeholder="Portugal" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Moeda local</label>
            <select value={moeda} onChange={(e) => setMoeda(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
              {["USD","EUR","GBP","BRL","CAD","AUD","CHF","MXN","ARS","CLP","COP","PEN"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Qualidade de vida (1–10)</label>
            <StarRating value={ql} onChange={setQl} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Facilidade de adaptação (1–10)</label>
            <StarRating value={fa} onChange={setFa} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Observações</label>
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancelar</button>
          <button onClick={() => { if (nome && pais) onSave({ nome, pais, moeda, qualidadeVida: ql, facilidadeAdaptacao: fa, observacoes: obs }); }} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Cidades ──────────────────────────────────────────────────────────────

function TabCidades({ projeto, projetoId }: { projeto: Projeto; projetoId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAddCidade, setShowAddCidade] = useState(false);
  const [editCidade, setEditCidade] = useState<Cidade | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingCustoId, setEditingCustoId] = useState<number | null>(null);
  const [custoForm, setCustoForm] = useState<Record<string, string>>({});
  const [proContraForm, setProContraForm] = useState<Record<number, { tipo: string; descricao: string }>>({});

  const addCidade = useMutation({
    mutationFn: (body: object) => fetch(apiUrl(`/vida/projetos/${projetoId}/cidades`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }); toast({ title: "Cidade adicionada!" }); setShowAddCidade(false); },
  });

  const updateCidade = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & object) => fetch(apiUrl(`/vida/cidades/${id}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }); setEditCidade(null); },
  });

  const deleteCidade = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/vida/cidades/${id}`), { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }),
  });

  const saveCusto = useMutation({
    mutationFn: ({ cidadeId, data }: { cidadeId: number; data: object }) => fetch(apiUrl(`/vida/cidades/${cidadeId}/custo-vida`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }); setEditingCustoId(null); toast({ title: "Custo de vida atualizado!" }); },
  });

  const addPC = useMutation({
    mutationFn: ({ cidadeId, tipo, descricao }: { cidadeId: number; tipo: string; descricao: string }) => fetch(apiUrl(`/vida/cidades/${cidadeId}/pros-contras`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, descricao }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }),
  });

  const deletePC = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/vida/pros-contras/${id}`), { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }),
  });

  const startEditCusto = (c: Cidade) => {
    const cv = c.custoVida;
    setCustoForm({
      aluguel: String(cv?.aluguel ?? 0), transporte: String(cv?.transporte ?? 0),
      alimentacao: String(cv?.alimentacao ?? 0), saude: String(cv?.saude ?? 0),
      impostos: String(cv?.impostos ?? 0), lazer: String(cv?.lazer ?? 0), outros: String(cv?.outros ?? 0),
    });
    setEditingCustoId(c.id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">Compare cidades e custo de vida detalhado</p>
        <button onClick={() => setShowAddCidade(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Adicionar cidade
        </button>
      </div>

      {projeto.cidades.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl">
          <MapPin className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-slate-400 text-sm">Nenhuma cidade adicionada</p>
        </div>
      )}

      <div className="space-y-3">
        {projeto.cidades.map((c) => {
          const total = totalCusto(c.custoVida);
          const expanded = expandedId === c.id;
          const pros = c.prosContras.filter((p) => p.tipo === "pro");
          const contras = c.prosContras.filter((p) => p.tipo === "contra");
          const pcForm = proContraForm[c.id] || { tipo: "pro", descricao: "" };

          return (
            <div key={c.id} className="border border-slate-200 rounded-2xl overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedId(expanded ? null : c.id)}
              >
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">{c.nome}</h3>
                    <span className="text-xs text-slate-400">{c.pais}</span>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">{c.moeda}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {total > 0 && <span className="text-xs text-slate-500">{formatCurrency(total, c.moeda)}/mês</span>}
                    {c.qualidadeVida && <span className="text-xs text-amber-600 flex items-center gap-0.5"><Star className="w-3 h-3" />{c.qualidadeVida}/10</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); setEditCidade(c); }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteCidade.mutate(c.id); }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {/* Expanded */}
              {expanded && (
                <div className="border-t border-slate-100 p-4 space-y-5 bg-slate-50/50">
                  {/* Scores */}
                  {(c.qualidadeVida || c.facilidadeAdaptacao) && (
                    <div className="grid grid-cols-2 gap-3">
                      {c.qualidadeVida && (
                        <div className="bg-white rounded-xl p-3 border border-slate-100">
                          <p className="text-xs text-slate-400 mb-1.5">Qualidade de vida</p>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-slate-900">{c.qualidadeVida}</span>
                            <span className="text-slate-400 text-sm">/10</span>
                          </div>
                          <div className="mt-1.5 flex gap-0.5">
                            {Array.from({ length: 10 }).map((_, i) => (
                              <div key={i} className={cn("h-1 flex-1 rounded-full", i < (c.qualidadeVida || 0) ? "bg-amber-400" : "bg-slate-100")} />
                            ))}
                          </div>
                        </div>
                      )}
                      {c.facilidadeAdaptacao && (
                        <div className="bg-white rounded-xl p-3 border border-slate-100">
                          <p className="text-xs text-slate-400 mb-1.5">Facilidade de adaptação</p>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-slate-900">{c.facilidadeAdaptacao}</span>
                            <span className="text-slate-400 text-sm">/10</span>
                          </div>
                          <div className="mt-1.5 flex gap-0.5">
                            {Array.from({ length: 10 }).map((_, i) => (
                              <div key={i} className={cn("h-1 flex-1 rounded-full", i < (c.facilidadeAdaptacao || 0) ? "bg-blue-400" : "bg-slate-100")} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Observações */}
                  {c.observacoes && (
                    <p className="text-sm text-slate-500 italic">"{c.observacoes}"</p>
                  )}

                  {/* Custo de Vida */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Custo de Vida Mensal</h4>
                      {editingCustoId !== c.id && (
                        <button onClick={() => startEditCusto(c)} className="text-xs text-primary hover:underline font-medium">Editar</button>
                      )}
                    </div>

                    {editingCustoId === c.id ? (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                        {CUSTO_FIELDS.map((f) => (
                          <div key={f.key} className="flex items-center gap-3">
                            <span className="text-base w-6 text-center flex-shrink-0">{f.icon}</span>
                            <label className="text-xs text-slate-600 flex-1">{f.label}</label>
                            <input
                              type="number"
                              value={custoForm[f.key] || ""}
                              onChange={(e) => setCustoForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                              className="w-28 px-2 py-1 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                              placeholder="0"
                            />
                            <span className="text-xs text-slate-400 w-8">{c.moeda}</span>
                          </div>
                        ))}
                        <div className="pt-2 flex justify-end gap-2">
                          <button onClick={() => setEditingCustoId(null)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors font-medium">Cancelar</button>
                          <button
                            onClick={() => saveCusto.mutate({ cidadeId: c.id, data: Object.fromEntries(Object.entries(custoForm).map(([k, v]) => [k, parseFloat(v) || 0])) })}
                            className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        {CUSTO_FIELDS.map((f, i) => {
                          const val = c.custoVida ? (c.custoVida as Record<string, number>)[f.key] || 0 : 0;
                          return (
                            <div key={f.key} className={cn("flex items-center gap-2 px-3 py-2 text-sm", i > 0 && "border-t border-slate-50")}>
                              <span className="text-sm">{f.icon}</span>
                              <span className="text-slate-600 flex-1 text-xs">{f.label}</span>
                              <span className={cn("text-xs font-semibold", val > 0 ? "text-slate-800" : "text-slate-300")}>{val > 0 ? formatCurrency(val, c.moeda) : "—"}</span>
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-200 bg-slate-50">
                          <span className="text-xs font-bold text-slate-700 flex-1">TOTAL MENSAL</span>
                          <span className="text-sm font-bold text-slate-900">{formatCurrency(total, c.moeda)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Prós e Contras */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Prós & Contras</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Prós */}
                      <div>
                        <div className="flex items-center gap-1 mb-1.5">
                          <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-semibold text-emerald-600">Prós ({pros.length})</span>
                        </div>
                        <div className="space-y-1">
                          {pros.map((p) => (
                            <div key={p.id} className="flex items-start gap-1.5 group">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                              <span className="text-xs text-slate-600 flex-1">{p.descricao}</span>
                              <button onClick={() => deletePC.mutate(p.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-rose-500 transition-all">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Contras */}
                      <div>
                        <div className="flex items-center gap-1 mb-1.5">
                          <ThumbsDown className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-xs font-semibold text-rose-600">Contras ({contras.length})</span>
                        </div>
                        <div className="space-y-1">
                          {contras.map((c2) => (
                            <div key={c2.id} className="flex items-start gap-1.5 group">
                              <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                              <span className="text-xs text-slate-600 flex-1">{c2.descricao}</span>
                              <button onClick={() => deletePC.mutate(c2.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-rose-500 transition-all">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Add pro/contra */}
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={pcForm.tipo}
                        onChange={(e) => setProContraForm((prev) => ({ ...prev, [c.id]: { ...pcForm, tipo: e.target.value } }))}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                      >
                        <option value="pro">✅ Pró</option>
                        <option value="contra">❌ Contra</option>
                      </select>
                      <input
                        value={pcForm.descricao}
                        onChange={(e) => setProContraForm((prev) => ({ ...prev, [c.id]: { ...pcForm, descricao: e.target.value } }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && pcForm.descricao.trim()) {
                            addPC.mutate({ cidadeId: c.id, tipo: pcForm.tipo, descricao: pcForm.descricao });
                            setProContraForm((prev) => ({ ...prev, [c.id]: { tipo: "pro", descricao: "" } }));
                          }
                        }}
                        placeholder="Adicionar item (Enter)..."
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        onClick={() => {
                          if (pcForm.descricao.trim()) {
                            addPC.mutate({ cidadeId: c.id, tipo: pcForm.tipo, descricao: pcForm.descricao });
                            setProContraForm((prev) => ({ ...prev, [c.id]: { tipo: "pro", descricao: "" } }));
                          }
                        }}
                        className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(showAddCidade || editCidade) && (
        <CidadeModal
          projetoId={projetoId}
          initial={editCidade}
          onClose={() => { setShowAddCidade(false); setEditCidade(null); }}
          onSave={(data) => {
            if (editCidade) updateCidade.mutate({ id: editCidade.id, ...data });
            else addCidade.mutate(data);
          }}
        />
      )}
    </div>
  );
}

// ─── Tab: Comparação ──────────────────────────────────────────────────────────

function TabComparacao({ projeto }: { projeto: Projeto }) {
  const cidades = projeto.cidades;
  if (cidades.length < 2) return (
    <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl">
      <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
      <p className="text-slate-400 text-sm">Adicione pelo menos 2 cidades para comparar</p>
    </div>
  );

  const maxTotal = Math.max(...cidades.map((c) => totalCusto(c.custoVida)));

  return (
    <div className="space-y-6">
      {/* Custo Total Comparison */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Custo mensal total</h3>
        <div className="space-y-2.5">
          {[...cidades].sort((a, b) => totalCusto(a.custoVida) - totalCusto(b.custoVida)).map((c) => {
            const total = totalCusto(c.custoVida);
            const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
            return (
              <div key={c.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{c.nome}, {c.pais}</span>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(total, c.moeda)}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Field breakdown table */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Detalhamento por categoria</h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Categoria</th>
                {cidades.map((c) => (
                  <th key={c.id} className="text-right px-4 py-3 text-xs font-bold text-slate-700">{c.nome}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CUSTO_FIELDS.map((f, i) => (
                <tr key={f.key} className={cn("border-t border-slate-50", i % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                  <td className="px-4 py-2.5 text-slate-600 flex items-center gap-2">
                    <span>{f.icon}</span> {f.label}
                  </td>
                  {cidades.map((c) => {
                    const val = c.custoVida ? (c.custoVida as Record<string, number>)[f.key] || 0 : 0;
                    return (
                      <td key={c.id} className={cn("px-4 py-2.5 text-right font-medium", val > 0 ? "text-slate-800" : "text-slate-300")}>
                        {val > 0 ? formatCurrency(val, c.moeda) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 bg-slate-100 font-bold">
                <td className="px-4 py-3 text-slate-700 text-xs uppercase tracking-wide">Total</td>
                {cidades.map((c) => (
                  <td key={c.id} className="px-4 py-3 text-right text-slate-900">{formatCurrency(totalCusto(c.custoVida), c.moeda)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Scores comparison */}
      {cidades.some((c) => c.qualidadeVida || c.facilidadeAdaptacao) && (
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3">Avaliações subjetivas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cidades.map((c) => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="font-semibold text-slate-800 mb-3">{c.nome}, {c.pais}</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span className="text-xs text-slate-500 flex-1">Qualidade de vida</span>
                    <span className="text-sm font-bold text-slate-800">{c.qualidadeVida ?? "—"}/10</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="text-xs text-slate-500 flex-1">Facilidade de adaptação</span>
                    <span className="text-sm font-bold text-slate-800">{c.facilidadeAdaptacao ?? "—"}/10</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-slate-500 flex-1">Prós</span>
                    <span className="text-sm font-bold text-emerald-700">{c.prosContras.filter((p) => p.tipo === "pro").length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span className="text-xs text-slate-500 flex-1">Contras</span>
                    <span className="text-sm font-bold text-rose-700">{c.prosContras.filter((p) => p.tipo === "contra").length}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Simulação ───────────────────────────────────────────────────────────

function TabSimulacao({ projeto }: { projeto: Projeto }) {
  const [rendaMensal, setRendaMensal] = useState<string>("");
  const [economias, setEconomias] = useState<string>("");
  const [cidadeSelecionada, setCidadeSelecionada] = useState<number | null>(projeto.cidades[0]?.id ?? null);

  const cidade = projeto.cidades.find((c) => c.id === cidadeSelecionada);
  const custo = cidade ? totalCusto(cidade.custoVida) : 0;
  const renda = parseFloat(rendaMensal) || 0;
  const poupanca = parseFloat(economias) || 0;

  const saldoMensal = renda - custo;
  const mesesReserva = custo > 0 ? Math.floor(poupanca / custo) : 0;
  const mesesParaJuntar = custo > 0 && saldoMensal > 0 ? Math.ceil(custo * 6 / saldoMensal) : null;

  return (
    <div className="space-y-5">
      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-sm text-violet-700">
        <AlertCircle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
        Simulação orientativa baseada nos dados de custo de vida das cidades. Configure os valores abaixo para calcular sua viabilidade.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Cidade para simular</label>
          <select value={cidadeSelecionada ?? ""} onChange={(e) => setCidadeSelecionada(parseInt(e.target.value))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
            {projeto.cidades.map((c) => <option key={c.id} value={c.id}>{c.nome}, {c.pais}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Renda mensal (na moeda local)</label>
          <input type="number" value={rendaMensal} onChange={(e) => setRendaMensal(e.target.value)} placeholder="Ex: 5000" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Economias atuais</label>
          <input type="number" value={economias} onChange={(e) => setEconomias(e.target.value)} placeholder="Ex: 30000" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      {cidade && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Custo mensal</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(custo, cidade.moeda)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{cidade.moeda}/mês</p>
          </div>
          <div className={cn("border rounded-2xl p-4 text-center", saldoMensal >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100")}>
            <p className="text-xs text-slate-400 mb-1">Saldo mensal</p>
            <p className={cn("text-lg font-bold", saldoMensal >= 0 ? "text-emerald-700" : "text-rose-700")}>{renda > 0 ? formatCurrency(Math.abs(saldoMensal), cidade.moeda) : "—"}</p>
            <p className={cn("text-xs mt-0.5", saldoMensal >= 0 ? "text-emerald-500" : "text-rose-500")}>{renda > 0 ? (saldoMensal >= 0 ? "sobra" : "déficit") : "informe a renda"}</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Reserva atual cobre</p>
            <p className="text-lg font-bold text-amber-700">{poupanca > 0 && custo > 0 ? `${mesesReserva} meses` : "—"}</p>
            <p className="text-xs text-amber-500 mt-0.5">{mesesReserva > 0 ? `${(mesesReserva / 12).toFixed(1)} anos` : "informe as economias"}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Meses p/ juntar 6x</p>
            <p className="text-lg font-bold text-blue-700">{mesesParaJuntar !== null ? `${mesesParaJuntar} meses` : "—"}</p>
            <p className="text-xs text-blue-500 mt-0.5">{mesesParaJuntar !== null ? `reserva emergência` : saldoMensal < 0 ? "renda insuficiente" : ""}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Plano de Ação ────────────────────────────────────────────────────────

function TabPlanoAcao({ projeto, projetoId }: { projeto: Projeto; projetoId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ titulo: "", descricao: "", prazo: "", status: "pendente" });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<PlanoItem | null>(null);

  const addItem = useMutation({
    mutationFn: (body: object) => fetch(apiUrl(`/vida/projetos/${projetoId}/plano-acao`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }); setShowForm(false); setForm({ titulo: "", descricao: "", prazo: "", status: "pendente" }); toast({ title: "Item adicionado!" }); },
  });

  const updateItem = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & object) => fetch(apiUrl(`/vida/plano-acao/${id}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }); setEditingId(null); },
  });

  const deleteItem = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/vida/plano-acao/${id}`), { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }),
  });

  const toggleStatus = (item: PlanoItem) => {
    const next = item.status === "concluido" ? "pendente" : item.status === "pendente" ? "em_andamento" : "concluido";
    updateItem.mutate({ id: item.id, titulo: item.titulo, descricao: item.descricao, prazo: item.prazo, status: next, ordem: item.ordem });
  };

  const concluidos = projeto.planoAcao.filter((p) => p.status === "concluido").length;
  const pct = projeto.planoAcao.length > 0 ? Math.round((concluidos / projeto.planoAcao.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {projeto.planoAcao.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Progresso geral</span>
            <span className="text-xs font-bold text-slate-700">{concluidos}/{projeto.planoAcao.length} concluídos</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">{pct}% completo</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{projeto.planoAcao.length} {projeto.planoAcao.length === 1 ? "item" : "itens"} no plano</p>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} placeholder="Título da ação" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" />
          <textarea value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descrição (opcional)" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Prazo</label>
              <input type="date" value={form.prazo} onChange={(e) => setForm((p) => ({ ...p, prazo: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="pendente">Pendente</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancelar</button>
            <button onClick={() => { if (form.titulo.trim()) addItem.mutate(form); }} className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors">Adicionar</button>
          </div>
        </div>
      )}

      {projeto.planoAcao.length === 0 && !showForm && (
        <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
          <CheckSquare className="w-8 h-8 mx-auto mb-2 text-slate-200" />
          <p className="text-slate-400 text-sm">Nenhum item no plano de ação</p>
        </div>
      )}

      <div className="space-y-2">
        {projeto.planoAcao.map((item) => {
          const st = STATUS_LABELS[item.status] || STATUS_LABELS.pendente;
          const isEditing = editingId === item.id;

          if (isEditing && editForm) return (
            <div key={item.id} className="border border-primary/30 rounded-xl p-3 bg-primary/5 space-y-2">
              <input value={editForm.titulo} onChange={(e) => setEditForm((p) => p ? { ...p, titulo: e.target.value } : p)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <textarea value={editForm.descricao || ""} onChange={(e) => setEditForm((p) => p ? { ...p, descricao: e.target.value } : p)} rows={1} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={editForm.prazo || ""} onChange={(e) => setEditForm((p) => p ? { ...p, prazo: e.target.value } : p)} className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none" />
                <select value={editForm.status} onChange={(e) => setEditForm((p) => p ? { ...p, status: e.target.value } : p)} className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none">
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluido">Concluído</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingId(null)} className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancelar</button>
                <button onClick={() => updateItem.mutate({ id: editForm.id, titulo: editForm.titulo, descricao: editForm.descricao, prazo: editForm.prazo, status: editForm.status, ordem: editForm.ordem })} className="px-2.5 py-1 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">Salvar</button>
              </div>
            </div>
          );

          return (
            <div key={item.id} className={cn("flex items-start gap-3 p-3 border rounded-xl group transition-colors", item.status === "concluido" ? "border-emerald-100 bg-emerald-50/40" : "border-slate-200 bg-white hover:border-slate-300")}>
              <button onClick={() => toggleStatus(item)} className={cn("w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors", item.status === "concluido" ? "border-emerald-400 bg-emerald-400" : item.status === "em_andamento" ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-primary")} >
                {item.status === "concluido" && <Check className="w-3 h-3 text-white" />}
                {item.status === "em_andamento" && <div className="w-2 h-2 rounded-full bg-blue-400" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", item.status === "concluido" && "line-through text-slate-400")}>{item.titulo}</p>
                {item.descricao && <p className="text-xs text-slate-400 mt-0.5">{item.descricao}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("text-xs px-1.5 py-0.5 rounded-md font-medium", st.color)}>{st.label}</span>
                  {item.prazo && <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(item.prazo + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingId(item.id); setEditForm(item); }} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => deleteItem.mutate(item.id)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Checkpoints ──────────────────────────────────────────────────────────

function TabCheckpoints({ projeto, projetoId }: { projeto: Projeto; projetoId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: "", descricao: "", dataAlvo: "", status: "pendente" });

  const addCP = useMutation({
    mutationFn: (body: object) => fetch(apiUrl(`/vida/projetos/${projetoId}/checkpoints`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }); setShowForm(false); setForm({ titulo: "", descricao: "", dataAlvo: "", status: "pendente" }); toast({ title: "Checkpoint adicionado!" }); },
  });

  const updateCP = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => fetch(apiUrl(`/vida/checkpoints/${id}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }),
  });

  const deleteCP = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/vida/checkpoints/${id}`), { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Marcos e datas-alvo do seu projeto</p>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} placeholder="Nome do checkpoint" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" />
          <textarea value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descrição" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" />
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Data alvo</label>
            <input type="date" value={form.dataAlvo} onChange={(e) => setForm((p) => ({ ...p, dataAlvo: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancelar</button>
            <button onClick={() => { if (form.titulo.trim()) addCP.mutate(form); }} className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors">Adicionar</button>
          </div>
        </div>
      )}

      {projeto.checkpoints.length === 0 && !showForm && (
        <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-200" />
          <p className="text-slate-400 text-sm">Nenhum checkpoint definido</p>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {projeto.checkpoints.length > 0 && <div className="absolute left-4 top-4 bottom-4 w-px bg-slate-200" />}
        <div className="space-y-3">
          {projeto.checkpoints.map((cp) => {
            const st = STATUS_LABELS[cp.status] || STATUS_LABELS.pendente;
            const done = cp.status === "concluido";
            return (
              <div key={cp.id} className="relative flex items-start gap-4 group">
                <button
                  onClick={() => updateCP.mutate({ id: cp.id, status: done ? "pendente" : "concluido" })}
                  className={cn("relative z-10 w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center transition-colors border-2", done ? "bg-emerald-400 border-emerald-400" : "bg-white border-slate-300 hover:border-primary")}
                >
                  {done ? <Check className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                </button>
                <div className={cn("flex-1 border rounded-2xl p-3.5 transition-colors", done ? "border-emerald-100 bg-emerald-50/40" : "border-slate-200 bg-white")}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn("text-sm font-semibold", done && "line-through text-slate-400")}>{cp.titulo}</p>
                      {cp.descricao && <p className="text-xs text-slate-400 mt-0.5">{cp.descricao}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => deleteCP.mutate(cp.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-md font-medium", st.color)}>{st.label}</span>
                    {cp.dataAlvo && <span className="text-xs text-slate-400 flex items-center gap-1"><CalendarDays className="w-3 h-3" />{new Date(cp.dataAlvo + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "cidades", label: "Cidades", icon: MapPin },
  { id: "comparacao", label: "Comparação", icon: BarChart3 },
  { id: "simulacao", label: "Simulação", icon: TrendingUp },
  { id: "plano", label: "Plano de Ação", icon: CheckSquare },
  { id: "checkpoints", label: "Checkpoints", icon: CalendarDays },
];

const STATUS_PROJ: Record<string, { label: string; color: string }> = {
  explorando: { label: "Explorando", color: "bg-slate-100 text-slate-600" },
  planejando: { label: "Planejando", color: "bg-amber-100 text-amber-700" },
  executando: { label: "Executando", color: "bg-blue-100 text-blue-700" },
  concluido: { label: "Concluído", color: "bg-emerald-100 text-emerald-700" },
};

export default function ProjetoDetalhePage() {
  const [, params] = useRoute("/vida/:id");
  const projetoId = parseInt(params?.id || "0");
  const [tab, setTab] = useState("cidades");

  const { data: projeto, isLoading, error } = useQuery<Projeto>({
    queryKey: ["vida-projeto", projetoId],
    queryFn: () => fetch(apiUrl(`/vida/projetos/${projetoId}`)).then((r) => r.json()),
    enabled: !!projetoId,
  });

  if (isLoading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>
    </AppLayout>
  );

  if (error || !projeto) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64 text-slate-400">Projeto não encontrado</div>
    </AppLayout>
  );

  const st = STATUS_PROJ[projeto.status] || STATUS_PROJ.explorando;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link href="/vida">
            <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors font-medium">
              <ArrowLeft className="w-4 h-4" /> Projetos
            </button>
          </Link>
          <span className="text-slate-200">/</span>
          <span className="text-sm text-slate-700 font-medium truncate">{projeto.titulo}</span>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{projeto.titulo}</h1>
            <span className={cn("mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold", st.color)}>{st.label}</span>
          </div>
          {projeto.descricao && <p className="text-sm text-slate-400 mt-1">{projeto.descricao}</p>}
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{projeto.cidades.length} {projeto.cidades.length === 1 ? "cidade" : "cidades"}</span>
            <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3" />{projeto.planoAcao.filter((p) => p.status === "concluido").length}/{projeto.planoAcao.length} ações</span>
            <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{projeto.checkpoints.length} checkpoints</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-2xl p-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all",
                tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {tab === "cidades" && <TabCidades projeto={projeto} projetoId={projetoId} />}
          {tab === "comparacao" && <TabComparacao projeto={projeto} />}
          {tab === "simulacao" && <TabSimulacao projeto={projeto} />}
          {tab === "plano" && <TabPlanoAcao projeto={projeto} projetoId={projetoId} />}
          {tab === "checkpoints" && <TabCheckpoints projeto={projeto} projetoId={projetoId} />}
        </div>
      </div>
    </AppLayout>
  );
}
