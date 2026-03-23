import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plane, Plus, MapPin, Calendar, DollarSign, Trash2, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const getApiBase = () => import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/[^/]*$/, "");
const apiUrl = (path: string) => `${getApiBase()}/api${path}`;

const STATUS_OPTIONS = [
  { value: "planejando", label: "Planejando", color: "bg-blue-100 text-blue-700" },
  { value: "confirmada", label: "Confirmada", color: "bg-emerald-100 text-emerald-700" },
  { value: "em_andamento", label: "Em andamento", color: "bg-amber-100 text-amber-700" },
  { value: "concluida", label: "Concluída", color: "bg-slate-100 text-slate-600" },
  { value: "cancelada", label: "Cancelada", color: "bg-rose-100 text-rose-700" },
];
function getStatus(val: string) { return STATUS_OPTIONS.find(s => s.value === val) || STATUS_OPTIONS[0]; }
function fmtDate(d: string | null) { if (!d) return ""; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; }
function fmtBRL(v: string | null) { if (!v) return "—"; return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

const DESTINO_EMOJIS: Record<string, string> = {
  "miami": "🌊", "nova york": "🗽", "paris": "🗼", "portugal": "🇵🇹", "japão": "🗾", "italia": "🇮🇹", "cancun": "🏖️", "disney": "🏰", "default": "✈️"
};
function getEmoji(destino: string) {
  const lower = destino.toLowerCase();
  for (const key of Object.keys(DESTINO_EMOJIS)) {
    if (lower.includes(key)) return DESTINO_EMOJIS[key];
  }
  return DESTINO_EMOJIS.default;
}

export default function ViagensPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ destino: "", dataInicio: "", dataFim: "", orcamento: "", status: "planejando", descricao: "" });

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["viagens-trips"],
    queryFn: () => fetch(apiUrl("/viagens/trips")).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => fetch(apiUrl("/viagens/trips"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["viagens-trips"] }); setShowForm(false); setForm({ destino: "", dataInicio: "", dataFim: "", orcamento: "", status: "planejando", descricao: "" }); toast({ title: "Viagem criada!" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/viagens/trips/${id}`), { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["viagens-trips"] }); toast({ title: "Viagem removida" }); },
  });

  const active = trips.filter((t: any) => ["planejando", "confirmada", "em_andamento"].includes(t.status));
  const past = trips.filter((t: any) => ["concluida", "cancelada"].includes(t.status));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Viagens</h1>
            <p className="text-sm text-slate-500 mt-0.5">Planeje e organize suas viagens</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nova Viagem
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Carregando...</div>
        ) : trips.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-slate-200">
            <div className="text-5xl mb-4">✈️</div>
            <p className="text-slate-600 font-semibold text-lg">Nenhuma viagem planejada</p>
            <p className="text-sm text-slate-400 mt-1 mb-6">Comece planejando sua próxima aventura</p>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Planejar viagem
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {active.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Ativas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {active.map((trip: any) => {
                    const st = getStatus(trip.status);
                    const emoji = getEmoji(trip.destino);
                    return (
                      <div
                        key={trip.id}
                        onClick={() => setLocation(`/viagens/${trip.id}`)}
                        className="bg-white rounded-2xl border border-slate-200 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group overflow-hidden"
                      >
                        <div className="h-28 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-5xl">
                          {emoji}
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-bold text-slate-900 text-lg leading-tight">{trip.destino}</h3>
                            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0", st.color)}>{st.label}</span>
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-500">
                            {(trip.dataInicio || trip.dataFim) && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{fmtDate(trip.dataInicio)}{trip.dataFim ? ` → ${fmtDate(trip.dataFim)}` : ""}</span>
                              </div>
                            )}
                            {trip.orcamento && (
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Orçamento: {fmtBRL(trip.orcamento)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <span className="text-xs text-primary font-medium group-hover:underline">Ver detalhes</span>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Passadas</h2>
                <div className="space-y-2">
                  {past.map((trip: any) => {
                    const st = getStatus(trip.status);
                    return (
                      <div
                        key={trip.id}
                        onClick={() => setLocation(`/viagens/${trip.id}`)}
                        className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer group transition-all opacity-70 hover:opacity-100"
                      >
                        <div className="text-2xl">{getEmoji(trip.destino)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900">{trip.destino}</p>
                          <p className="text-xs text-slate-500">{fmtDate(trip.dataInicio)}{trip.dataFim ? ` → ${fmtDate(trip.dataFim)}` : ""}</p>
                        </div>
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", st.color)}>{st.label}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Nova Viagem</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Destino *</label><input value={form.destino} onChange={e => setForm(f => ({ ...f, destino: e.target.value }))} placeholder="Ex: Lisboa, Portugal" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Ida</label><input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Volta</label><input type="date" value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Orçamento (R$)</label><input type="number" value={form.orcamento} onChange={e => setForm(f => ({ ...f, orcamento: e.target.value }))} placeholder="0,00" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">{STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição</label><textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} placeholder="Anotações sobre a viagem..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" /></div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancelar</button>
              <button onClick={() => { if (!form.destino) { toast({ title: "Preencha o destino", variant: "destructive" }); return; } createMutation.mutate({ ...form, orcamento: form.orcamento ? parseFloat(form.orcamento) : null }); }} disabled={createMutation.isPending} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">{createMutation.isPending ? "Salvando..." : "Criar Viagem"}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
