import { useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatCurrency } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight,
  Star, AlertTriangle, BarChart3, Target, Pencil, Check, X, Zap,
} from "lucide-react";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const BASE = import.meta.env.BASE_URL ?? "/";

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

async function fetchAnnualPlan(year: number): Promise<MonthData[]> {
  const res = await fetch(`${BASE}api/annual-plans?year=${year}`);
  if (!res.ok) throw new Error("Erro ao carregar planejamento");
  return res.json();
}

async function upsertMonthPlan(year: number, month: number, body: {
  plannedReceitas: number;
  plannedDespesas: number;
  plannedInvestimentos: number;
}) {
  const res = await fetch(`${BASE}api/annual-plans/${year}/${month}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Erro ao salvar planejamento");
  return res.json();
}

type RowKey = "plannedReceitas" | "plannedDespesas" | "plannedInvestimentos";

interface EditingCell {
  month: number;
  field: RowKey;
  value: string;
}

function TrendBadge({ values }: { values: number[] }) {
  const nonZero = values.filter(v => v > 0);
  if (nonZero.length < 2) return <span className="text-slate-300 text-xs">—</span>;
  const first = nonZero[0];
  const last = nonZero[nonZero.length - 1];
  const pct = ((last - first) / first) * 100;
  if (Math.abs(pct) < 2) return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <Minus className="w-3 h-3" /> Estável
    </span>
  );
  if (pct > 0) return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
      <TrendingUp className="w-3 h-3" /> +{pct.toFixed(0)}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-medium">
      <TrendingDown className="w-3 h-3" /> {pct.toFixed(0)}%
    </span>
  );
}

function CellInput({ value, onConfirm, onCancel }: {
  value: string;
  onConfirm: (val: string) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(value);
  return (
    <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
      <input
        autoFocus
        type="number"
        step="100"
        min="0"
        className="w-24 text-xs text-right bg-white border border-primary rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary/40 font-mono"
        value={v}
        onChange={e => setV(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") onConfirm(v);
          if (e.key === "Escape") onCancel();
        }}
      />
      <button type="button" onClick={() => onConfirm(v)} className="p-0.5 text-emerald-600 hover:text-emerald-700">
        <Check className="w-3 h-3" />
      </button>
      <button type="button" onClick={onCancel} className="p-0.5 text-rose-400 hover:text-rose-600">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
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

  // ─── KPIs ────────────────────────────────────────────────────────────────────
  // Effective value = user-entered OR forecast from recurrences
  const results = months?.map(m => {
    const effReceitas = m.plannedReceitas > 0 ? m.plannedReceitas : m.forecastReceitas;
    const effDespesas = m.plannedDespesas > 0 ? m.plannedDespesas : m.forecastDespesas;
    const effInvest = m.plannedInvestimentos;
    return {
      month: m.month,
      resultado: effReceitas - effDespesas - effInvest,
      actualResultado: m.actualReceitas - m.actualDespesas,
      plannedReceitas: effReceitas,
      plannedDespesas: effDespesas,
      plannedInvestimentos: effInvest,
      actualReceitas: m.actualReceitas,
      actualDespesas: m.actualDespesas,
    };
  }) ?? [];

  const withPlan = results.filter(r => r.plannedReceitas > 0 || r.plannedDespesas > 0);
  const melhorMes = withPlan.length > 0
    ? withPlan.reduce((best, r) => r.resultado > best.resultado ? r : best, withPlan[0])
    : null;
  const piorMes = withPlan.length > 0
    ? withPlan.reduce((worst, r) => r.resultado < worst.resultado ? r : worst, withPlan[0])
    : null;
  const mediaReceitas = withPlan.length > 0
    ? withPlan.reduce((s, r) => s + r.plannedReceitas, 0) / withPlan.length
    : 0;
  const mediaDespesas = withPlan.length > 0
    ? withPlan.reduce((s, r) => s + r.plannedDespesas, 0) / withPlan.length
    : 0;
  const totalPlanejado = results.reduce((s, r) => s + r.resultado, 0);
  const totalInvestimentos = results.reduce((s, r) => s + r.plannedInvestimentos, 0);

  const rows: {
    key: RowKey;
    label: string;
    color: string;
    forecastKey?: keyof MonthData;
    actual?: (m: MonthData) => number;
  }[] = [
    { key: "plannedReceitas", label: "Receitas", color: "emerald", forecastKey: "forecastReceitas", actual: m => m.actualReceitas },
    { key: "plannedDespesas", label: "Despesas", color: "rose", forecastKey: "forecastDespesas", actual: m => m.actualDespesas },
    { key: "plannedInvestimentos", label: "Investimentos", color: "blue" },
  ];

  function renderCell(m: MonthData, field: RowKey, forecastKey?: keyof MonthData) {
    const isEditing = editing?.month === m.month && editing?.field === field;
    const val = m[field] as number;
    const forecast = forecastKey ? (m[forecastKey] as number) : 0;
    const isAuto = val === 0 && forecast > 0;

    if (isEditing) {
      return (
        <CellInput
          value={String(val || forecast)}
          onConfirm={(v) => handleConfirm(m, field, v)}
          onCancel={() => setEditing(null)}
        />
      );
    }

    const displayVal = val > 0 ? val : forecast;

    return (
      <button
        type="button"
        onClick={() => setEditing({ month: m.month, field, value: String(val || forecast) })}
        className={cn(
          "group relative w-full text-right text-xs font-mono py-0.5 px-1 rounded transition-colors",
          displayVal > 0 ? (isAuto ? "text-slate-400 italic" : "text-slate-700") : "text-slate-300",
          "hover:bg-slate-100 hover:text-slate-900"
        )}
      >
        <span className="inline-flex items-center gap-1 justify-end">
          {isAuto && (
            <Zap className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" title="Previsão automática via recorrências" />
          )}
          {displayVal > 0 ? formatCurrency(displayVal) : <span className="text-slate-200">—</span>}
        </span>
        <Pencil className="w-2.5 h-2.5 absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 text-slate-500" />
      </button>
    );
  }

  function getEffectiveDespesas(m: MonthData) {
    return m.plannedDespesas > 0 ? m.plannedDespesas : m.forecastDespesas;
  }
  function getEffectiveReceitas(m: MonthData) {
    return m.plannedReceitas > 0 ? m.plannedReceitas : m.forecastReceitas;
  }

  function renderResultadoCell(m: MonthData) {
    const effR = getEffectiveReceitas(m);
    const effD = getEffectiveDespesas(m);
    const r = effR - effD - m.plannedInvestimentos;
    const hasData = effR > 0 || effD > 0;
    const isAuto = (m.plannedReceitas === 0 && m.forecastReceitas > 0)
      || (m.plannedDespesas === 0 && m.forecastDespesas > 0);

    if (!hasData) return <span className="text-slate-200 text-xs">—</span>;

    return (
      <span className={cn(
        "text-xs font-bold font-mono inline-flex items-center gap-1 justify-end",
        r > 0 ? "text-emerald-600" : r < 0 ? "text-rose-600" : "text-slate-400",
        isAuto && "opacity-70"
      )}>
        {isAuto && <Zap className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />}
        {r > 0 ? "+" : ""}{formatCurrency(r)}
      </span>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Planejamento Anual</h1>
          <p className="text-slate-500 mt-1">
            Visão estratégica do ano.{" "}
            <span className="inline-flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-amber-600 font-medium">Preenchimento automático via Recorrências</span>
            </span>
          </p>
        </div>
        {/* Year picker */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
          <button
            type="button"
            onClick={() => setYear(y => y - 1)}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-slate-800 text-lg w-14 text-center">{year}</span>
          <button
            type="button"
            onClick={() => setYear(y => y + 1)}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{formatCurrency(melhorMes.resultado)} resultado</p>
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
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{formatCurrency(piorMes.resultado)} resultado</p>
            </>
          ) : <p className="text-slate-400 text-sm">Sem dados</p>}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Média Mensal</p>
          </div>
          <p className="text-xl font-bold text-slate-800 font-mono">{formatCurrency(mediaReceitas)}</p>
          <p className="text-xs text-slate-500 mt-0.5">receita prevista</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-violet-600" />
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total do Ano</p>
          </div>
          <p className={cn(
            "text-xl font-bold font-mono",
            totalPlanejado > 0 ? "text-emerald-600" : totalPlanejado < 0 ? "text-rose-600" : "text-slate-400"
          )}>
            {totalPlanejado > 0 ? "+" : ""}{formatCurrency(totalPlanejado)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">resultado líquido</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-slate-900">Planejamento por Mês</h2>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 inline-flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> = previsão automática (clique para personalizar)
            </span>
            <span className="text-xs text-slate-400">Clique nos valores para editar</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-16 text-center text-slate-400">Carregando planejamento...</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide w-36 border-r border-slate-100">
                    Linha
                  </th>
                  {MONTHS.map((m, i) => {
                    const isCurrentMonth = (i + 1) === currentMonth && year === currentYear;
                    return (
                      <th
                        key={m}
                        className={cn(
                          "px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide w-24",
                          isCurrentMonth
                            ? "text-primary bg-primary/5 border-b-2 border-primary"
                            : "text-slate-400"
                        )}
                      >
                        {m}
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide w-28 border-l border-slate-100">
                    Total
                  </th>
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
                    <tr
                      key={row.key}
                      className={cn(
                        "border-t border-slate-100",
                        rowIdx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      )}
                    >
                      <td className="px-5 py-3 border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            row.color === "emerald" ? "bg-emerald-500" :
                            row.color === "rose" ? "bg-rose-500" : "bg-blue-500"
                          )} />
                          <span className="font-semibold text-slate-700 text-sm">{row.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 ml-4 mt-0.5">Previsto</p>
                      </td>
                      {months?.map(m => {
                        const isCurrentMonth = m.month === currentMonth && year === currentYear;
                        return (
                          <td
                            key={m.month}
                            className={cn(
                              "px-2 py-2 text-right",
                              isCurrentMonth ? "bg-primary/5" : ""
                            )}
                          >
                            {renderCell(m, row.key, row.forecastKey)}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right border-l border-slate-100">
                        <span className={cn(
                          "text-xs font-bold font-mono",
                          row.color === "emerald" ? "text-emerald-700" :
                          row.color === "rose" ? "text-rose-700" : "text-blue-700"
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
                    <span className="font-bold text-slate-800 text-sm">Resultado</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Rec. − Desp. − Inv.</p>
                  </td>
                  {months?.map(m => {
                    const isCurrentMonth = m.month === currentMonth && year === currentYear;
                    return (
                      <td
                        key={m.month}
                        className={cn(
                          "px-2 py-3.5 text-right",
                          isCurrentMonth ? "bg-primary/5" : ""
                        )}
                      >
                        {renderResultadoCell(m)}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3.5 text-right border-l border-slate-100">
                    <span className={cn(
                      "text-xs font-bold font-mono",
                      totalPlanejado > 0 ? "text-emerald-700" : totalPlanejado < 0 ? "text-rose-700" : "text-slate-400"
                    )}>
                      {totalPlanejado !== 0
                        ? `${totalPlanejado > 0 ? "+" : ""}${formatCurrency(totalPlanejado)}`
                        : <span className="text-slate-300">—</span>}
                    </span>
                  </td>
                </tr>

                {/* Actual row */}
                {year === currentYear && (
                  <tr className="border-t border-dashed border-slate-200 bg-white">
                    <td className="px-5 py-2.5 border-r border-slate-100">
                      <span className="text-xs font-semibold text-slate-500">Realizado</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Rec. − Desp.</p>
                    </td>
                    {months?.map(m => {
                      const actual = m.actualReceitas - m.actualDespesas;
                      const isCurrentMonth = m.month === currentMonth && year === currentYear;
                      return (
                        <td
                          key={m.month}
                          className={cn(
                            "px-2 py-2.5 text-right",
                            isCurrentMonth ? "bg-primary/5" : ""
                          )}
                        >
                          {(m.actualReceitas > 0 || m.actualDespesas > 0) ? (
                            <span className={cn(
                              "text-xs font-semibold font-mono",
                              actual >= 0 ? "text-emerald-600" : "text-rose-600"
                            )}>
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
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Trend Indicators */}
      {!isLoading && months && withPlan.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Tendência de Receitas",
              values: months.map(m => m.plannedReceitas > 0 ? m.plannedReceitas : m.forecastReceitas),
              avg: mediaReceitas,
              color: "emerald",
            },
            {
              label: "Tendência de Despesas",
              values: months.map(m => m.plannedDespesas > 0 ? m.plannedDespesas : m.forecastDespesas),
              avg: mediaDespesas,
              color: "rose",
            },
            {
              label: "Tendência de Investimentos",
              values: months.map(m => m.plannedInvestimentos),
              avg: totalInvestimentos / 12,
              color: "blue",
            },
          ].map(({ label, values, avg, color }) => {
            const max = Math.max(...values, 1);
            return (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-700">{label}</p>
                  <TrendBadge values={values} />
                </div>
                <div className="flex items-end gap-1 h-10">
                  {MONTHS.map((m, i) => {
                    const pct = values[i] / max;
                    return (
                      <div
                        key={m}
                        className={cn(
                          "flex-1 rounded-sm transition-all",
                          color === "emerald" ? "bg-emerald-200" :
                          color === "rose" ? "bg-rose-200" : "bg-blue-200",
                          (i + 1) === currentMonth && year === currentYear
                            ? (color === "emerald" ? "bg-emerald-500" :
                               color === "rose" ? "bg-rose-500" : "bg-blue-500")
                            : ""
                        )}
                        style={{ height: `${Math.max(pct * 100, 4)}%` }}
                        title={`${m}: ${formatCurrency(values[i])}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-slate-400">Jan</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Média: {formatCurrency(avg)}
                  </span>
                  <span className="text-[10px] text-slate-400">Dez</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state hint */}
      {!isLoading && withPlan.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="font-medium text-slate-600">Nenhuma meta para {year}</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">
            Cadastre <a href="/recorrencias" className="text-amber-500 font-semibold hover:underline">Recorrências</a> para preencher automaticamente, ou clique em qualquer célula para definir um valor manualmente.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
