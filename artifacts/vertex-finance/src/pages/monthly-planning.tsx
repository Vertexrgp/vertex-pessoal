import { useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatCurrency } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight,
  Star, AlertTriangle, BarChart3, Target, Pencil, Check, X, Zap,
  AlertCircle, ThumbsUp, Calendar, CreditCard,
} from "lucide-react";
import { getApiBase } from "@/lib/api-base";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

interface MonthData {
  month: number;
  year: number;
  planId: number | null;
  plannedReceitas: number;
  plannedDespesas: number;
  plannedInvestimentos: number;
  notes: string | null;
  actualReceitas: number;
  actualDespesas: number;
  forecastReceitas: number;
  forecastDespesas: number;
  forecastRecorrentes: number;
  forecastParcelas: number;
}

interface MonthForecast {
  month: number;
  receitas: number;
  despesas: number;
  investimentos: number;
  saldo: number;
  parcelas: number;
  recorrentes: number;
  isManual: boolean;
  hasAnyData: boolean;
  status: "positivo" | "atencao" | "negativo" | "vazio";
}

async function fetchAnnualPlan(year: number): Promise<MonthData[]> {
  const res = await fetch(`${getApiBase()}/api/annual-plans?year=${year}`);
  if (!res.ok) throw new Error("Erro ao carregar planejamento");
  return res.json();
}

