import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Plane, Plus, MapPin, Calendar, DollarSign, X, ChevronRight,
  Globe, Clock, Sparkles, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const getApiBase = () => import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/[^/]*$/, "");
const apiUrl = (path: string) => `${getApiBase()}/api${path}`;

function fmtBRL(v: string | null | number) {
  if (!v) return null;
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: string | null) {
  if (!d) return null;
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function daysBetween(a: string | null, b: string | null) {
  if (!a || !b) return null;
  const diff = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(diff / 86400000) + 1;
}

const STATUS_OPTIONS = [
  { value: "planejando",   label: "Planejando",     color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500" },
  { value: "confirmada",   label: "Confirmada",     color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  { value: "em_andamento", label: "Em andamento",   color: "bg-amber-100 text-amber-700",  dot: "bg-amber-500" },
  { value: "concluida",    label: "Concluída",      color: "bg-slate-100 text-slate-600",  dot: "bg-slate-400" },
  { value: "cancelada",    label: "Cancelada",      color: "bg-rose-100 text-rose-700",    dot: "bg-rose-500" },
];
function getStatus(v: string) { return STATUS_OPTIONS.find(s => s.value === v) ?? STATUS_OPTIONS[0]; }

const DESTINO_GRADIENTS: Record<string, string> = {
  "paris":    "from-rose-400/20 to-pink-500/20",
  "nova york":"from-sky-400/20 to-blue-500/20",
  "miami":    "from-cyan-400/20 to-teal-500/20",
  "japão":    "from-red-400/20 to-rose-500/20",
  "portugal": "from-emerald-400/20 to-green-500/20",
  "italia":   "from-orange-400/20 to-amber-500/20",
  "cancun":   "from-teal-400/20 to-cyan-500/20",
  "disney":   "from-purple-400/20 to-violet-500/20",
  "canadá":   "from-red-400/20 to-slate-500/20",
};
const DESTINO_EMOJI: Record<string, string> = {
  "paris":"🗼","nova york":"🗽","miami":"🌊","japão":"⛩️","portugal":"🇵🇹",
  "italia":"🍕","cancun":"🏖️","disney":"🏰","canadá":"🍁","default":"✈️",
};
function getGradient(d: string) {
  const l = d.toLowerCase();
  for (const k of Object.keys(DESTINO_GRADIENTS)) if (l.includes(k)) return DESTINO_GRADIENTS[k];
  return "from-primary/10 to-primary/5";
}
function getEmoji(d: string) {
  const l = d.toLowerCase();
  for (const k of Object.keys(DESTINO_EMOJI)) if (l.includes(k)) return DESTINO_EMOJI[k];
  return DESTINO_EMOJI.default;
}

const BLANK = { destino: "", dataInicio: "", dataFim: "", orcamento: "", status: "planejando", descricao: "", pais: "", cidade: "" };

export default function ViagensPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, nav] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["viagens-trips"],
    queryFn: () => fetch(apiUrl("/viagens/trips")).then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (body: object) =>
      fetch(apiUrl("/viagens/trips"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["viagens-trips"] }); setShowForm(false); setForm(BLANK); toast({ title: "Viagem criada!" }); },
  });

  const active  = trips.filter((t: any) => ["planejando","confirmada","em_andamento"].includes(t.status));
  const past    = trips.filter((t: any) => ["concluida","cancelada"].includes(t.status));

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Plane className="w-5 h-5 text-orange-500" />
            <h1 className="text-2xl font-display font-bold text-slate-900">Viagens</h1>
          </div>
          <p className="text-sm text-slate-500">Planeje, organize e registre cada aventura</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nova Viagem
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 bg-white rounded-2xl border border-slate-200 border-dashed">
          <div className="text-6xl mb-4">✈️</div>
          <h2 className="text-lg font-bold text-slate-700 mb-1">Nenhuma viagem ainda</h2>
          <p className="text-sm text-slate-400 mb-6 text-center max-w-xs">Comece planejando sua próxima aventura — roteiro, lugares, despesas e memórias</p>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Planejar viagem
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Active trips */}
          {active.length > 0 && (
            <section>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Ativas · {active.length}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {active.map((trip: any) => <TripCard key={trip.id} trip={trip} onClick={() => nav(`/viagens/${trip.id}`)} />)}
              </div>
            </section>
          )}

          {/* Past trips */}
          {past.length > 0 && (
            <section>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Passadas · {past.length}</h2>
              <div className="space-y-2">
                {past.map((trip: any) => {
                  const st = getStatus(trip.status);
                  return (
                    <div
                      key={trip.id}
                      onClick={() => nav(`/viagens/${trip.id}`)}
                      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer group transition-all opacity-70 hover:opacity-100"
                    >
                      <span className="text-2xl">{getEmoji(trip.destino)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900">{trip.destino}</p>
                        <p className="text-xs text-slate-500">
                          {fmtDate(trip.dataInicio)}{trip.dataFim ? ` → ${fmtDate(trip.dataFim)}` : ""}
                        </p>
                      </div>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", st.color)}>{st.label}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* New trip modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-lg">✈️ Nova Viagem</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Destino *</label>
                <input value={form.destino} onChange={e => setForm(f => ({ ...f, destino: e.target.value }))} placeholder="Ex: Lisboa, Portugal" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">País</label>
                  <input value={form.pais} onChange={e => setForm(f => ({ ...f, pais: e.target.value }))} placeholder="Ex: Portugal" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cidade</label>
                  <input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} placeholder="Ex: Lisboa" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de ida</label>
                  <input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de volta</label>
                  <input type="date" value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Orçamento (R$)</label>
                  <input type="number" value={form.orcamento} onChange={e => setForm(f => ({ ...f, orcamento: e.target.value }))} placeholder="0,00" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição / Notas</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} placeholder="Motivação, expectativas..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancelar</button>
              <button
                onClick={() => {
                  if (!form.destino) { toast({ title: "Preencha o destino", variant: "destructive" }); return; }
                  create.mutate({ ...form, orcamento: form.orcamento ? parseFloat(form.orcamento) : null });
                }}
                disabled={create.isPending}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {create.isPending ? "Criando..." : "Criar Viagem"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function TripCard({ trip, onClick }: { trip: any; onClick: () => void }) {
  const st = getStatus(trip.status);
  const emoji = getEmoji(trip.destino);
  const gradient = getGradient(trip.destino);
  const dias = daysBetween(trip.dataInicio, trip.dataFim);
  const totalGasto = 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
    >
      {/* Cover */}
      <div className={cn("h-32 bg-gradient-to-br flex items-center justify-center relative", gradient)}>
        <span className="text-5xl">{emoji}</span>
        <span className={cn("absolute top-3 right-3 text-[10px] font-semibold px-2 py-1 rounded-full", st.color)}>
          {st.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-slate-900 mb-3 leading-tight">{trip.destino}</h3>

        <div className="space-y-2 text-xs text-slate-500 mb-4">
          {(trip.dataInicio || trip.dataFim) && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
              <span>
                {fmtDate(trip.dataInicio)}{trip.dataFim ? ` → ${fmtDate(trip.dataFim)}` : ""}
                {dias && <span className="ml-1.5 text-primary font-medium">({dias}d)</span>}
              </span>
            </div>
          )}
          {trip.orcamento && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
              <span>Orçamento: <strong className="text-slate-700">{fmtBRL(trip.orcamento)}</strong></span>
            </div>
          )}
          {trip.pais && (
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
              <span>{trip.cidade ? `${trip.cidade}, ` : ""}{trip.pais}</span>
            </div>
          )}
        </div>

        {trip.descricao && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-4">{trip.descricao}</p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-primary font-semibold group-hover:underline">Ver planejamento</span>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </div>
  );
}
