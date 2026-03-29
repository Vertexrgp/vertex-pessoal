import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  ArrowLeft, Plus, Trash2, Pencil, Check, X, MapPin, Star,
  ThumbsUp, ThumbsDown, DollarSign, TrendingUp, CalendarDays,
  CheckSquare, Clock, ChevronDown, ChevronUp, BarChart3, AlertCircle,
  Loader2, ExternalLink, Trophy, Zap, Shield, Target, Settings2,
  ArrowRight, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getApiBase } from "@/lib/api-base";

const apiUrl = (path: string) => `${getApiBase()}/api${path}`;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CustoVida { aluguel: number; condominio: number; energiaGas: number; internetCelular: number; mercado: number; alimentacaoFora: number; transporte: number; saude: number; academia: number; lazer: number; impostos: number; custosExtras: number; alimentacao: number; outros: number; }
interface Trabalho { rendaRafael: number | null; rendaFernanda: number | null; rendaFamiliar: number | null; faixaProvavel: number | null; faixaConservadora: number | null; faixaOtimista: number | null; facilidadeRecolocacao: number | null; exigenciaIdioma: string | null; }
interface Visto { notaViabilidade: number | null; tipoVisto: string | null; dificuldadeTrabalho: number | null; necessidadeJobOffer: boolean; tempoEstimado: string | null; }
interface Qualidade { seguranca: number | null; saude: number | null; adaptacao: number | null; comunidadeBrasileira: number | null; potencialFinanceiro: number | null; qualidadeCarreira: number | null; qualidadeFamilia: number | null; transportePublico: number | null; clima: number | null; }
interface Cidade { id: number; projetoId: number; nome: string; pais: string; estado: string | null; moeda: string; idiomasPrincipais: string | null; fusoHorario: string | null; clima: string | null; qualidadeVida: number | null; facilidadeAdaptacao: number | null; observacoes: string | null; prioridade: number; custoVida: CustoVida | null; trabalho: Trabalho | null; visto: Visto | null; qualidade: Qualidade | null; prosContras: { id: number; tipo: string; descricao: string }[]; scoreCalculado: number; }
interface ScorePesos { pesoCusto: number; pesoRenda: number; pesoImigracao: number; pesoSeguranca: number; pesoAdaptacao: number; pesoQualidade: number; }
interface PlanoItem { id: number; titulo: string; descricao: string | null; prazo: string | null; status: string; ordem: number; }
interface Checkpoint { id: number; titulo: string; descricao: string | null; dataAlvo: string | null; status: string; }
interface Projeto { id: number; titulo: string; descricao: string | null; tipo: string; status: string; cidades: Cidade[]; planoAcao: PlanoItem[]; checkpoints: Checkpoint[]; scorePesos: ScorePesos | null; }

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-slate-100 text-slate-600" },
  em_andamento: { label: "Em andamento", color: "bg-blue-100 text-blue-700" },
  concluido: { label: "Concluído", color: "bg-emerald-100 text-emerald-700" },
};

const STATUS_PROJ: Record<string, { label: string; color: string }> = {
  explorando: { label: "Explorando", color: "bg-slate-100 text-slate-600" },
  planejando: { label: "Planejando", color: "bg-amber-100 text-amber-700" },
  executando: { label: "Executando", color: "bg-blue-100 text-blue-700" },
  concluido: { label: "Concluído", color: "bg-emerald-100 text-emerald-700" },
};

const fmt = (v: number | null | undefined, moeda = "USD") => {
  if (!v && v !== 0) return "—";
  try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda, maximumFractionDigits: 0 }).format(v); }
  catch { return `${moeda} ${(v || 0).toFixed(0)}`; }
};

const totalCusto = (c: CustoVida | null): number => !c ? 0 :
  (c.aluguel || 0) + (c.condominio || 0) + (c.energiaGas || 0) + (c.internetCelular || 0) +
  (c.mercado || 0) + (c.alimentacaoFora || 0) + (c.transporte || 0) + (c.saude || 0) +
  (c.academia || 0) + (c.lazer || 0) + (c.impostos || 0) + (c.custosExtras || 0) +
  (c.alimentacao || 0) + (c.outros || 0);