async function upsertMonthPlan(year: number, month: number, body: {
  plannedReceitas: number;
  plannedDespesas: number;
  plannedInvestimentos: number;
}) {
  const res = await fetch(`${getApiBase()}/api/annual-plans/${year}/${month}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Erro ao salvar planejamento");
  return res.json();
}

type RowKey = "plannedReceitas" | "plannedDespesas" | "plannedInvestimentos";

interface EditingCell { month: number; field: RowKey; value: string; }

function computeForecast(m: MonthData): MonthForecast {
  const receitas = m.plannedReceitas > 0 ? m.plannedReceitas : m.forecastReceitas;
  const despesas = m.plannedDespesas > 0 ? m.plannedDespesas : m.forecastDespesas;
  const investimentos = m.plannedInvestimentos;
  const saldo = receitas - despesas - investimentos;
  const isManual = m.plannedReceitas > 0 || m.plannedDespesas > 0;
  const hasAnyData = receitas > 0 || despesas > 0;
  let status: MonthForecast["status"] = "vazio";
  if (hasAnyData) {
    if (saldo < 0) status = "negativo";
    else if (receitas > 0 && saldo < receitas * 0.15) status = "atencao";
    else status = "positivo";
  }
  return {
    month: m.month, receitas, despesas, investimentos,
    saldo, isManual, hasAnyData, status,
    parcelas: m.forecastParcelas,
    recorrentes: m.forecastRecorrentes,
  };
}

function TrendBadge({ values }: { values: number[] }) {
  const nonZero = values.filter(v => v > 0);
  if (nonZero.length < 2) return <span className="text-slate-300 text-xs">—</span>;
  const pct = ((nonZero[nonZero.length - 1] - nonZero[0]) / nonZero[0]) * 100;
  if (Math.abs(pct) < 2) return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Minus className="w-3 h-3" /> Estável</span>
  );
  if (pct > 0) return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><TrendingUp className="w-3 h-3" /> +{pct.toFixed(0)}%</span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-medium"><TrendingDown className="w-3 h-3" /> {pct.toFixed(0)}%</span>
  );
}

function CellInput({ value, onConfirm, onCancel }: { value: string; onConfirm: (v: string) => void; onCancel: () => void; }) {
  const [v, setV] = useState(value);
  return (
    <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
      <input autoFocus type="number" step="100" min="0"
        className="w-24 text-xs text-right bg-white border border-primary rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary/40 font-mono"
        value={v} onChange={e => setV(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onConfirm(v); if (e.key === "Escape") onCancel(); }}
      />
      <button type="button" onClick={() => onConfirm(v)} className="p-0.5 text-emerald-600"><Check className="w-3 h-3" /></button>
      <button type="button" onClick={onCancel} className="p-0.5 text-rose-400"><X className="w-3 h-3" /></button>
    </div>
  );
}

function StatusBadge({ status }: { status: MonthForecast["status"] }) {
  if (status === "positivo") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
      <ThumbsUp className="w-2.5 h-2.5" /> Positivo
    </span>
  );
  if (status === "atencao") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <AlertCircle className="w-2.5 h-2.5" /> Atenção
    </span>
  );
  if (status === "negativo") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-2.5 h-2.5" /> Negativo
    </span>
  );
  return null;
}

export default function MonthlyPlanningPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const queryClient = useQueryClient();

  const { data: months, isLoading } = useQuery<MonthData[]>({
    queryKey: ["annual-plans", year],
    queryFn: () => fetchAnnualPlan(year),
  });

  const mutation = useMutation({
    mutationFn: ({ month, body }: { month: number; body: Parameters<typeof upsertMonthPlan>[2] }) =>
      upsertMonthPlan(year, month, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["annual-plans", year] }),
  });

  const handleConfirm = useCallback((m: MonthData, field: RowKey, rawVal: string) => {
    const num = Math.max(0, Number(rawVal) || 0);
    mutation.mutate({
      month: m.month,
      body: {
        plannedReceitas: field === "plannedReceitas" ? num : m.plannedReceitas,
        plannedDespesas: field === "plannedDespesas" ? num : m.plannedDespesas,
        plannedInvestimentos: field === "plannedInvestimentos" ? num : m.plannedInvestimentos,
      },
    });
    setEditing(null);
  }, [mutation]);

  const today = new Date();
  const currentMonth = today.getMonth() + 1;

  // ─── Forecasts ─────────────────────────────────────────────────────────────
  const forecasts: MonthForecast[] = months?.map(computeForecast) ?? [];
  const withData = forecasts.filter(f => f.hasAnyData);
  const negativeMonths = forecasts.filter(f => f.status === "negativo");
  const atencaoMonths = forecasts.filter(f => f.status === "atencao");
  const positiveMonths = forecasts.filter(f => f.status === "positivo");

  const melhorMes = withData.length > 0
    ? withData.reduce((best, f) => f.saldo > best.saldo ? f : best, withData[0]) : null;
  const piorMes = withData.length > 0
    ? withData.reduce((worst, f) => f.saldo < worst.saldo ? f : worst, withData[0]) : null;

  const mediaSaldo = withData.length > 0
    ? withData.reduce((s, f) => s + f.saldo, 0) / withData.length : 0;
  const mediaReceitas = withData.length > 0
    ? withData.reduce((s, f) => s + f.receitas, 0) / withData.length : 0;
  const mediaDespesas = withData.length > 0
    ? withData.reduce((s, f) => s + f.despesas, 0) / withData.length : 0;
  const totalAnual = forecasts.reduce((s, f) => s + f.saldo, 0);

  // ─── Alerts ──────────────────────────────────────────────────────────────
  interface Alert { type: "danger" | "warning" | "info"; month: number; text: string; }
  const alerts: Alert[] = [];

  forecasts.forEach(f => {
    if (!f.hasAnyData) return;
    const name = MONTH_NAMES[f.month - 1];
    if (f.status === "negativo") {
      alerts.push({ type: "danger", month: f.month, text: `${name} está com saldo previsto negativo (${formatCurrency(f.saldo)})` });
    } else if (f.status === "atencao") {
      alerts.push({ type: "warning", month: f.month, text: `${name} tem pouca folga financeira — sobra apenas ${formatCurrency(f.saldo)}` });
    }
    if (f.despesas > 0 && f.parcelas > 0 && f.parcelas / f.despesas > 0.35) {
      alerts.push({ type: "warning", month: f.month, text: `${name} tem alto impacto de parcelas de cartão (${Math.round(f.parcelas / f.despesas * 100)}% das despesas)` });
    }
  });

  // ─── Render helpers ────────────────────────────────────────────────────────
  const rows: { key: RowKey; label: string; color: string; forecastKey?: keyof MonthData }[] = [
    { key: "plannedReceitas", label: "Receitas", color: "emerald", forecastKey: "forecastReceitas" },
    { key: "plannedDespesas", label: "Despesas", color: "rose", forecastKey: "forecastDespesas" },
    { key: "plannedInvestimentos", label: "Investimentos", color: "blue" },
  ];

  function renderCell(m: MonthData, field: RowKey, forecastKey?: keyof MonthData) {
    const isEditing = editing?.month === m.month && editing?.field === field;
    const val = m[field] as number;
    const forecast = forecastKey ? (m[forecastKey] as number) : 0;
    const isAuto = val === 0 && forecast > 0;
    if (isEditing) {
      return <CellInput value={String(val || forecast)} onConfirm={v => handleConfirm(m, field, v)} onCancel={() => setEditing(null)} />;
    }
    const displayVal = val > 0 ? val : forecast;
    return (
      <button type="button"
        onClick={() => setEditing({ month: m.month, field, value: String(val || forecast) })}
        className={cn(
          "group relative w-full text-right text-xs font-mono py-0.5 px-1 rounded transition-colors",
          displayVal > 0 ? (isAuto ? "text-slate-400 italic" : "text-slate-700") : "text-slate-300",
          "hover:bg-slate-100 hover:text-slate-900"
        )}
      >
        <span className="inline-flex items-center gap-1 justify-end">
          {isAuto && <Zap className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />}
          {displayVal > 0 ? formatCurrency(displayVal) : <span className="text-slate-200">—</span>}
        </span>
        <Pencil className="w-2.5 h-2.5 absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 text-slate-500" />
      </button>
    );
  }

  function renderResultadoCell(m: MonthData, f: MonthForecast) {
    if (!f.hasAnyData) return <span className="text-slate-200 text-xs">—</span>;
    const isAuto = !f.isManual;
    return (
      <span className={cn(
        "text-xs font-bold font-mono inline-flex items-center gap-1 justify-end",
        f.saldo > 0 ? "text-emerald-600" : f.saldo < 0 ? "text-rose-600" : "text-slate-400",
        isAuto && "opacity-70"
      )}>
        {isAuto && <Zap className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />}
        {f.saldo > 0 ? "+" : ""}{formatCurrency(f.saldo)}
      </span>
    );
  }

  // Max saldo for bar chart scale
  const maxAbsSaldo = Math.max(...forecasts.map(f => Math.abs(f.saldo)), 1);

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Planejamento Anual</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-1.5">
            Previsão de saldo mês a mês.
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
              <Zap className="w-3 h-3 text-amber-400" /> Preenchimento automático via Recorrências
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
          <button type="button" onClick={() => setYear(y => y - 1)} className="text-slate-400 hover:text-slate-700">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-slate-800 text-lg w-14 text-center">{year}</span>
          <button type="button" onClick={() => setYear(y => y + 1)} className="text-slate-400 hover:text-slate-700">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Star className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Melhor Mês</p>
          </div>
          {melhorMes ? (
            <>
              <p className="text-xl font-bold text-emerald-600">{MONTH_NAMES[melhorMes.month - 1]}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{melhorMes.saldo >= 0 ? "+" : ""}{formatCurrency(melhorMes.saldo)} de sobra</p>
            </>
          ) : <p className="text-slate-400 text-sm">Sem dados</p>}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pior Mês</p>
          </div>
          {piorMes ? (
            <>
              <p className="text-xl font-bold text-rose-500">{MONTH_NAMES[piorMes.month - 1]}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{piorMes.saldo >= 0 ? "+" : ""}{formatCurrency(piorMes.saldo)} de resultado</p>
            </>
          ) : <p className="text-slate-400 text-sm">Sem dados</p>}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-slate-500" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Meses em Risco</p>
          </div>
          <p className="text-xl font-bold text-slate-800">
            <span className="text-rose-600">{negativeMonths.length}</span>
            <span className="text-slate-300 mx-1">|</span>
            <span className="text-amber-500">{atencaoMonths.length}</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">negativos | atenção</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-violet-600" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Saldo Anual</p>
          </div>
          <p className={cn(
            "text-xl font-bold font-mono",
            totalAnual > 0 ? "text-emerald-600" : totalAnual < 0 ? "text-rose-600" : "text-slate-400"
          )}>
            {totalAnual > 0 ? "+" : ""}{formatCurrency(totalAnual)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">resultado líquido {year}</p>
        </div>
      </div>

      {/* ─── Month Forecast Cards ──────────────────────────────────────────── */}
      {!isLoading && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Previsão de Saldo por Mês</h2>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Positivo</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Atenção</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Negativo</span>
            </div>
          </div>

          <div className="grid grid-cols-6 lg:grid-cols-12 gap-2">
            {forecasts.map((f) => {
              const isCurrentMonth = f.month === currentMonth && year === currentYear;
              const barPct = f.hasAnyData ? Math.abs(f.saldo) / maxAbsSaldo : 0;

              const cardBg = !f.hasAnyData ? "bg-white border-slate-100"
                : f.status === "positivo" ? "bg-emerald-50 border-emerald-100"
                : f.status === "atencao" ? "bg-amber-50 border-amber-100"
                : "bg-rose-50 border-rose-100";

              const saldoColor = !f.hasAnyData ? "text-slate-300"
                : f.saldo > 0 ? "text-emerald-700"
                : f.saldo < 0 ? "text-rose-700" : "text-slate-400";

              return (
                <div
                  key={f.month}
                  className={cn(
                    "rounded-2xl border p-3 flex flex-col gap-1.5 transition-all",
                    cardBg,
                    isCurrentMonth ? "ring-2 ring-primary ring-offset-1" : ""
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-xs font-bold uppercase",
                      isCurrentMonth ? "text-primary" : "text-slate-500"
                    )}>
                      {MONTHS[f.month - 1]}
                    </p>
                    {!f.isManual && f.hasAnyData && (
                      <Zap className="w-2.5 h-2.5 text-amber-400" title="Previsão automática" />
                    )}
                  </div>

                  {/* Mini bar chart */}
                  <div className="h-10 flex items-end gap-0.5">
                    {/* Receitas bar */}
                    <div
                      className="flex-1 rounded-t-sm bg-emerald-300 transition-all"
                      style={{ height: f.receitas > 0 ? `${(f.receitas / Math.max(...forecasts.map(x => x.receitas), 1)) * 100}%` : "4%" }}
                      title={`Receitas: ${formatCurrency(f.receitas)}`}
                    />
                    {/* Despesas bar */}
                    <div
                      className="flex-1 rounded-t-sm bg-rose-300 transition-all"
                      style={{ height: f.despesas > 0 ? `${(f.despesas / Math.max(...forecasts.map(x => x.despesas), 1)) * 100}%` : "4%" }}
                      title={`Despesas: ${formatCurrency(f.despesas)}`}
                    />
                  </div>

                  {/* Saldo */}
                  <div className="text-right">
                    {f.hasAnyData ? (
                      <p className={cn("text-xs font-bold font-mono leading-tight", saldoColor)}>
                        {f.saldo >= 0 ? "+" : ""}{formatCurrency(f.saldo)}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-300 font-medium">sem dados</p>
                    )}
                  </div>

                  {/* Status dot */}
                  {f.hasAnyData && (
                    <div className={cn(
                      "h-1 rounded-full w-full",
                      f.status === "positivo" ? "bg-emerald-400" :
                      f.status === "atencao" ? "bg-amber-400" : "bg-rose-400"
                    )} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary bar below cards */}
          {withData.length > 0 && (
            <div className="mt-4 bg-white border border-slate-100 rounded-2xl px-6 py-4 flex items-center gap-8 flex-wrap shadow-sm">
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide">Média de Saldo/Mês</p>
                <p className={cn("text-lg font-bold font-mono mt-0.5", mediaSaldo >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {mediaSaldo >= 0 ? "+" : ""}{formatCurrency(mediaSaldo)}
                </p>
              </div>
              <div className="w-px h-10 bg-slate-100" />
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide">Média Receitas/Mês</p>
                <p className="text-lg font-bold font-mono text-emerald-600 mt-0.5">{formatCurrency(mediaReceitas)}</p>
              </div>
              <div className="w-px h-10 bg-slate-100" />
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide">Média Despesas/Mês</p>
                <p className="text-lg font-bold font-mono text-rose-600 mt-0.5">{formatCurrency(mediaDespesas)}</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                {positiveMonths.length > 0 && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                    {positiveMonths.length} mês{positiveMonths.length > 1 ? "es" : ""} positivo{positiveMonths.length > 1 ? "s" : ""}
                  </span>
                )}
                {negativeMonths.length > 0 && (
                  <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-full">
                    {negativeMonths.length} negativo{negativeMonths.length > 1 ? "s" : ""}
                  </span>
                )}
                {atencaoMonths.length > 0 && (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                    {atencaoMonths.length} em atenção
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Alerts ──────────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Alertas Automáticos
          </h2>
          <div className="flex flex-col gap-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium border",
                  a.type === "danger"
                    ? "bg-rose-50 border-rose-100 text-rose-800"
                    : "bg-amber-50 border-amber-100 text-amber-800"
                )}
              >
                {a.type === "danger"
                  ? <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                }
                <span>{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Main Planning Table ─────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-slate-900">Planejamento Detalhado por Mês</h2>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 inline-flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> = previsão automática
            </span>
            <span className="text-xs text-slate-400">Clique para editar</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-16 text-center text-slate-400">Carregando...</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide w-36 border-r border-slate-100">Linha</th>
                  {MONTHS.map((m, i) => {
                    const isCur = (i + 1) === currentMonth && year === currentYear;
                    return (
                      <th key={m} className={cn(
                        "px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide w-24",
                        isCur ? "text-primary bg-primary/5 border-b-2 border-primary" : "text-slate-400"
                      )}>{m}</th>
                    );
                  })}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide w-28 border-l border-slate-100">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => {
                  const rowTotal = months?.reduce((s, m) => {
                    const planned = m[row.key] as number;
                    const forecast = row.forecastKey ? (m[row.forecastKey] as number) : 0;
                    return s + (planned > 0 ? planned : forecast);
                  }, 0) ?? 0;
                  return (
                    <tr key={row.key} className={cn("border-t border-slate-100", rowIdx % 2 === 1 ? "bg-slate-50/40" : "bg-white")}>
                      <td className="px-5 py-3 border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full flex-shrink-0",
                            row.color === "emerald" ? "bg-emerald-500" : row.color === "rose" ? "bg-rose-500" : "bg-blue-500"
                          )} />
                          <span className="font-semibold text-slate-700 text-sm">{row.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 ml-4 mt-0.5">Previsto</p>
                      </td>
                      {months?.map(m => {
                        const isCur = m.month === currentMonth && year === currentYear;
                        return (
                          <td key={m.month} className={cn("px-2 py-2 text-right", isCur ? "bg-primary/5" : "")}>
                            {renderCell(m, row.key, row.forecastKey)}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right border-l border-slate-100">
                        <span className={cn("text-xs font-bold font-mono",
                          row.color === "emerald" ? "text-emerald-700" : row.color === "rose" ? "text-rose-700" : "text-blue-700"
                        )}>
                          {rowTotal > 0 ? formatCurrency(rowTotal) : <span className="text-slate-300">—</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Resultado row */}
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-5 py-3.5 border-r border-slate-100">
                    <span className="font-bold text-slate-800 text-sm">Saldo Previsto</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Rec. − Desp. − Inv.</p>
                  </td>
                  {months?.map((m, i) => {
                    const f = forecasts[i];
                    const isCur = m.month === currentMonth && year === currentYear;
                    return (
                      <td key={m.month} className={cn("px-2 py-3.5 text-right", isCur ? "bg-primary/5" : "")}>
                        {f ? renderResultadoCell(m, f) : <span className="text-slate-200 text-xs">—</span>}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3.5 text-right border-l border-slate-100">
                    <span className={cn("text-xs font-bold font-mono",
                      totalAnual > 0 ? "text-emerald-700" : totalAnual < 0 ? "text-rose-700" : "text-slate-400"
                    )}>
                      {totalAnual !== 0 ? `${totalAnual > 0 ? "+" : ""}${formatCurrency(totalAnual)}` : <span className="text-slate-300">—</span>}
                    </span>
                  </td>
                </tr>

                {/* Realizado row */}
                {year === currentYear && (
                  <tr className="border-t border-dashed border-slate-200 bg-white">
                    <td className="px-5 py-2.5 border-r border-slate-100">
                      <span className="text-xs font-semibold text-slate-500">Realizado</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Rec. − Desp.</p>
                    </td>
                    {months?.map(m => {
                      const actual = m.actualReceitas - m.actualDespesas;
                      const isCur = m.month === currentMonth && year === currentYear;
                      return (
                        <td key={m.month} className={cn("px-2 py-2.5 text-right", isCur ? "bg-primary/5" : "")}>
                          {(m.actualReceitas > 0 || m.actualDespesas > 0) ? (
                            <span className={cn("text-xs font-semibold font-mono", actual >= 0 ? "text-emerald-600" : "text-rose-600")}>
                              {actual >= 0 ? "+" : ""}{formatCurrency(actual)}
                            </span>
                          ) : (
                            <span className="text-slate-200 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 border-l border-slate-100" />
                  </tr>
                )}

                {/* Status row */}
                <tr className="border-t border-slate-100 bg-slate-50/30">
                  <td className="px-5 py-2 border-r border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Status</span>
                  </td>
                  {forecasts.map(f => {
                    const isCur = f.month === currentMonth && year === currentYear;
                    return (
                      <td key={f.month} className={cn("px-2 py-2 text-center", isCur ? "bg-primary/5" : "")}>
                        <StatusBadge status={f.status} />
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 border-l border-slate-100" />
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Trend Charts ────────────────────────────────────────────────────── */}
      {!isLoading && withData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Receitas Previstas", values: forecasts.map(f => f.receitas), avg: mediaReceitas, color: "emerald" },
            { label: "Despesas Previstas", values: forecasts.map(f => f.despesas), avg: mediaDespesas, color: "rose" },
            { label: "Saldo Previsto", values: forecasts.map(f => f.saldo), avg: mediaSaldo, color: "blue" },
          ].map(({ label, values, avg, color }) => {
            const max = Math.max(...values.map(Math.abs), 1);
            return (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-700">{label}</p>
                  <TrendBadge values={values.filter(v => v > 0)} />
                </div>
                <div className="flex items-end gap-1 h-10">
                  {MONTHS.map((m, i) => {
                    const v = values[i];
                    const pct = Math.abs(v) / max;
                    const isPos = v >= 0;
                    const isCurMonth = (i + 1) === currentMonth && year === currentYear;
                    return (
                      <div key={m}
                        className={cn(
                          "flex-1 rounded-sm transition-all",
                          color === "blue"
                            ? isPos
                              ? isCurMonth ? "bg-emerald-500" : "bg-emerald-200"
                              : isCurMonth ? "bg-rose-500" : "bg-rose-200"
                            : color === "emerald"
                              ? isCurMonth ? "bg-emerald-500" : "bg-emerald-200"
                              : isCurMonth ? "bg-rose-500" : "bg-rose-200"
                        )}
                        style={{ height: `${Math.max(pct * 100, 4)}%` }}
                        title={`${m}: ${formatCurrency(v)}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-slate-400">Jan</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Média: {avg >= 0 ? "+" : ""}{formatCurrency(avg)}
                  </span>
                  <span className="text-[10px] text-slate-400">Dez</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && withData.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="font-medium text-slate-600">Nenhuma previsão para {year}</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">
            Cadastre{" "}
            <a href={`${import.meta.env.BASE_URL}recorrencias`} className="text-amber-500 font-semibold hover:underline">
              Recorrências
            </a>{" "}
            para preencher automaticamente, ou clique em qualquer célula da tabela para inserir valores manualmente.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
