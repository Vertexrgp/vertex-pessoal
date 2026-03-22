import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatCurrency } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  FlaskConical, TrendingDown, TrendingUp, Plus, Minus,
  CreditCard, Wallet, Shield, RotateCcw, Zap, AlertTriangle,
  CheckCircle, ArrowUp, ArrowDown, ChevronRight, Lightbulb,
  DollarSign, Scissors, Target, BarChart2, Star,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL ?? "/";

/* ─── Types ─────────────────────────────────────────────────────────────── */

type SimType =
  | "reducao-gastos"
  | "aumento-investimento"
  | "nova-despesa"
  | "quitar-divida"
  | "alteracao-renda"
  | "compra-parcelada"
  | "corte-recorrentes"
  | "meta-economia";

interface SimForm {
  tipo: SimType;
  valor: number;
  categoria: string;
  reducaoPct: number;
  duracaoMeses: number;
  descricao: string;
  numParcelas: number;
  isAumento: boolean; // for alteracao-renda: true = increase, false = decrease
}

interface CustoData {
  custoEssencial: number;
  custoFixo: number;
  custoRecorrente: number;
  custoReal: number;
  totalReceitas: number;
  totalInvestimentos: number;
  patrimonio: number;
  mesesAutonomiaEssencial: number | null;
  byType: Record<string, { total: number; items: any[] }>;
}

/* ─── Simulation config ─────────────────────────────────────────────────── */

interface SimConfig {
  key: SimType;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}

