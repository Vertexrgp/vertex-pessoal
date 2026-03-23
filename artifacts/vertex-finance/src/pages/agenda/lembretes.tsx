import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Bell, Plus, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const getApiBase = () => import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/[^/]*$/, "");
const apiUrl = (path: string) => `${getApiBase()}/api${path}`;

function formatDate(d: string) { if (!d) return ""; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; }

export default function LembretesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: "", data: "", horaInicio: "", descricao: "", categoria: "pessoal", alerta: true, lembrete: true });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["agenda-lembretes"],
    queryFn: () => fetch(apiUrl("/agenda/events")).then(r => r.json()),
  });

  const lembretes = events.filter((e: any) => e.alerta || e.lembrete);
  const sortedLembretes = [...lembretes].sort((a: any, b: any) => a.data.localeCompare(b.data));

  const createMutation = useMutation({
    mutationFn: (body: object) => fetch(apiUrl("/agenda/events"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agenda-lembretes"] }); qc.invalidateQueries({ queryKey: ["agenda-events"] }); setShowForm(false); setForm({ titulo: "", data: "", horaInicio: "", descricao: "", categoria: "pessoal", alerta: true, lembrete: true }); toast({ title: "Lembrete criado!" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/agenda/events/${id}`), { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agenda-lembretes"] }); toast({ title: "Lembrete removido" }); },
  });

  const today = new Date().toISOString().split("T")[0];
  const upcoming = sortedLembretes.filter((e: any) => e.data >= today);
  const past = sortedLembretes.filter((e: any) => e.data < today);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lembretes</h1>
            <p className="text-sm text-slate-500 mt-0.5">Alertas e lembretes importantes</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Novo Lembrete
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Carregando...</div>
        ) : sortedLembretes.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <Bell className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">Nenhum lembrete cadastrado</p>
            <p className="text-sm text-slate-400 mt-1">Adicione lembretes de eventos com alerta ativado</p>
          </div>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Próximos</h3>
                <div className="space-y-2">
                  {upcoming.map((e: any) => (
                    <div key={e.id} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-amber-200 bg-amber-50/50 group hover:border-amber-300 transition-colors">
                      <Bell className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">{e.titulo}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDate(e.data)}{e.horaInicio ? ` · ${e.horaInicio}` : ""}</p>
                        {e.descricao && <p className="text-sm text-slate-500 mt-1">{e.descricao}</p>}
                      </div>
                      <button onClick={() => deleteMutation.mutate(e.id)} className="text-slate-200 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Passados</h3>
                <div className="space-y-2">
                  {past.map((e: any) => (
                    <div key={e.id} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-200 opacity-60 group hover:opacity-80 transition-all">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-700 line-through">{e.titulo}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(e.data)}</p>
                      </div>
                      <button onClick={() => deleteMutation.mutate(e.id)} className="text-slate-200 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
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
              <h2 className="font-bold text-slate-900">Novo Lembrete</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Título *</label><input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Tomar medicamento" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Data *</label><input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Hora</label><input type="time" value={form.horaInicio} onChange={e => setForm(f => ({ ...f, horaInicio: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição</label><textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" /></div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancelar</button>
              <button onClick={() => { if (!form.titulo || !form.data) { toast({ title: "Preencha título e data", variant: "destructive" }); return; } createMutation.mutate(form); }} disabled={createMutation.isPending} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">{createMutation.isPending ? "Salvando..." : "Criar Lembrete"}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