function TrafficLight({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (!value) return <span className="text-xs text-slate-300 font-bold">—</span>;
  const good = inverse ? value <= 4 : value >= 7;
  const ok = inverse ? value <= 7 : value >= 5;
  return (
    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", good ? "bg-emerald-100 text-emerald-700" : ok ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700")}>
      {value}/10
    </span>
  );
}

// ─── Cidade Modal ──────────────────────────────────────────────────────────────

function CidadeModal({ projetoId, initial, onClose, onSave }: { projetoId: number; initial?: Cidade | null; onClose: () => void; onSave: (c: object) => void }) {
  const [nome, setNome] = useState(initial?.nome || "");
  const [pais, setPais] = useState(initial?.pais || "");
  const [estado, setEstado] = useState(initial?.estado || "");
  const [moeda, setMoeda] = useState(initial?.moeda || "USD");
  const [idiomasPrincipais, setIdiomas] = useState(initial?.idiomasPrincipais || "");
  const MOEDAS = ["USD","EUR","GBP","BRL","CAD","AUD","CHF","SGD","NZD","MXN","ARS"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-slate-900 mb-4">{initial ? "Editar cidade" : "Adicionar cidade"}</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Cidade *</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Toronto" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">País *</label>
              <input value={pais} onChange={(e) => setPais(e.target.value)} placeholder="Canadá" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Estado / Província</label>
              <input value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="Ontario" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Moeda</label>
              <select value={moeda} onChange={(e) => setMoeda(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                {MOEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Idiomas principais</label>
            <input value={idiomasPrincipais} onChange={(e) => setIdiomas(e.target.value)} placeholder="Inglês, Francês..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3 bg-slate-50 rounded-xl px-3 py-2">
          💡 Após criar, acesse o detalhe da cidade para preencher custo de vida, trabalho, visto e mais.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancelar</button>
          <button onClick={() => { if (nome && pais) onSave({ nome, pais, estado, moeda, idiomasPrincipais }); }} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Cidades ──────────────────────────────────────────────────────────────

function TabCidades({ projeto, projetoId }: { projeto: Projeto; projetoId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editCidade, setEditCidade] = useState<Cidade | null>(null);

  const addCidade = useMutation({
    mutationFn: (body: object) => fetch(apiUrl(`/vida/projetos/${projetoId}/cidades`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }); toast({ title: "Cidade adicionada!" }); setShowAdd(false); },
  });
  const updateCidade = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & object) => fetch(apiUrl(`/vida/cidades/${id}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }); setEditCidade(null); },
  });
  const deleteCidade = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/vida/cidades/${id}`), { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }),
  });

  const sorted = [...projeto.cidades].sort((a, b) => (b.scoreCalculado || 0) - (a.scoreCalculado || 0));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{projeto.cidades.length} cidade{projeto.cidades.length !== 1 ? "s" : ""} · clique em "Editar detalhes" para análise completa</p>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Adicionar cidade
        </button>
      </div>

      {projeto.cidades.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl">
          <MapPin className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-slate-400 text-sm mb-4">Nenhuma cidade adicionada</p>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90">
            <Plus className="w-3.5 h-3.5" /> Adicionar primeira cidade
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map((c, idx) => {
          const custo = totalCusto(c.custoVida);
          const rendaFamiliar = (c.trabalho?.rendaFamiliar) || (c.trabalho?.faixaProvavel) || ((c.trabalho?.rendaRafael || 0) + (c.trabalho?.rendaFernanda || 0));
          const saldo = rendaFamiliar ? rendaFamiliar - custo : null;
          const pros = c.prosContras.filter((p) => p.tipo === "pro").length;
          const contras = c.prosContras.filter((p) => p.tipo === "contra").length;

          return (
            <div key={c.id} className="group bg-white border border-slate-200 rounded-2xl p-4 hover:border-violet-200 hover:shadow-sm transition-all">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2.5">
                  {idx === 0 && projeto.cidades.length > 1 && (
                    <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Trophy className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-slate-900">{c.nome}{c.estado ? `, ${c.estado}` : ""}</p>
                    <p className="text-xs text-slate-400">{c.pais} · {c.moeda}{c.idiomasPrincipais ? ` · ${c.idiomasPrincipais}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditCidade(c)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteCidade.mutate(c.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-slate-50 rounded-xl p-2 text-center">
                  <p className="text-[10px] text-slate-400 mb-0.5">Custo/mês</p>
                  <p className="text-xs font-bold text-slate-800">{custo > 0 ? fmt(custo, c.moeda) : "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2 text-center">
                  <p className="text-[10px] text-slate-400 mb-0.5">Saldo est.</p>
                  <p className={cn("text-xs font-bold", !saldo ? "text-slate-300" : saldo >= 0 ? "text-emerald-600" : "text-rose-600")}>{saldo !== null ? fmt(saldo, c.moeda) : "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2 text-center">
                  <p className="text-[10px] text-slate-400 mb-0.5">Score</p>
                  <p className={cn("text-xs font-bold", !c.scoreCalculado ? "text-slate-300" : c.scoreCalculado >= 7 ? "text-emerald-600" : c.scoreCalculado >= 5 ? "text-amber-600" : "text-rose-600")}>{c.scoreCalculado > 0 ? c.scoreCalculado.toFixed(1) : "—"}</p>
                </div>
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {c.visto?.notaViabilidade && <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", c.visto.notaViabilidade >= 7 ? "bg-emerald-100 text-emerald-700" : c.visto.notaViabilidade >= 5 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700")}>Visto {c.visto.notaViabilidade}/10</span>}
                {c.qualidade?.seguranca && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"><Shield className="w-2.5 h-2.5 inline mr-0.5" />{c.qualidade.seguranca}/10</span>}
                {pros > 0 && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">+{pros} prós</span>}
                {contras > 0 && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">−{contras} contras</span>}
              </div>

              {/* CTA */}
              <Link href={`/vida/${projetoId}/cidades/${c.id}`}>
                <button className="w-full flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-all">
                  <ExternalLink className="w-3.5 h-3.5" /> Editar análise completa
                </button>
              </Link>
            </div>
          );
        })}
      </div>

      {(showAdd || editCidade) && (
        <CidadeModal
          projetoId={projetoId}
          initial={editCidade}
          onClose={() => { setShowAdd(false); setEditCidade(null); }}
          onSave={(data) => { editCidade ? updateCidade.mutate({ id: editCidade.id, ...data }) : addCidade.mutate(data); }}
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

  const rows = [
    { label: "💰 Custo mensal", fn: (c: Cidade) => { const t = totalCusto(c.custoVida); return t > 0 ? fmt(t, c.moeda) : "—"; }, isScore: false, invertColor: true, numFn: (c: Cidade) => totalCusto(c.custoVida) },
    { label: "💵 Renda estimada (provável)", fn: (c: Cidade) => { const r = c.trabalho?.faixaProvavel || (c.trabalho?.rendaRafael || 0) + (c.trabalho?.rendaFernanda || 0); return r > 0 ? fmt(r, c.moeda) : "—"; }, isScore: false, numFn: (c: Cidade) => c.trabalho?.faixaProvavel || (c.trabalho?.rendaRafael || 0) + (c.trabalho?.rendaFernanda || 0) },
    { label: "📊 Saldo mensal estimado", fn: (c: Cidade) => { const r = c.trabalho?.faixaProvavel || (c.trabalho?.rendaRafael || 0) + (c.trabalho?.rendaFernanda || 0); const t = totalCusto(c.custoVida); return r > 0 && t > 0 ? fmt(r - t, c.moeda) : "—"; }, isScore: false, saldo: true, numFn: (c: Cidade) => { const r = c.trabalho?.faixaProvavel || (c.trabalho?.rendaRafael || 0) + (c.trabalho?.rendaFernanda || 0); return r - totalCusto(c.custoVida); } },
    { label: "🛂 Viabilidade de visto", fn: (c: Cidade) => c.visto?.notaViabilidade ? `${c.visto.notaViabilidade}/10` : "—", isScore: true, numFn: (c: Cidade) => c.visto?.notaViabilidade ?? null },
    { label: "👔 Facilidade de recolocação", fn: (c: Cidade) => c.trabalho?.facilidadeRecolocacao ? `${c.trabalho.facilidadeRecolocacao}/10` : "—", isScore: true, numFn: (c: Cidade) => c.trabalho?.facilidadeRecolocacao ?? null },
    { label: "🔒 Segurança", fn: (c: Cidade) => c.qualidade?.seguranca ? `${c.qualidade.seguranca}/10` : "—", isScore: true, numFn: (c: Cidade) => c.qualidade?.seguranca ?? null },
    { label: "🌟 Qualidade de vida", fn: (c: Cidade) => c.qualidadeVida ? `${c.qualidadeVida}/10` : "—", isScore: true, numFn: (c: Cidade) => c.qualidadeVida ?? null },
    { label: "🤝 Adaptação", fn: (c: Cidade) => c.qualidade?.adaptacao ? `${c.qualidade.adaptacao}/10` : "—", isScore: true, numFn: (c: Cidade) => c.qualidade?.adaptacao ?? null },
    { label: "🏆 Score final", fn: (c: Cidade) => c.scoreCalculado > 0 ? c.scoreCalculado.toFixed(1) : "—", isScore: true, highlight: true, numFn: (c: Cidade) => c.scoreCalculado },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide min-w-[180px]">Critério</th>
            {cidades.map((c) => (
              <th key={c.id} className="text-center px-4 py-3 text-xs font-bold text-slate-700 min-w-[120px]">
                <div>{c.nome}</div>
                <div className="text-slate-400 font-normal">{c.pais}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const nums = cidades.map((c) => row.numFn(c)).filter((v) => v !== null && v !== 0) as number[];
            const maxNum = nums.length > 0 ? Math.max(...nums) : null;
            const minNum = nums.length > 0 ? Math.min(...nums) : null;

            return (
              <tr key={i} className={cn("border-t", row.highlight ? "border-slate-200 bg-slate-900 text-white" : i % 2 === 0 ? "border-slate-50 bg-white" : "border-slate-50 bg-slate-50/30")}>
                <td className={cn("px-4 py-2.5 text-xs font-medium", row.highlight ? "text-slate-300" : "text-slate-600")}>{row.label}</td>
                {cidades.map((c) => {
                  const val = row.fn(c);
                  const num = row.numFn(c);
                  const isBest = num !== null && num === (row.invertColor ? minNum : maxNum) && nums.length > 1;
                  const isWorst = num !== null && num === (row.invertColor ? maxNum : minNum) && nums.length > 1;
                  const isSaldo = (row as { saldo?: boolean }).saldo;
                  const saldoNum = typeof num === "number" ? num : 0;

                  return (
                    <td key={c.id} className={cn("px-4 py-2.5 text-center font-semibold text-sm", row.highlight ? "text-white" : "")}>
                      <span className={cn("px-2 py-0.5 rounded-lg text-xs font-bold",
                        row.highlight ? "text-white" :
                        isBest ? "bg-emerald-100 text-emerald-700" :
                        isWorst && val !== "—" ? "bg-rose-100 text-rose-700" :
                        isSaldo && val !== "—" ? (saldoNum >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700") :
                        "text-slate-700"
                      )}>
                        {val}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
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
  const renda = parseFloat(rendaMensal) || (cidade?.trabalho?.faixaProvavel || 0);
  const poupanca = parseFloat(economias) || 0;
  const saldoMensal = renda - custo;
  const mesesReserva = custo > 0 ? Math.floor(poupanca / custo) : 0;
  const mesesParaJuntar = custo > 0 && saldoMensal > 0 ? Math.ceil(custo * 6 / saldoMensal) : null;

  return (
    <div className="space-y-5">
      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-sm text-violet-700">
        <AlertCircle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
        Simulação orientativa. Valores de renda estimada são pré-carregados do cadastro de trabalho da cidade, mas podem ser editados.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Cidade para simular</label>
          <select value={cidadeSelecionada ?? ""} onChange={(e) => { setCidadeSelecionada(parseInt(e.target.value)); setRendaMensal(""); }} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
            {projeto.cidades.map((c) => <option key={c.id} value={c.id}>{c.nome}, {c.pais}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Renda mensal</label>
          <input type="number" value={rendaMensal} onChange={(e) => setRendaMensal(e.target.value)} placeholder={cidade?.trabalho?.faixaProvavel ? String(cidade.trabalho.faixaProvavel) : "Ex: 5000"} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          {cidade?.trabalho?.faixaProvavel && !rendaMensal && <p className="text-xs text-slate-400 mt-1">Pré-carregado: faixa provável</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Economias atuais</label>
          <input type="number" value={economias} onChange={(e) => setEconomias(e.target.value)} placeholder="Ex: 50000" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      {cidade && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Custo mensal</p>
            <p className="text-lg font-bold text-slate-900">{fmt(custo, cidade.moeda)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{fmt(custo * 12, cidade.moeda)}/ano</p>
          </div>
          <div className={cn("border rounded-2xl p-4 text-center", saldoMensal >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100")}>
            <p className="text-xs text-slate-400 mb-1">Saldo mensal</p>
            <p className={cn("text-lg font-bold", saldoMensal >= 0 ? "text-emerald-700" : "text-rose-700")}>{renda > 0 ? fmt(Math.abs(saldoMensal), cidade.moeda) : "—"}</p>
            <p className={cn("text-xs mt-0.5", saldoMensal >= 0 ? "text-emerald-500" : "text-rose-500")}>{renda > 0 ? (saldoMensal >= 0 ? "sobra" : "déficit") : "informe a renda"}</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Reserva atual cobre</p>
            <p className="text-lg font-bold text-amber-700">{poupanca > 0 && custo > 0 ? `${mesesReserva} meses` : "—"}</p>
            <p className="text-xs text-amber-500 mt-0.5">{mesesReserva > 0 ? `${(mesesReserva / 12).toFixed(1)} anos` : ""}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Meses p/ juntar 6x</p>
            <p className="text-lg font-bold text-blue-700">{mesesParaJuntar !== null ? `${mesesParaJuntar} meses` : "—"}</p>
            <p className="text-xs text-blue-500 mt-0.5">{mesesParaJuntar !== null ? "reserva emergência" : saldoMensal < 0 && renda > 0 ? "renda insuficiente" : ""}</p>
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
        <p className="text-sm text-slate-500">{projeto.planoAcao.length} item{projeto.planoAcao.length !== 1 ? "s" : ""} no plano</p>
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
              <button onClick={() => toggleStatus(item)} className={cn("w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors", item.status === "concluido" ? "border-emerald-400 bg-emerald-400" : item.status === "em_andamento" ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-primary")}>
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

      <div className="relative">
        {projeto.checkpoints.length > 0 && <div className="absolute left-4 top-4 bottom-4 w-px bg-slate-200" />}
        <div className="space-y-3">
          {projeto.checkpoints.map((cp) => {
            const st = STATUS_LABELS[cp.status] || STATUS_LABELS.pendente;
            const done = cp.status === "concluido";
            return (
              <div key={cp.id} className="relative flex items-start gap-4 group">
                <button onClick={() => updateCP.mutate({ id: cp.id, status: done ? "pendente" : "concluido" })}
                  className={cn("relative z-10 w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center transition-colors border-2", done ? "bg-emerald-400 border-emerald-400" : "bg-white border-slate-300 hover:border-primary")}>
                  {done ? <Check className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                </button>
                <div className={cn("flex-1 border rounded-2xl p-3.5 transition-colors", done ? "border-emerald-100 bg-emerald-50/40" : "border-slate-200 bg-white")}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn("text-sm font-semibold", done && "line-through text-slate-400")}>{cp.titulo}</p>
                      {cp.descricao && <p className="text-xs text-slate-400 mt-0.5">{cp.descricao}</p>}
                    </div>
                    <button onClick={() => deleteCP.mutate(cp.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-3 h-3" /></button>
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

// ─── Tab: Resumo de Decisão ────────────────────────────────────────────────────

function TabResumo({ projeto, projetoId }: { projeto: Projeto; projetoId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editPesos, setEditPesos] = useState(false);
  const pesos = projeto.scorePesos || { pesoCusto: 20, pesoRenda: 25, pesoImigracao: 20, pesoSeguranca: 15, pesoAdaptacao: 10, pesoQualidade: 10 };
  const [pesosForm, setPesosForm] = useState(pesos);

  const savePesos = useMutation({
    mutationFn: (body: object) => fetch(apiUrl(`/vida/projetos/${projetoId}/score-pesos`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vida-projeto", projetoId] }); setEditPesos(false); toast({ title: "Pesos atualizados!" }); },
  });

  const cidades = [...projeto.cidades].sort((a, b) => (b.scoreCalculado || 0) - (a.scoreCalculado || 0));
  const hasCidades = cidades.length > 0;
  const hasData = cidades.some((c) => c.scoreCalculado > 0);

  if (!hasCidades) return (
    <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl">
      <Target className="w-10 h-10 mx-auto mb-3 text-slate-200" />
      <p className="text-slate-500 font-medium">Adicione cidades e preencha os dados para ver o resumo</p>
    </div>
  );

  // Diagnostics
  const cidadesComCusto = cidades.filter((c) => totalCusto(c.custoVida) > 0);
  const maisBarata = cidadesComCusto.length > 0 ? cidadesComCusto.reduce((a, b) => totalCusto(a.custoVida) < totalCusto(b.custoVida) ? a : b) : null;
  const maiorRenda = [...cidades].filter((c) => (c.trabalho?.faixaProvavel || 0) > 0).sort((a, b) => (b.trabalho?.faixaProvavel || 0) - (a.trabalho?.faixaProvavel || 0))[0] || null;
  const melhorVisto = [...cidades].filter((c) => c.visto?.notaViabilidade).sort((a, b) => (b.visto?.notaViabilidade || 0) - (a.visto?.notaViabilidade || 0))[0] || null;
  const melhorSaldo = [...cidades].filter((c) => {
    const r = c.trabalho?.faixaProvavel || (c.trabalho?.rendaRafael || 0) + (c.trabalho?.rendaFernanda || 0);
    return r > 0 && totalCusto(c.custoVida) > 0;
  }).sort((a, b) => {
    const saldoA = (a.trabalho?.faixaProvavel || (a.trabalho?.rendaRafael || 0) + (a.trabalho?.rendaFernanda || 0)) - totalCusto(a.custoVida);
    const saldoB = (b.trabalho?.faixaProvavel || (b.trabalho?.rendaRafael || 0) + (b.trabalho?.rendaFernanda || 0)) - totalCusto(b.custoVida);
    return saldoB - saldoA;
  })[0] || null;

  const PESO_LABELS = [
    { key: "pesoCusto", label: "Custo de vida", icon: DollarSign },
    { key: "pesoRenda", label: "Renda / Trabalho", icon: TrendingUp },
    { key: "pesoImigracao", label: "Imigração", icon: Target },
    { key: "pesoSeguranca", label: "Segurança", icon: Shield },
    { key: "pesoAdaptacao", label: "Adaptação", icon: ThumbsUp },
    { key: "pesoQualidade", label: "Qualidade de vida", icon: Star },
  ] as const;

  return (
    <div className="space-y-6">

      {/* Score Ranking */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700">🏆 Ranking por Score</h3>
          <button onClick={() => setEditPesos(!editPesos)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary transition-colors font-medium">
            <Settings2 className="w-3.5 h-3.5" /> Configurar pesos
          </button>
        </div>

        {/* Pesos editor */}
        {editPesos && (
          <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <p className="text-xs text-slate-500 mb-3">Ajuste os pesos de cada critério (quanto maior, mais influência no score final). Total atual: {Object.values(pesosForm).reduce((a, b) => a + b, 0)}</p>
            <div className="grid grid-cols-2 gap-3">
              {PESO_LABELS.map((p) => (
                <div key={p.key} className="flex items-center gap-2">
                  <label className="text-xs text-slate-600 flex-1">{p.label}</label>
                  <input type="number" min="0" max="100" value={pesosForm[p.key]} onChange={(e) => setPesosForm((prev) => ({ ...prev, [p.key]: parseFloat(e.target.value) || 0 }))}
                    className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setEditPesos(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancelar</button>
              <button onClick={() => savePesos.mutate(pesosForm)} className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors">Aplicar</button>
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {cidades.map((c, idx) => {
            const score = c.scoreCalculado;
            const maxScore = cidades[0]?.scoreCalculado || 10;
            const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
            const scoreColor = score >= 7 ? "bg-emerald-400" : score >= 5 ? "bg-amber-400" : score > 0 ? "bg-rose-400" : "bg-slate-200";

            return (
              <div key={c.id} className="flex items-center gap-3">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold", idx === 0 && hasData ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-500")}>{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-800 truncate">{c.nome}, {c.pais}</span>
                    <span className={cn("text-sm font-bold ml-2 flex-shrink-0", score >= 7 ? "text-emerald-600" : score >= 5 ? "text-amber-600" : score > 0 ? "text-rose-600" : "text-slate-300")}>{score > 0 ? score.toFixed(1) : "—"}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", scoreColor)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <Link href={`/vida/${projetoId}/cidades/${c.id}`}>
                  <button className="p-1.5 text-slate-300 hover:text-primary hover:bg-violet-50 rounded-lg transition-colors flex-shrink-0"><ArrowRight className="w-3.5 h-3.5" /></button>
                </Link>
              </div>
            );
          })}
        </div>
        {!hasData && (
          <p className="text-xs text-slate-400 mt-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            ⚠️ Scores zerados — preencha custo de vida, trabalho, visto e qualidade de vida nas cidades para calcular automaticamente.
          </p>
        )}
      </div>

      {/* Diagnóstico */}
      {(maisBarata || maiorRenda || melhorVisto || melhorSaldo) && (
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3">🔍 Diagnóstico Automático</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {maisBarata && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center"><DollarSign className="w-3.5 h-3.5 text-emerald-600" /></div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Mais barata</p>
                </div>
                <p className="text-base font-bold text-slate-900">{maisBarata.nome}, {maisBarata.pais}</p>
                <p className="text-xs text-emerald-600 font-medium">{fmt(totalCusto(maisBarata.custoVida), maisBarata.moeda)}/mês</p>
              </div>
            )}
            {maiorRenda && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center"><TrendingUp className="w-3.5 h-3.5 text-blue-600" /></div>
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Maior potencial de renda</p>
                </div>
                <p className="text-base font-bold text-slate-900">{maiorRenda.nome}, {maiorRenda.pais}</p>
                <p className="text-xs text-blue-600 font-medium">{fmt(maiorRenda.trabalho?.faixaProvavel, maiorRenda.moeda)}/mês (faixa provável)</p>
              </div>
            )}
            {melhorSaldo && (
              <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-violet-600" /></div>
                  <p className="text-xs font-bold text-violet-700 uppercase tracking-wide">Melhor equilíbrio renda/custo</p>
                </div>
                <p className="text-base font-bold text-slate-900">{melhorSaldo.nome}, {melhorSaldo.pais}</p>
                <p className="text-xs text-violet-600 font-medium">
                  {fmt(((melhorSaldo.trabalho?.faixaProvavel || 0) || (melhorSaldo.trabalho?.rendaRafael || 0) + (melhorSaldo.trabalho?.rendaFernanda || 0)) - totalCusto(melhorSaldo.custoVida), melhorSaldo.moeda)}/mês de saldo
                </p>
              </div>
            )}
            {melhorVisto && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center"><Target className="w-3.5 h-3.5 text-amber-600" /></div>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Mais fácil de entrar</p>
                </div>
                <p className="text-base font-bold text-slate-900">{melhorVisto.nome}, {melhorVisto.pais}</p>
                <p className="text-xs text-amber-600 font-medium">Viabilidade de visto: {melhorVisto.visto?.notaViabilidade}/10</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comparison Table A vs B */}
      {cidades.length >= 2 && (
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3">📊 Painel de Decisão</h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Critério</th>
                  {cidades.map((c, i) => (
                    <th key={c.id} className="text-center px-3 py-3 text-xs font-bold">
                      <span className={cn("px-2 py-1 rounded-lg", i === 0 && hasData ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700")}>{c.nome}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Custo mensal", fn: (c: Cidade) => { const t = totalCusto(c.custoVida); return t > 0 ? <span className="text-xs font-bold text-slate-700">{fmt(t, c.moeda)}</span> : <span className="text-xs text-slate-300">—</span>; } },
                  { label: "Renda familiar (provável)", fn: (c: Cidade) => { const r = c.trabalho?.faixaProvavel || (c.trabalho?.rendaRafael || 0) + (c.trabalho?.rendaFernanda || 0); return r > 0 ? <span className="text-xs font-bold text-slate-700">{fmt(r, c.moeda)}</span> : <span className="text-xs text-slate-300">—</span>; } },
                  { label: "Saldo mensal", fn: (c: Cidade) => { const r = c.trabalho?.faixaProvavel || (c.trabalho?.rendaRafael || 0) + (c.trabalho?.rendaFernanda || 0); const t = totalCusto(c.custoVida); if (!r || !t) return <span className="text-xs text-slate-300">—</span>; const s = r - t; return <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", s >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>{fmt(s, c.moeda)}</span>; } },
                  { label: "Visto / Imigração", fn: (c: Cidade) => <TrafficLight value={c.visto?.notaViabilidade ?? null} /> },
                  { label: "Facilidade recolocação", fn: (c: Cidade) => <TrafficLight value={c.trabalho?.facilidadeRecolocacao ?? null} /> },
                  { label: "Segurança", fn: (c: Cidade) => <TrafficLight value={c.qualidade?.seguranca ?? null} /> },
                  { label: "Qualidade de vida", fn: (c: Cidade) => <TrafficLight value={c.qualidadeVida ?? null} /> },
                  { label: "Adaptação", fn: (c: Cidade) => <TrafficLight value={c.qualidade?.adaptacao ?? null} /> },
                  { label: "🏆 Score Final", fn: (c: Cidade) => c.scoreCalculado > 0 ? <span className={cn("text-sm font-bold px-2 py-0.5 rounded-full", c.scoreCalculado >= 7 ? "bg-emerald-100 text-emerald-700" : c.scoreCalculado >= 5 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700")}>{c.scoreCalculado.toFixed(1)}</span> : <span className="text-xs text-slate-300">—</span>, highlight: true },
                ].map((row, i) => (
                  <tr key={i} className={cn("border-t border-slate-50", (row as { highlight?: boolean }).highlight ? "bg-slate-900" : i % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                    <td className={cn("px-4 py-2.5 text-xs font-medium", (row as { highlight?: boolean }).highlight ? "text-slate-300" : "text-slate-600")}>{row.label}</td>
                    {cidades.map((c) => <td key={c.id} className="px-4 py-2.5 text-center">{row.fn(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">O sistema organiza as informações, mas a decisão é sua. Verde = bom, Amarelo = médio, Vermelho = atenção. Preencha mais dados para scores mais precisos.</p>
          </div>
        </div>
      )}
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
  { id: "resumo", label: "Resumo de Decisão", icon: Trophy },
];

export default function ProjetoDetalhePage() {
  const [, params] = useRoute("/vida/:id");
  const projetoId = parseInt(params?.id || "0");
  const [tab, setTab] = useState("cidades");

  const { data: projeto, isLoading } = useQuery<Projeto>({
    queryKey: ["vida-projeto", projetoId],
    queryFn: () => fetch(apiUrl(`/vida/projetos/${projetoId}`)).then((r) => r.json()),
    enabled: !!projetoId,
  });

  if (isLoading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
      </div>
    </AppLayout>
  );

  if (!projeto || (projeto as { error?: string }).error) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64 text-slate-400">Projeto não encontrado</div>
    </AppLayout>
  );

  const st = STATUS_PROJ[projeto.status] || STATUS_PROJ.explorando;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
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
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all", tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                t.id === "resumo" && tab !== "resumo" && "text-violet-500 hover:text-violet-700"
              )}>
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
          {tab === "resumo" && <TabResumo projeto={projeto} projetoId={projetoId} />}
        </div>
      </div>
    </AppLayout>
  );
}
