import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  ArrowLeft, Save, MapPin, DollarSign, Briefcase, FileText,
  Star, ThumbsUp, ThumbsDown, AlertTriangle, HelpCircle,
  TrendingUp, Shield, Heart, Car, Sun, Users, GraduationCap,
  Globe, Plus, X, Loader2, CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getApiBase } from "@/lib/api-base";

const apiUrl = (path: string) => `${getApiBase()}/api${path}`;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CustoVida { aluguel: number; condominio: number; energiaGas: number; internetCelular: number; mercado: number; alimentacaoFora: number; transporte: number; saude: number; academia: number; lazer: number; impostos: number; custosExtras: number; alimentacao: number; outros: number; }
interface Trabalho { rendaRafael: number | null; rendaFernanda: number | null; rendaFamiliar: number | null; faixaConservadora: number | null; faixaProvavel: number | null; faixaOtimista: number | null; demandaArea: string | null; exigenciaIdioma: string | null; validacaoProfissional: string | null; facilidadeRecolocacao: number | null; observacoes: string | null; }
interface Visto { tipoVisto: string | null; dificuldadeEstudo: number | null; dificuldadeTrabalho: number | null; dificuldadePermanente: number | null; tempoEstimado: string | null; custoProcesso: number | null; necessidadeJobOffer: boolean; exigenciaIdioma: string | null; observacoes: string | null; notaViabilidade: number | null; }
interface Qualidade { seguranca: number | null; saude: number | null; transportePublico: number | null; clima: number | null; comunidadeBrasileira: number | null; adaptacao: number | null; qualidadeFamilia: number | null; qualidadeCarreira: number | null; potencialFinanceiro: number | null; observacoes: string | null; }
interface ProContra { id: number; tipo: string; descricao: string; }
interface Cidade { id: number; projetoId: number; nome: string; pais: string; estado: string | null; moeda: string; idiomasPrincipais: string | null; fusoHorario: string | null; clima: string | null; qualidadeVida: number | null; facilidadeAdaptacao: number | null; observacoes: string | null; prioridade: number; custoVida: CustoVida | null; trabalho: Trabalho | null; visto: Visto | null; qualidade: Qualidade | null; prosContras: ProContra[]; }

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined, moeda = "USD") => {
  if (!v) return "—";
  try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda, maximumFractionDigits: 0 }).format(v); }
  catch { return `${moeda} ${(v || 0).toFixed(0)}`; }
};

const totalCusto = (c: CustoVida | null) => !c ? 0 : Object.values(c).reduce((a: number, v) => a + (typeof v === "number" ? v : 0), 0);

function ScoreBar({ value, max = 10, color = "bg-primary" }: { value: number | null; max?: number; color?: string }) {
  const pct = value ? (value / max) * 100 : 0;
  const getColor = (v: number | null) => {
    if (!v) return "bg-slate-200";
    if (v >= 7) return "bg-emerald-400";
    if (v >= 5) return "bg-amber-400";
    return "bg-rose-400";
  };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", getColor(value))} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-xs font-bold w-6 text-right", !value ? "text-slate-300" : value >= 7 ? "text-emerald-600" : value >= 5 ? "text-amber-600" : "text-rose-600")}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function ScoreInput({ value, onChange, label }: { value: number | null; onChange: (v: number | null) => void; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-500">{label}</label>
        <span className={cn("text-xs font-bold", !value ? "text-slate-300" : value >= 7 ? "text-emerald-600" : value >= 5 ? "text-amber-600" : "text-rose-600")}>{value ?? "—"}/10</span>
      </div>
      <div className="flex gap-1">
        {[1,2,3,4,5,6,7,8,9,10].map((i) => (
          <button key={i} onClick={() => onChange(value === i ? null : i)}
            className={cn("flex-1 h-5 rounded transition-colors text-[10px] font-bold", (value || 0) >= i ? (i >= 7 ? "bg-emerald-400 text-white" : i >= 5 ? "bg-amber-400 text-white" : "bg-rose-400 text-white") : "bg-slate-100 hover:bg-slate-200 text-slate-400")}
          >{i}</button>
        ))}
      </div>
    </div>
  );
}