const SIM_TYPES: SimConfig[] = [
  { key: "reducao-gastos", label: "Reduzir Gastos", sublabel: "Cortar uma categoria de despesa", icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
  { key: "aumento-investimento", label: "Aumentar Investimento", sublabel: "Aportar mais todo mês", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { key: "nova-despesa", label: "Nova Despesa Fixa", sublabel: "Simular nova obrigação mensal", icon: Plus, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { key: "quitar-divida", label: "Quitar Dívida", sublabel: "Liberar parcela mensal", icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { key: "alteracao-renda", label: "Alterar Renda", sublabel: "Simular queda ou aumento salarial", icon: DollarSign, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  { key: "compra-parcelada", label: "Compra Parcelada", sublabel: "Novo parcelamento no cartão", icon: CreditCard, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  { key: "corte-recorrentes", label: "Corte de Recorrentes", sublabel: "Eliminar % dos custos não essenciais", icon: Scissors, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  { key: "meta-economia", label: "Meta de Economia", sublabel: "Reservar valor fixo todo mês", icon: Target, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-200" },
];

const QUICK_SIMS: { label: string; icon: React.ElementType; apply: (base: CustoData) => Partial<SimForm> }[] = [
  {
    label: "Cortar lazer em 10%",
    icon: Scissors,
    apply: (b) => ({ tipo: "reducao-gastos", valor: Math.round((b.byType["luxo"]?.total ?? 0) * 0.1), categoria: "lazer" }),
  },
  {
    label: "Cortar não-essenciais",
    icon: TrendingDown,
    apply: (b) => ({ tipo: "corte-recorrentes", reducaoPct: 100, valor: (b.byType["fixo"]?.total ?? 0) + (b.byType["variavel"]?.total ?? 0) + (b.byType["luxo"]?.total ?? 0) }),
  },
  {
    label: "Investir +R$ 500",
    icon: TrendingUp,
    apply: () => ({ tipo: "aumento-investimento", valor: 500 }),
  },
  {
    label: "Queda de renda 20%",
    icon: ArrowDown,
    apply: (b) => ({ tipo: "alteracao-renda", valor: Math.round(b.totalReceitas * 0.2), isAumento: false }),
  },
  {
    label: "Compra R$ 3.600 / 12x",
    icon: CreditCard,
    apply: () => ({ tipo: "compra-parcelada", valor: 3600, numParcelas: 12 }),
  },
];

const emptyForm: SimForm = {
  tipo: "reducao-gastos",
  valor: 500,
  categoria: "lazer",
  reducaoPct: 50,
  duracaoMeses: 12,
  descricao: "",
  numParcelas: 12,
  isAumento: false,
};

/* ─── Calculation engine ─────────────────────────────────────────────────── */

interface Scenario {
  rendaMensal: number;
  despesasMensais: number;    // all non-investment expenses
  investimentoMensal: number;
  saldoMensal: number;        // renda - totalSaidas (inclui investimentos)
  patrimonio: number;
  autonomiaMeses: number | null;
  totalSaidas: number;        // despesas + investimentos
}

function calcBase(data: CustoData): Scenario {
  const rendaMensal = data.totalReceitas;
  const investimentoMensal = data.totalInvestimentos;
  const despesasMensais = data.custoRecorrente - investimentoMensal;
  const totalSaidas = data.custoRecorrente;
  const saldoMensal = rendaMensal - totalSaidas;
  const patrimonio = data.patrimonio;
  const autonomiaMeses = data.custoEssencial > 0 ? Math.floor(patrimonio / data.custoEssencial) : null;
  return { rendaMensal, despesasMensais, investimentoMensal, saldoMensal, patrimonio, autonomiaMeses, totalSaidas };
}

function applySimulation(base: Scenario, form: SimForm, data: CustoData): Scenario {
  let delta = {
    renda: 0,
    despesas: 0,
    investimento: 0,
    patrimonioOneTime: 0,
  };

  switch (form.tipo) {
    case "reducao-gastos":
      delta.despesas = -Math.abs(form.valor);
      break;
    case "aumento-investimento":
      delta.investimento = Math.abs(form.valor);
      break;
    case "nova-despesa":
      delta.despesas = Math.abs(form.valor);
      break;
    case "quitar-divida":
      // Frees monthly installment (valor = monthly saving), one-time cost = form.valor (total to pay)
      delta.despesas = -Math.abs(form.valor); // parcela freed
      delta.patrimonioOneTime = 0; // simplified: no upfront cost shown
      break;
    case "alteracao-renda":
      delta.renda = form.isAumento ? Math.abs(form.valor) : -Math.abs(form.valor);
      break;
    case "compra-parcelada":
      // parcela = valor / numParcelas (affects despesas for numParcelas months, simplified to show monthly)
      delta.despesas = form.numParcelas > 0 ? Math.abs(form.valor) / form.numParcelas : 0;
      break;
    case "corte-recorrentes": {
      const naoEssenciais = (data.byType["fixo"]?.total ?? 0) + (data.byType["variavel"]?.total ?? 0) + (data.byType["luxo"]?.total ?? 0);
      delta.despesas = -(naoEssenciais * Math.min(form.reducaoPct, 100) / 100);
      break;
    }
    case "meta-economia":
      delta.investimento = Math.abs(form.valor);
      break;
  }

  const rendaMensal = base.rendaMensal + delta.renda;
  const despesasMensais = base.despesasMensais + delta.despesas;
  const investimentoMensal = base.investimentoMensal + delta.investimento;
  const totalSaidas = despesasMensais + investimentoMensal;
  const saldoMensal = rendaMensal - totalSaidas;
  const patrimonio = base.patrimonio + delta.patrimonioOneTime;
  const autonomiaMeses = data.custoEssencial > 0 ? Math.floor(patrimonio / data.custoEssencial) : null;

  return { rendaMensal, despesasMensais, investimentoMensal, saldoMensal, patrimonio, autonomiaMeses, totalSaidas };
}

function projectionMonths(scenario: Scenario, months = 12): number[] {
  const results: number[] = [];
  let acc = scenario.patrimonio;
  for (let m = 1; m <= months; m++) {
    acc += scenario.saldoMensal + scenario.investimentoMensal * 0.005; // 0.5% monthly return on investments
    results.push(acc);
  }
  return results;
}

/* ─── Helper components ─────────────────────────────────────────────────── */

function DeltaBadge({ delta, prefix = "" }: { delta: number; prefix?: string }) {
  if (Math.abs(delta) < 0.01) return <span className="text-xs text-slate-400">Sem alteração</span>;
  const pos = delta > 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full",
      pos ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
    )}>
      {pos ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {pos ? "+" : ""}{prefix}{formatCurrency(Math.abs(delta))}
    </span>
  );
}

function CompareCard({
  label, icon: Icon, iconBg, iconColor,
  baseVal, simVal, formatFn = formatCurrency, suffix = "",
}: {
  label: string; icon: React.ElementType; iconBg: string; iconColor: string;
  baseVal: number; simVal: number; formatFn?: (v: number) => string; suffix?: string;
}) {
  const delta = simVal - baseVal;
  const improved = delta > 0;
  return (
    <div className={cn(
      "bg-white border-2 rounded-2xl p-5 shadow-sm transition-all",
      Math.abs(delta) < 0.01 ? "border-slate-200" : improved ? "border-emerald-200" : "border-rose-200"
    )}>
      <div className="flex items-center gap-2 mb-4">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      </div>

      <div className="flex items-end gap-4">
        {/* Base */}
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 mb-0.5">Atual</p>
          <p className="text-lg font-bold font-mono text-slate-600">{formatFn(baseVal)}{suffix}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 mb-1 flex-shrink-0" />
        {/* Sim */}
        <div className="flex-1 text-right">
          <p className="text-[10px] text-slate-400 mb-0.5">Simulado</p>
          <p className={cn(
            "text-xl font-bold font-mono",
            Math.abs(delta) < 0.01 ? "text-slate-800" : improved ? "text-emerald-700" : "text-rose-700"
          )}>
            {formatFn(simVal)}{suffix}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <DeltaBadge delta={delta} />
      </div>
    </div>
  );
}

/* ─── 12-month chart ─────────────────────────────────────────────────────── */
const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function ProjectionChart({ base, sim }: { base: number[]; sim: number[] }) {
  const allVals = [...base, ...sim].filter(v => isFinite(v));
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const range = maxVal - minVal || 1;

  function barH(val: number) {
    return Math.max(4, ((val - minVal) / range) * 100);
  }

  const now = new Date();
  const monthLabels = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return MONTHS_PT[d.getMonth()];
  });

  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5 h-40">
        {base.map((bv, i) => {
          const sv = sim[i];
          const simImproved = sv >= bv;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
              <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: "100%" }}>
                {/* Base bar */}
                <div
                  className="flex-1 bg-slate-300 rounded-t-md transition-all duration-500 min-h-[4px]"
                  style={{ height: `${barH(bv)}%` }}
                  title={`Atual: ${formatCurrency(bv)}`}
                />
                {/* Sim bar */}
                <div
                  className={cn(
                    "flex-1 rounded-t-md transition-all duration-500 min-h-[4px]",
                    simImproved ? "bg-emerald-400" : "bg-rose-400"
                  )}
                  style={{ height: `${barH(sv)}%` }}
                  title={`Simulado: ${formatCurrency(sv)}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-1.5 mt-2">
        {monthLabels.map((m, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-slate-400 font-medium">{m}</div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-6 mt-3 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-slate-300" />
          <span className="text-xs text-slate-500">Cenário atual</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-400" />
          <span className="text-xs text-slate-500">Cenário simulado (melhora)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-rose-400" />
          <span className="text-xs text-slate-500">Cenário simulado (piora)</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Simulation form ────────────────────────────────────────────────────── */

function SimForm({ form, onChange, data }: {
  form: SimForm;
  onChange: (f: Partial<SimForm>) => void;
  data: CustoData;
}) {
  const naoEssenciais = (data.byType["fixo"]?.total ?? 0) + (data.byType["variavel"]?.total ?? 0) + (data.byType["luxo"]?.total ?? 0);

  const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white font-mono";
  const labelCls = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="space-y-4">
      {/* Tipo selector */}
      <div>
        <p className={labelCls}>Tipo de Simulação</p>
        <div className="grid grid-cols-1 gap-1.5">
          {SIM_TYPES.map(cfg => {
            const Icon = cfg.icon;
            const active = form.tipo === cfg.key;
            return (
              <button
                key={cfg.key}
                onClick={() => onChange({ tipo: cfg.key })}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border",
                  active ? `${cfg.bg} ${cfg.border} border` : "border-slate-100 hover:bg-slate-50 bg-white"
                )}
              >
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", active ? cfg.bg : "bg-slate-100")}>
                  <Icon className={cn("w-3.5 h-3.5", active ? cfg.color : "text-slate-400")} />
                </div>
                <div className="min-w-0">
                  <p className={cn("text-xs font-bold", active ? cfg.color : "text-slate-700")}>{cfg.label}</p>
                  <p className="text-[10px] text-slate-400 truncate">{cfg.sublabel}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic fields */}
      <div className="space-y-3 pt-1">
        {form.tipo === "reducao-gastos" && (
          <>
            <div>
              <label className={labelCls}>Categoria</label>
              <select value={form.categoria} onChange={e => onChange({ categoria: e.target.value })} className={inputCls.replace("font-mono", "")}>
                <option value="lazer">Conforto & Lazer</option>
                <option value="variavel">Variáveis Recorrentes</option>
                <option value="fixo">Fixos não Essenciais</option>
                <option value="investimento">Investimentos</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Valor da Redução (R$/mês)</label>
              <input type="number" min={0} value={form.valor || ""} onChange={e => onChange({ valor: Number(e.target.value) })} className={inputCls} placeholder="Ex: 500" />
            </div>
          </>
        )}

        {form.tipo === "aumento-investimento" && (
          <div>
            <label className={labelCls}>Valor Adicional de Investimento (R$/mês)</label>
            <input type="number" min={0} value={form.valor || ""} onChange={e => onChange({ valor: Number(e.target.value) })} className={inputCls} placeholder="Ex: 1.000" />
            <p className="text-[10px] text-slate-400 mt-1">Esse valor sai do seu saldo livre e vai para investimentos.</p>
          </div>
        )}

        {form.tipo === "nova-despesa" && (
          <>
            <div>
              <label className={labelCls}>Descrição</label>
              <input type="text" value={form.descricao} onChange={e => onChange({ descricao: e.target.value })} className={inputCls.replace("font-mono", "")} placeholder="Ex: Novo aluguel" />
            </div>
            <div>
              <label className={labelCls}>Valor Mensal (R$)</label>
              <input type="number" min={0} value={form.valor || ""} onChange={e => onChange({ valor: Number(e.target.value) })} className={inputCls} placeholder="Ex: 2.500" />
            </div>
          </>
        )}

        {form.tipo === "quitar-divida" && (
          <>
            <div>
              <label className={labelCls}>Parcela Mensal Liberada (R$/mês)</label>
              <input type="number" min={0} value={form.valor || ""} onChange={e => onChange({ valor: Number(e.target.value) })} className={inputCls} placeholder="Ex: 800" />
              <p className="text-[10px] text-slate-400 mt-1">Quanto você deixará de pagar por mês após quitar.</p>
            </div>
          </>
        )}

        {form.tipo === "alteracao-renda" && (
          <>
            <div>
              <label className={labelCls}>Direção</label>
              <div className="flex gap-2">
                {([false, true] as const).map(up => (
                  <button
                    key={String(up)}
                    onClick={() => onChange({ isAumento: up })}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 flex items-center justify-center gap-2",
                      form.isAumento === up
                        ? up ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "bg-rose-50 border-rose-400 text-rose-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    {up ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                    {up ? "Aumento" : "Queda"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Valor da Alteração (R$/mês)</label>
              <input type="number" min={0} value={form.valor || ""} onChange={e => onChange({ valor: Number(e.target.value) })} className={inputCls} placeholder="Ex: 1.500" />
              {data.totalReceitas > 0 && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Renda atual: {formatCurrency(data.totalReceitas)} · Simulada: {formatCurrency(data.totalReceitas + (form.isAumento ? form.valor : -form.valor))}
                </p>
              )}
            </div>
          </>
        )}

        {form.tipo === "compra-parcelada" && (
          <>
            <div>
              <label className={labelCls}>Valor Total da Compra (R$)</label>
              <input type="number" min={0} value={form.valor || ""} onChange={e => onChange({ valor: Number(e.target.value) })} className={inputCls} placeholder="Ex: 3.600" />
            </div>
            <div>
              <label className={labelCls}>Número de Parcelas</label>
              <input type="number" min={1} max={48} value={form.numParcelas || ""} onChange={e => onChange({ numParcelas: Number(e.target.value) })} className={inputCls} placeholder="Ex: 12" />
            </div>
            {form.valor > 0 && form.numParcelas > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                <p className="text-xs text-indigo-700">
                  <span className="font-bold">{formatCurrency(form.valor / form.numParcelas)}/mês</span>
                  {" "}por {form.numParcelas} meses
                </p>
              </div>
            )}
          </>
        )}

        {form.tipo === "corte-recorrentes" && (
          <>
            <div>
              <label className={labelCls}>% de Corte nos Não-Essenciais</label>
              <input type="range" min={0} max={100} value={form.reducaoPct} onChange={e => onChange({ reducaoPct: Number(e.target.value) })} className="w-full accent-orange-500" />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0%</span>
                <span className="font-bold text-orange-600">{form.reducaoPct}% de corte</span>
                <span>100%</span>
              </div>
            </div>
            {naoEssenciais > 0 && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                <p className="text-xs text-orange-700">
                  Corte de <span className="font-bold">{formatCurrency(naoEssenciais * form.reducaoPct / 100)}/mês</span> sobre{" "}
                  <span className="font-bold">{formatCurrency(naoEssenciais)}</span> de gastos não-essenciais.
                </p>
              </div>
            )}
          </>
        )}

        {form.tipo === "meta-economia" && (
          <div>
            <label className={labelCls}>Valor a Reservar Todo Mês (R$)</label>
            <input type="number" min={0} value={form.valor || ""} onChange={e => onChange({ valor: Number(e.target.value) })} className={inputCls} placeholder="Ex: 1.000" />
            <p className="text-[10px] text-slate-400 mt-1">
              Esse valor é separado do seu saldo livre como reserva intencional.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Root page ──────────────────────────────────────────────────────────── */

export default function SimuladorPage() {
  const [form, setForm] = useState<SimForm>({ ...emptyForm });
  const [simActive, setSimActive] = useState(false);

  const { data, isLoading } = useQuery<CustoData>({
    queryKey: ["custo-de-vida"],
    queryFn: async () => {
      const res = await fetch(`${BASE}api/custo-de-vida`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const baseScenario = useMemo(() => (data ? calcBase(data) : null), [data]);
  const simScenario = useMemo(() => (data && baseScenario && simActive ? applySimulation(baseScenario, form, data) : null), [data, baseScenario, simActive, form]);

  const baseProj = useMemo(() => (baseScenario ? projectionMonths(baseScenario) : []), [baseScenario]);
  const simProj = useMemo(() => (simScenario ? projectionMonths(simScenario) : []), [simScenario]);

  function updateForm(patch: Partial<SimForm>) {
    setForm(f => ({ ...f, ...patch }));
    setSimActive(false);
  }

  function applyQuick(quickIdx: number) {
    if (!data) return;
    const q = QUICK_SIMS[quickIdx];
    const patch = q.apply(data);
    setForm(f => ({ ...emptyForm, ...f, ...patch }));
    setTimeout(() => setSimActive(true), 50);
  }

  const activeSim = SIM_TYPES.find(s => s.key === form.tipo)!;

  // Impact summary
  const deltaSaldoMensal = simScenario && baseScenario ? simScenario.saldoMensal - baseScenario.saldoMensal : null;
  const deltaPatrimonio12m = simScenario && baseScenario ? simProj[11] - baseProj[11] : null;
  const deltaInvestimento = simScenario && baseScenario ? simScenario.investimentoMensal - baseScenario.investimentoMensal : null;

  return (
    <AppLayout>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-display font-bold text-slate-900">Simulador Financeiro</h1>
            <span className="bg-violet-100 text-violet-700 text-xs font-bold px-2.5 py-1 rounded-full border border-violet-200">
              Simulação
            </span>
          </div>
          <p className="text-slate-500">Teste decisões financeiras e veja o impacto antes de agir. Nada é alterado nos seus dados reais.</p>
        </div>

        {simActive && (
          <button
            onClick={() => setSimActive(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all self-start"
          >
            <RotateCcw className="w-4 h-4" />
            Limpar Simulação
          </button>
        )}
      </div>

      {/* ─── Simulation ≠ real data warning ─────────────────────────────── */}
      <div className="bg-violet-50 border border-violet-200 rounded-2xl px-5 py-3.5 mb-6 flex items-center gap-3">
        <FlaskConical className="w-4 h-4 text-violet-600 flex-shrink-0" />
        <p className="text-xs text-violet-800">
          <span className="font-bold">Ambiente de simulação seguro</span> — nenhuma alteração é salva.
          Os resultados são calculados com base nas suas recorrências e patrimônio atuais.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-32 text-slate-400">Carregando dados financeiros...</div>
      ) : !data ? (
        <div className="flex items-center justify-center py-32 text-slate-400">Erro ao carregar dados.</div>
      ) : (
        <>
          {/* ─── Quick scenarios ──────────────────────────────────────── */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Cenários Rápidos
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SIMS.map((q, i) => {
                const Icon = q.icon;
                return (
                  <button
                    key={i}
                    onClick={() => applyQuick(i)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                  >
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                    {q.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Main layout: form + results ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Form panel */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden sticky top-4">
                <div className={cn("px-5 py-4 border-b", activeSim.bg, "border-b", activeSim.border)}>
                  <div className="flex items-center gap-2">
                    {(() => { const Icon = activeSim.icon; return <Icon className={cn("w-4 h-4", activeSim.color)} />; })()}
                    <h2 className={cn("font-bold text-sm", activeSim.color)}>{activeSim.label}</h2>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{activeSim.sublabel}</p>
                </div>

                <div className="p-5">
                  <SimForm form={form} onChange={updateForm} data={data} />
                </div>

                <div className="px-5 pb-5">
                  <button
                    onClick={() => setSimActive(true)}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <FlaskConical className="w-4 h-4" />
                    Simular Agora
                  </button>
                </div>
              </div>
            </div>

            {/* Results panel */}
            <div className="lg:col-span-2 space-y-5">
              {!simActive ? (
                /* Empty state */
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                  <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-5">
                    <FlaskConical className="w-8 h-8 text-violet-400" />
                  </div>
                  <h3 className="text-slate-700 font-bold text-lg mb-2">Configure sua simulação</h3>
                  <p className="text-slate-400 text-sm max-w-sm">
                    Escolha um tipo de simulação à esquerda, ajuste os valores e clique em{" "}
                    <span className="font-semibold text-slate-600">Simular Agora</span> para ver o impacto no seu cenário financeiro.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2 justify-center">
                    {QUICK_SIMS.slice(0, 3).map((q, i) => {
                      const Icon = q.icon;
                      return (
                        <button key={i} onClick={() => applyQuick(i)} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold rounded-lg hover:bg-violet-100 transition-all">
                          <Icon className="w-3 h-3" />
                          {q.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  {/* Active sim banner */}
                  <div className={cn("rounded-2xl px-5 py-3.5 flex items-center gap-3 border", activeSim.bg, activeSim.border)}>
                    {(() => { const Icon = activeSim.icon; return <Icon className={cn("w-4 h-4 flex-shrink-0", activeSim.color)} />; })()}
                    <p className={cn("text-sm font-semibold", activeSim.color)}>
                      Simulando: {activeSim.label}
                      {form.valor > 0 && (
                        <span className="font-normal ml-2 opacity-80">
                          {form.tipo === "corte-recorrentes"
                            ? `${form.reducaoPct}% dos não-essenciais`
                            : form.tipo === "compra-parcelada"
                            ? `${formatCurrency(form.valor)} / ${form.numParcelas}x`
                            : form.tipo === "alteracao-renda"
                            ? `${form.isAumento ? "+" : "−"}${formatCurrency(form.valor)}/mês`
                            : `${formatCurrency(form.valor)}/mês`}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Comparison cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <CompareCard
                      label="Saldo Mensal"
                      icon={Wallet}
                      iconBg="bg-blue-50"
                      iconColor="text-blue-600"
                      baseVal={baseScenario!.saldoMensal}
                      simVal={simScenario!.saldoMensal}
                    />
                    <CompareCard
                      label="Renda Mensal"
                      icon={DollarSign}
                      iconBg="bg-emerald-50"
                      iconColor="text-emerald-600"
                      baseVal={baseScenario!.rendaMensal}
                      simVal={simScenario!.rendaMensal}
                    />
                    <CompareCard
                      label="Total de Despesas"
                      icon={TrendingDown}
                      iconBg="bg-rose-50"
                      iconColor="text-rose-600"
                      baseVal={baseScenario!.totalSaidas}
                      simVal={simScenario!.totalSaidas}
                    />
                    <CompareCard
                      label="Investimento Mensal"
                      icon={TrendingUp}
                      iconBg="bg-violet-50"
                      iconColor="text-violet-600"
                      baseVal={baseScenario!.investimentoMensal}
                      simVal={simScenario!.investimentoMensal}
                    />
                  </div>

                  {/* Autonomia + impact row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Autonomia */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Autonomia</p>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] text-slate-400">Atual</p>
                          <p className="text-xl font-bold font-mono text-slate-300">
                            {baseScenario!.autonomiaMeses ?? "—"}{" "}
                            <span className="text-sm text-slate-400">meses</span>
                          </p>
                        </div>
                        <div className={cn("rounded-xl p-3", (simScenario!.autonomiaMeses ?? 0) >= (baseScenario!.autonomiaMeses ?? 0) ? "bg-emerald-500/15 border border-emerald-500/25" : "bg-rose-500/15 border border-rose-500/25")}>
                          <p className="text-[10px] text-slate-400">Simulado</p>
                          <p className={cn("text-2xl font-bold font-mono", (simScenario!.autonomiaMeses ?? 0) >= (baseScenario!.autonomiaMeses ?? 0) ? "text-emerald-300" : "text-rose-300")}>
                            {simScenario!.autonomiaMeses ?? "—"}{" "}
                            <span className="text-sm opacity-70">meses</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Monthly delta */}
                    <div className={cn(
                      "rounded-2xl p-5 border-2 flex flex-col justify-between",
                      deltaSaldoMensal === null ? "bg-white border-slate-200"
                        : deltaSaldoMensal >= 0 ? "bg-emerald-50 border-emerald-200"
                        : "bg-rose-50 border-rose-200"
                    )}>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Impacto Mensal</p>
                      <div className="my-3">
                        <p className={cn("text-3xl font-bold font-mono",
                          deltaSaldoMensal === null ? "text-slate-300"
                            : deltaSaldoMensal >= 0 ? "text-emerald-700" : "text-rose-700"
                        )}>
                          {deltaSaldoMensal !== null
                            ? `${deltaSaldoMensal >= 0 ? "+" : ""}${formatCurrency(deltaSaldoMensal)}`
                            : "—"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">no saldo mensal</p>
                      </div>
                      {deltaSaldoMensal !== null && (
                        <p className="text-[10px] text-slate-500">
                          {formatCurrency(Math.abs(deltaSaldoMensal) * 12)} em {deltaSaldoMensal >= 0 ? "economia" : "custo"} anual
                        </p>
                      )}
                    </div>

                    {/* 12-month patrimônio delta */}
                    <div className={cn(
                      "rounded-2xl p-5 border-2 flex flex-col justify-between",
                      deltaPatrimonio12m === null ? "bg-white border-slate-200"
                        : deltaPatrimonio12m >= 0 ? "bg-violet-50 border-violet-200"
                        : "bg-amber-50 border-amber-200"
                    )}>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Patrimônio em 12m</p>
                      <div className="my-3">
                        <p className={cn("text-3xl font-bold font-mono",
                          deltaPatrimonio12m === null ? "text-slate-300"
                            : deltaPatrimonio12m >= 0 ? "text-violet-700" : "text-amber-700"
                        )}>
                          {deltaPatrimonio12m !== null
                            ? `${deltaPatrimonio12m >= 0 ? "+" : ""}${formatCurrency(deltaPatrimonio12m)}`
                            : "—"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">diferença em 12 meses</p>
                      </div>
                      {simScenario && (
                        <p className="text-[10px] text-slate-500">
                          Projeção: {formatCurrency(simProj[11] ?? 0)}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ─── 12-month chart ──────────────────────────────────────────── */}
          {simActive && baseProj.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-slate-400" />
                  <h2 className="font-semibold text-slate-900">Projeção Patrimonial — 12 Meses</h2>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>Atual: <span className="font-bold font-mono text-slate-700">{formatCurrency(baseProj[11] ?? 0)}</span></span>
                  <span className={cn("font-bold font-mono", (simProj[11] ?? 0) >= (baseProj[11] ?? 0) ? "text-emerald-600" : "text-rose-600")}>
                    Simulado: {formatCurrency(simProj[11] ?? 0)}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <ProjectionChart base={baseProj} sim={simProj} />
              </div>
            </div>
          )}

          {/* ─── Impact summary ───────────────────────────────────────────── */}
          {simActive && (
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-2 mb-5">
                <Star className="w-4 h-4 text-amber-400" />
                <h2 className="font-bold text-sm uppercase tracking-wide text-slate-300">Resumo do Impacto</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    label: "Saldo mensal",
                    value: deltaSaldoMensal,
                    sub: deltaSaldoMensal !== null ? `${deltaSaldoMensal >= 0 ? "+" : ""}${formatCurrency(deltaSaldoMensal)}/mês` : "—",
                    good: (deltaSaldoMensal ?? 0) >= 0,
                  },
                  {
                    label: "Impacto anual",
                    value: deltaSaldoMensal !== null ? deltaSaldoMensal * 12 : null,
                    sub: deltaSaldoMensal !== null ? `${deltaSaldoMensal >= 0 ? "+" : ""}${formatCurrency(deltaSaldoMensal * 12)}/ano` : "—",
                    good: (deltaSaldoMensal ?? 0) >= 0,
                  },
                  {
                    label: "Investimento mensal",
                    value: deltaInvestimento,
                    sub: deltaInvestimento !== null ? `${deltaInvestimento >= 0 ? "+" : ""}${formatCurrency(deltaInvestimento)}/mês` : "—",
                    good: (deltaInvestimento ?? 0) >= 0,
                  },
                  {
                    label: "Patrimônio em 12m",
                    value: deltaPatrimonio12m,
                    sub: deltaPatrimonio12m !== null ? `${deltaPatrimonio12m >= 0 ? "+" : ""}${formatCurrency(deltaPatrimonio12m)}` : "—",
                    good: (deltaPatrimonio12m ?? 0) >= 0,
                  },
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">{item.label}</p>
                    <p className={cn(
                      "text-lg font-bold font-mono",
                      item.value === null || item.value === 0 ? "text-slate-400"
                        : item.good ? "text-emerald-300" : "text-rose-300"
                    )}>
                      {item.sub}
                    </p>
                  </div>
                ))}
              </div>

              {/* Insights */}
              <div className="mt-5 pt-5 border-t border-white/10">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400">
                    {deltaSaldoMensal !== null && deltaSaldoMensal > 0 ? (
                      <>
                        Com essa mudança, seu saldo livre aumenta em{" "}
                        <span className="text-emerald-300 font-semibold">{formatCurrency(deltaSaldoMensal)}/mês</span> —
                        o equivalente a {formatCurrency(deltaSaldoMensal * 12)} em 12 meses acumulados no seu patrimônio.
                      </>
                    ) : deltaSaldoMensal !== null && deltaSaldoMensal < 0 ? (
                      <>
                        Essa mudança reduz seu saldo em{" "}
                        <span className="text-rose-300 font-semibold">{formatCurrency(Math.abs(deltaSaldoMensal))}/mês</span>.
                        Verifique se seu orçamento comporta esse ajuste antes de confirmar.
                      </>
                    ) : (
                      "Sem impacto no saldo mensal para esse cenário."
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