function SaveBtn({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={saving}
      className={cn("flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all", saved ? "bg-emerald-100 text-emerald-700" : "bg-primary text-white hover:bg-primary/90")}
    >
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
      {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
    </button>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white";
const textareaCls = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none";

// ─── Tab: Geral ───────────────────────────────────────────────────────────────

function TabGeral({ cidade, cidadeId, moeda }: { cidade: Cidade; cidadeId: number; moeda: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    nome: cidade.nome, pais: cidade.pais, estado: cidade.estado || "",
    moeda: cidade.moeda, idiomasPrincipais: cidade.idiomasPrincipais || "",
    fusoHorario: cidade.fusoHorario || "", clima: cidade.clima || "",
    qualidadeVida: cidade.qualidadeVida, facilidadeAdaptacao: cidade.facilidadeAdaptacao,
    observacoes: cidade.observacoes || "", prioridade: cidade.prioridade,
  });

  const save = async () => {
    setSaving(true);
    await fetch(apiUrl(`/vida/cidades/${cidadeId}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    qc.invalidateQueries({ queryKey: ["vida-cidade", cidadeId] });
    qc.invalidateQueries({ queryKey: ["vida-projeto", cidade.projetoId] });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
    toast({ title: "Dados gerais salvos!" });
  };

  const MOEDAS = ["USD","EUR","GBP","BRL","CAD","AUD","CHF","MXN","ARS","CLP","COP","PEN","NZD","SGD"];
  const PRIORIDADES = [{ v: 0, label: "Normal" }, { v: 1, label: "Alta" }, { v: 2, label: "Prioritária" }];

  return (
    <div className="space-y-5">
      <div className="flex justify-end"><SaveBtn saving={saving} saved={saved} onClick={save} /></div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Cidade">
          <input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} className={inputCls} />
        </Field>
        <Field label="País">
          <input value={form.pais} onChange={(e) => setForm((p) => ({ ...p, pais: e.target.value }))} className={inputCls} />
        </Field>
        <Field label="Estado / Província">
          <input value={form.estado} onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))} placeholder="Ex: Ontario, California..." className={inputCls} />
        </Field>
        <Field label="Moeda local">
          <select value={form.moeda} onChange={(e) => setForm((p) => ({ ...p, moeda: e.target.value }))} className={inputCls}>
            {MOEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Idiomas principais">
          <input value={form.idiomasPrincipais} onChange={(e) => setForm((p) => ({ ...p, idiomasPrincipais: e.target.value }))} placeholder="Ex: Inglês, Francês..." className={inputCls} />
        </Field>
        <Field label="Fuso horário">
          <input value={form.fusoHorario} onChange={(e) => setForm((p) => ({ ...p, fusoHorario: e.target.value }))} placeholder="Ex: UTC-5 (EST)" className={inputCls} />
        </Field>
        <Field label="Clima">
          <input value={form.clima} onChange={(e) => setForm((p) => ({ ...p, clima: e.target.value }))} placeholder="Ex: Temperado, frio no inverno..." className={inputCls} />
        </Field>
        <Field label="Prioridade">
          <select value={form.prioridade} onChange={(e) => setForm((p) => ({ ...p, prioridade: parseInt(e.target.value) }))} className={inputCls}>
            {PRIORIDADES.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <ScoreInput value={form.qualidadeVida} onChange={(v) => setForm((p) => ({ ...p, qualidadeVida: v }))} label="Qualidade de vida geral (1-10)" />
        </div>
        <div>
          <ScoreInput value={form.facilidadeAdaptacao} onChange={(v) => setForm((p) => ({ ...p, facilidadeAdaptacao: v }))} label="Facilidade de adaptação (1-10)" />
        </div>
      </div>

      <Field label="Observações gerais">
        <textarea value={form.observacoes} onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))} rows={3} className={textareaCls} placeholder="Anotações livres sobre esta cidade..." />
      </Field>
    </div>
  );
}

// ─── Tab: Custo de Vida ────────────────────────────────────────────────────────

const CUSTO_GROUPS = [
  {
    label: "🏠 Moradia",
    fields: [
      { key: "aluguel", label: "Aluguel" },
      { key: "condominio", label: "Condomínio / HOA" },
      { key: "energiaGas", label: "Energia / Gás" },
      { key: "internetCelular", label: "Internet / Celular" },
    ],
  },
  {
    label: "🍽️ Alimentação",
    fields: [
      { key: "mercado", label: "Supermercado" },
      { key: "alimentacaoFora", label: "Restaurantes / Delivery" },
    ],
  },
  {
    label: "🚗 Mobilidade & Saúde",
    fields: [
      { key: "transporte", label: "Transporte" },
      { key: "saude", label: "Saúde / Seguro" },
      { key: "academia", label: "Academia / Bem-estar" },
    ],
  },
  {
    label: "💡 Outros",
    fields: [
      { key: "lazer", label: "Lazer / Entretenimento" },
      { key: "impostos", label: "Impostos estimados" },
      { key: "custosExtras", label: "Imprevistos / Extras" },
    ],
  },
] as const;

type CustoKey = "aluguel" | "condominio" | "energiaGas" | "internetCelular" | "mercado" | "alimentacaoFora" | "transporte" | "saude" | "academia" | "lazer" | "impostos" | "custosExtras" | "alimentacao" | "outros";

function TabCustoVida({ cidade, cidadeId }: { cidade: Cidade; cidadeId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const cv = cidade.custoVida;
  const [form, setForm] = useState<Record<CustoKey, string>>({
    aluguel: String(cv?.aluguel || 0), condominio: String(cv?.condominio || 0),
    energiaGas: String(cv?.energiaGas || 0), internetCelular: String(cv?.internetCelular || 0),
    mercado: String(cv?.mercado || 0), alimentacaoFora: String(cv?.alimentacaoFora || 0),
    transporte: String(cv?.transporte || 0), saude: String(cv?.saude || 0),
    academia: String(cv?.academia || 0), lazer: String(cv?.lazer || 0),
    impostos: String(cv?.impostos || 0), custosExtras: String(cv?.custosExtras || 0),
    alimentacao: String(cv?.alimentacao || 0), outros: String(cv?.outros || 0),
  });

  const total = Object.values(form).reduce((a, v) => a + (parseFloat(v) || 0), 0);

  const save = async () => {
    setSaving(true);
    const data = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, parseFloat(v) || 0]));
    await fetch(apiUrl(`/vida/cidades/${cidadeId}/custo-vida`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    qc.invalidateQueries({ queryKey: ["vida-cidade", cidadeId] });
    qc.invalidateQueries({ queryKey: ["vida-projeto", cidade.projetoId] });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
    toast({ title: "Custo de vida atualizado!" });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="bg-slate-900 text-white rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">TOTAL MENSAL</span>
          <span className="text-xl font-bold">{fmt(total, cidade.moeda)}</span>
          <span className="text-xs text-slate-400">({fmt(total * 12, cidade.moeda)}/ano)</span>
        </div>
        <SaveBtn saving={saving} saved={saved} onClick={save} />
      </div>

      {CUSTO_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-bold text-slate-600 mb-2">{group.label}</p>
          <div className="grid grid-cols-2 gap-3">
            {group.fields.map((f) => (
              <Field key={f.key} label={f.label}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">{cidade.moeda}</span>
                  <input
                    type="number"
                    value={form[f.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-right"
                    placeholder="0"
                  />
                </div>
              </Field>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Trabalho & Renda ────────────────────────────────────────────────────

function TabTrabalho({ cidade, cidadeId }: { cidade: Cidade; cidadeId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const t = cidade.trabalho;
  const [form, setForm] = useState({
    rendaRafael: String(t?.rendaRafael || ""), rendaFernanda: String(t?.rendaFernanda || ""),
    rendaFamiliar: String(t?.rendaFamiliar || ""), faixaConservadora: String(t?.faixaConservadora || ""),
    faixaProvavel: String(t?.faixaProvavel || ""), faixaOtimista: String(t?.faixaOtimista || ""),
    demandaArea: t?.demandaArea || "", exigenciaIdioma: t?.exigenciaIdioma || "",
    validacaoProfissional: t?.validacaoProfissional || "",
    facilidadeRecolocacao: t?.facilidadeRecolocacao ?? null as number | null,
    observacoes: t?.observacoes || "",
  });

  const rendaFamiliar = (parseFloat(form.rendaRafael) || 0) + (parseFloat(form.rendaFernanda) || 0);
  const custoDelta = (parseFloat(form.faixaProvavel) || 0) - (cidade.custoVida ? Object.values(cidade.custoVida).reduce((a, v) => a + (typeof v === "number" ? v : 0), 0) : 0);

  const save = async () => {
    setSaving(true);
    await fetch(apiUrl(`/vida/cidades/${cidadeId}/trabalho`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, rendaFamiliar: rendaFamiliar || form.rendaFamiliar }) });
    qc.invalidateQueries({ queryKey: ["vida-cidade", cidadeId] });
    qc.invalidateQueries({ queryKey: ["vida-projeto", cidade.projetoId] });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
    toast({ title: "Dados de trabalho salvos!" });
  };

  const DEMANDA = ["Alta", "Média", "Baixa", "Incerta"];
  const IDIOMA = ["Não exige", "Básico", "Intermediário", "Avançado", "Fluente"];
  const VALIDACAO = ["Não exige", "Recomendada", "Necessária", "Obrigatória"];

  return (
    <div className="space-y-5">
      <div className="flex justify-end"><SaveBtn saving={saving} saved={saved} onClick={save} /></div>

      {/* Renda individual */}
      <div>
        <p className="text-xs font-bold text-slate-600 mb-2">💰 Renda Individual Estimada</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Renda estimada — Rafael">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{cidade.moeda}</span>
              <input type="number" value={form.rendaRafael} onChange={(e) => setForm((p) => ({ ...p, rendaRafael: e.target.value }))} className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-right" placeholder="0" />
            </div>
          </Field>
          <Field label="Renda estimada — Fernanda">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{cidade.moeda}</span>
              <input type="number" value={form.rendaFernanda} onChange={(e) => setForm((p) => ({ ...p, rendaFernanda: e.target.value }))} className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-right" placeholder="0" />
            </div>
          </Field>
        </div>
        {(parseFloat(form.rendaRafael) || parseFloat(form.rendaFernanda)) ? (
          <div className="mt-2 flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
            <span className="text-xs text-slate-500">Renda familiar combinada:</span>
            <span className="text-sm font-bold text-slate-800">{fmt(rendaFamiliar, cidade.moeda)}/mês</span>
          </div>
        ) : null}
      </div>

      {/* Faixas */}
      <div>
        <p className="text-xs font-bold text-slate-600 mb-2">📊 Faixas de Renda</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: "faixaConservadora", label: "Conservadora", color: "border-rose-200 bg-rose-50/50" },
            { key: "faixaProvavel", label: "Provável", color: "border-blue-200 bg-blue-50/50" },
            { key: "faixaOtimista", label: "Otimista", color: "border-emerald-200 bg-emerald-50/50" },
          ].map((f) => (
            <div key={f.key} className={cn("border rounded-xl p-3", f.color)}>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">{f.label}</p>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">{cidade.moeda}</span>
                <input type="number" value={form[f.key as keyof typeof form] as string} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-right" placeholder="0" />
              </div>
            </div>
          ))}
        </div>

        {/* Saldo com faixa provável */}
        {parseFloat(form.faixaProvavel) > 0 && cidade.custoVida && (
          <div className={cn("mt-2 p-3 rounded-xl border", custoDelta >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Saldo mensal estimado (faixa provável)</span>
              <span className={cn("text-sm font-bold", custoDelta >= 0 ? "text-emerald-700" : "text-rose-700")}>
                {custoDelta >= 0 ? "+" : ""}{fmt(custoDelta, cidade.moeda)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Qualitative */}
      <div>
        <p className="text-xs font-bold text-slate-600 mb-2">📋 Análise Qualitativa</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Demanda para a área">
            <select value={form.demandaArea} onChange={(e) => setForm((p) => ({ ...p, demandaArea: e.target.value }))} className={inputCls}>
              <option value="">Selecionar...</option>
              {DEMANDA.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Exigência de idioma">
            <select value={form.exigenciaIdioma} onChange={(e) => setForm((p) => ({ ...p, exigenciaIdioma: e.target.value }))} className={inputCls}>
              <option value="">Selecionar...</option>
              {IDIOMA.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Validação profissional">
            <select value={form.validacaoProfissional} onChange={(e) => setForm((p) => ({ ...p, validacaoProfissional: e.target.value }))} className={inputCls}>
              <option value="">Selecionar...</option>
              {VALIDACAO.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <div>
            <ScoreInput value={form.facilidadeRecolocacao} onChange={(v) => setForm((p) => ({ ...p, facilidadeRecolocacao: v }))} label="Facilidade de recolocação (1-10)" />
          </div>
        </div>
        <div className="mt-3">
          <Field label="Observações">
            <textarea value={form.observacoes} onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))} rows={3} className={textareaCls} placeholder="Notas sobre mercado de trabalho, oportunidades, desafios..." />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Visto & Imigração ────────────────────────────────────────────────────

function TabVisto({ cidade, cidadeId }: { cidade: Cidade; cidadeId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const v = cidade.visto;
  const [form, setForm] = useState({
    tipoVisto: v?.tipoVisto || "",
    dificuldadeEstudo: v?.dificuldadeEstudo ?? null as number | null,
    dificuldadeTrabalho: v?.dificuldadeTrabalho ?? null as number | null,
    dificuldadePermanente: v?.dificuldadePermanente ?? null as number | null,
    tempoEstimado: v?.tempoEstimado || "",
    custoProcesso: String(v?.custoProcesso || ""),
    necessidadeJobOffer: v?.necessidadeJobOffer ?? false,
    exigenciaIdioma: v?.exigenciaIdioma || "",
    observacoes: v?.observacoes || "",
    notaViabilidade: v?.notaViabilidade ?? null as number | null,
  });

  const save = async () => {
    setSaving(true);
    await fetch(apiUrl(`/vida/cidades/${cidadeId}/visto`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    qc.invalidateQueries({ queryKey: ["vida-cidade", cidadeId] });
    qc.invalidateQueries({ queryKey: ["vida-projeto", cidade.projetoId] });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
    toast({ title: "Dados de visto salvos!" });
  };

  const TIPOS_VISTO = ["Turista/Visitante", "Estudante", "Trabalho (H-1B)", "Trabalho (TN)", "Permanência (Green Card)", "Investidor (EB-5)", "Cônjuge/Família", "Nômade Digital", "Outro"];
  const IDIOMA_REQ = ["Não exige", "Básico", "Intermediário", "Avançado", "Fluente (IELTS/TOEFL)"];

  return (
    <div className="space-y-5">
      <div className="flex justify-end"><SaveBtn saving={saving} saved={saved} onClick={save} /></div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo de visto mais provável" className="col-span-2">
          <select value={form.tipoVisto} onChange={(e) => setForm((p) => ({ ...p, tipoVisto: e.target.value }))} className={inputCls}>
            <option value="">Selecionar tipo...</option>
            {TIPOS_VISTO.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Tempo estimado do processo">
          <input value={form.tempoEstimado} onChange={(e) => setForm((p) => ({ ...p, tempoEstimado: e.target.value }))} placeholder="Ex: 6-12 meses" className={inputCls} />
        </Field>
        <Field label={`Custo do processo (${cidade.moeda})`}>
          <input type="number" value={form.custoProcesso} onChange={(e) => setForm((p) => ({ ...p, custoProcesso: e.target.value }))} className={inputCls} placeholder="0" />
        </Field>
        <Field label="Exigência de idioma">
          <select value={form.exigenciaIdioma} onChange={(e) => setForm((p) => ({ ...p, exigenciaIdioma: e.target.value }))} className={inputCls}>
            <option value="">Selecionar...</option>
            {IDIOMA_REQ.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Job offer necessário?">
          <div className="flex items-center gap-3 mt-2">
            {[true, false].map((v) => (
              <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={form.necessidadeJobOffer === v} onChange={() => setForm((p) => ({ ...p, necessidadeJobOffer: v }))} className="accent-primary" />
                <span className="text-sm text-slate-700">{v ? "Sim" : "Não"}</span>
              </label>
            ))}
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { key: "dificuldadeEstudo", label: "Dificuldade — Estudante" },
          { key: "dificuldadeTrabalho", label: "Dificuldade — Trabalho" },
          { key: "dificuldadePermanente", label: "Dificuldade — Permanente" },
        ].map((f) => (
          <div key={f.key}>
            <ScoreInput
              value={form[f.key as keyof typeof form] as number | null}
              onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
              label={f.label}
            />
            <p className="text-[10px] text-slate-400 mt-0.5">1=fácil, 10=difícil</p>
          </div>
        ))}
      </div>

      <div>
        <ScoreInput value={form.notaViabilidade} onChange={(v) => setForm((p) => ({ ...p, notaViabilidade: v }))} label="Nota geral de viabilidade migratória (1-10)" />
        <p className="text-[10px] text-slate-400 mt-0.5">10 = muito viável; 1 = praticamente inviável</p>
      </div>

      <Field label="Observações">
        <textarea value={form.observacoes} onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))} rows={3} className={textareaCls} placeholder="Notas sobre processo de imigração, advogados, experiências..." />
      </Field>
    </div>
  );
}

// ─── Tab: Qualidade de Vida ────────────────────────────────────────────────────

const QDV_FIELDS = [
  { key: "seguranca", label: "Segurança", icon: Shield, desc: "Índice de criminalidade, segurança pública" },
  { key: "saude", label: "Saúde", icon: Heart, desc: "Sistema de saúde, hospitais, cobertura" },
  { key: "transportePublico", label: "Transporte público", icon: Car, desc: "Qualidade do transporte urbano" },
  { key: "clima", label: "Clima", icon: Sun, desc: "Temperatura, estações, conforto climático" },
  { key: "comunidadeBrasileira", label: "Comunidade brasileira", icon: Users, desc: "Presença e suporte de brasileiros" },
  { key: "adaptacao", label: "Adaptação cultural", icon: Globe, desc: "Facilidade de adaptação ao estilo de vida" },
  { key: "qualidadeFamilia", label: "Qualidade para família", icon: Heart, desc: "Escolas, espaços, vida familiar" },
  { key: "qualidadeCarreira", label: "Qualidade para carreira", icon: GraduationCap, desc: "Oportunidades, networking, crescimento" },
  { key: "potencialFinanceiro", label: "Potencial financeiro futuro", icon: TrendingUp, desc: "Perspectivas de renda, investimento, poupança" },
] as const;

function TabQualidade({ cidade, cidadeId }: { cidade: Cidade; cidadeId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const q = cidade.qualidade;
  const [form, setForm] = useState<{ [K in typeof QDV_FIELDS[number]["key"]]: number | null } & { observacoes: string }>({
    seguranca: q?.seguranca ?? null, saude: q?.saude ?? null, transportePublico: q?.transportePublico ?? null,
    clima: q?.clima ?? null, comunidadeBrasileira: q?.comunidadeBrasileira ?? null, adaptacao: q?.adaptacao ?? null,
    qualidadeFamilia: q?.qualidadeFamilia ?? null, qualidadeCarreira: q?.qualidadeCarreira ?? null,
    potencialFinanceiro: q?.potencialFinanceiro ?? null, observacoes: q?.observacoes || "",
  });

  const scores = QDV_FIELDS.map((f) => form[f.key]).filter(Boolean) as number[];
  const mediaGeral = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;

  const save = async () => {
    setSaving(true);
    await fetch(apiUrl(`/vida/cidades/${cidadeId}/qualidade`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    qc.invalidateQueries({ queryKey: ["vida-cidade", cidadeId] });
    qc.invalidateQueries({ queryKey: ["vida-projeto", cidade.projetoId] });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
    toast({ title: "Qualidade de vida salva!" });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        {mediaGeral && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-500">Média geral:</span>
            <span className="text-sm font-bold text-slate-800">{mediaGeral}/10</span>
          </div>
        )}
        <div className="ml-auto"><SaveBtn saving={saving} saved={saved} onClick={save} /></div>
      </div>

      <div className="space-y-4">
        {QDV_FIELDS.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.key} className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-semibold text-slate-700">{f.label}</p>
                </div>
                <p className="text-xs text-slate-400 mb-2">{f.desc}</p>
                <ScoreInput value={form[f.key]} onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))} label="" />
              </div>
            </div>
          );
        })}
      </div>

      <Field label="Observações gerais de qualidade de vida">
        <textarea value={form.observacoes} onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))} rows={3} className={textareaCls} placeholder="Impressões gerais sobre qualidade de vida nesta cidade..." />
      </Field>
    </div>
  );
}

// ─── Tab: Prós, Contras & Riscos ──────────────────────────────────────────────

function TabProsRiscos({ cidade, cidadeId }: { cidade: Cidade; cidadeId: number }) {
  const qc = useQueryClient();
  const [inputs, setInputs] = useState<Record<string, string>>({ pro: "", contra: "", risco: "", duvida: "" });

  const addPC = useMutation({
    mutationFn: ({ tipo, descricao }: { tipo: string; descricao: string }) =>
      fetch(apiUrl(`/vida/cidades/${cidadeId}/pros-contras`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, descricao }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vida-cidade", cidadeId] }),
  });

  const deletePC = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/vida/pros-contras/${id}`), { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vida-cidade", cidadeId] }),
  });

  const SECTIONS = [
    { tipo: "pro", label: "✅ Pontos Positivos", color: "text-emerald-700", dotColor: "bg-emerald-400", placeholder: "Ex: custo de vida acessível, comunidade forte..." },
    { tipo: "contra", label: "❌ Pontos Negativos", color: "text-rose-700", dotColor: "bg-rose-400", placeholder: "Ex: inverno rigoroso, alto custo inicial..." },
    { tipo: "risco", label: "⚠️ Riscos", color: "text-amber-700", dotColor: "bg-amber-400", placeholder: "Ex: instabilidade econômica, dificuldade de visto..." },
    { tipo: "duvida", label: "❓ Dúvidas em Aberto", color: "text-blue-700", dotColor: "bg-blue-400", placeholder: "Ex: como funciona o sistema de saúde?" },
  ];

  return (
    <div className="space-y-4">
      {SECTIONS.map((s) => {
        const items = cidade.prosContras.filter((p) => p.tipo === s.tipo);
        return (
          <div key={s.tipo} className="bg-white border border-slate-100 rounded-2xl p-4">
            <h3 className={cn("text-xs font-bold mb-3", s.color)}>{s.label}</h3>
            <div className="space-y-1.5 mb-3 min-h-[24px]">
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-2 group">
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", s.dotColor)} />
                  <span className="text-sm text-slate-700 flex-1">{item.descricao}</span>
                  <button onClick={() => deletePC.mutate(item.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-rose-500 transition-all flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {items.length === 0 && <p className="text-xs text-slate-300 italic">Nenhum item ainda</p>}
            </div>
            <div className="flex gap-2">
              <input
                value={inputs[s.tipo]}
                onChange={(e) => setInputs((p) => ({ ...p, [s.tipo]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inputs[s.tipo].trim()) {
                    addPC.mutate({ tipo: s.tipo, descricao: inputs[s.tipo] });
                    setInputs((p) => ({ ...p, [s.tipo]: "" }));
                  }
                }}
                placeholder={s.placeholder}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={() => { if (inputs[s.tipo].trim()) { addPC.mutate({ tipo: s.tipo, descricao: inputs[s.tipo] }); setInputs((p) => ({ ...p, [s.tipo]: "" })); } }}
                className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "geral", label: "Geral", icon: MapPin },
  { id: "custo", label: "Custo de Vida", icon: DollarSign },
  { id: "trabalho", label: "Trabalho & Renda", icon: Briefcase },
  { id: "visto", label: "Visto & Imigração", icon: FileText },
  { id: "qualidade", label: "Qualidade de Vida", icon: Star },
  { id: "pros", label: "Prós & Riscos", icon: ThumbsUp },
];

export default function CidadeDetalhePage() {
  const [, params] = useRoute("/vida/:projetoId/cidades/:cidadeId");
  const projetoId = parseInt(params?.projetoId || "0");
  const cidadeId = parseInt(params?.cidadeId || "0");
  const [tab, setTab] = useState("geral");

  const { data: cidade, isLoading } = useQuery<Cidade>({
    queryKey: ["vida-cidade", cidadeId],
    queryFn: () => fetch(apiUrl(`/vida/cidades/${cidadeId}`)).then((r) => r.json()),
    enabled: !!cidadeId,
  });

  if (isLoading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
      </div>
    </AppLayout>
  );

  if (!cidade) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64 text-slate-400">Cidade não encontrada</div>
    </AppLayout>
  );

  const custo = totalCusto(cidade.custoVida);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link href={`/vida/${projetoId}`}>
            <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors font-medium">
              <ArrowLeft className="w-4 h-4" /> Voltar ao projeto
            </button>
          </Link>
          <span className="text-slate-200">/</span>
          <span className="text-sm text-slate-700 font-medium">{cidade.nome}, {cidade.pais}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{cidade.nome}{cidade.estado ? `, ${cidade.estado}` : ""}</h1>
                <p className="text-sm text-slate-400">{cidade.pais} · {cidade.moeda}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 ml-12 text-xs text-slate-400">
              {custo > 0 && <span className="text-slate-600 font-semibold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: cidade.moeda, maximumFractionDigits: 0 }).format(custo)}/mês</span>}
              {cidade.qualidadeVida && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" />{cidade.qualidadeVida}/10</span>}
              {cidade.visto?.notaViabilidade && <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-blue-400" />Visto {cidade.visto.notaViabilidade}/10</span>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-2xl p-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all", tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          {tab === "geral" && <TabGeral cidade={cidade} cidadeId={cidadeId} moeda={cidade.moeda} />}
          {tab === "custo" && <TabCustoVida cidade={cidade} cidadeId={cidadeId} />}
          {tab === "trabalho" && <TabTrabalho cidade={cidade} cidadeId={cidadeId} />}
          {tab === "visto" && <TabVisto cidade={cidade} cidadeId={cidadeId} />}
          {tab === "qualidade" && <TabQualidade cidade={cidade} cidadeId={cidadeId} />}
          {tab === "pros" && <TabProsRiscos cidade={cidade} cidadeId={cidadeId} />}
        </div>
      </div>
    </AppLayout>
  );
}
