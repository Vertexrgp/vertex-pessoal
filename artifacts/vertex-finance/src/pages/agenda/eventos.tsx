import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { CalendarDays, Plus, Trash2, Clock, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const getApiBase = () => import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/[^/]*$/, "");
const apiUrl = (path: string) => `${getApiBase()}/api${path}`;

const CATEGORIAS = [
  { value: "saude", label: "Saúde", color: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  { value: "trabalho", label: "Trabalho", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  { value: "pessoal", label: "Pessoal", color: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  { value: "financeiro", label: "Financeiro", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  { value: "viagem", label: "Viagem", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  { value: "outros", label: "Outros", color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
];
function getCat(val: string) { return CATEGORIAS.find(c => c.value === val) || CATEGORIAS[5]; }
function formatDate(d: string) { if (!d) return ""; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; }

export default function EventosPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filterCat, setFilterCat] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: "", data: "", horaInicio: "", horaFim: "", descricao: "", categoria: "pessoal", alerta: false });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["agenda-events-all"],
    queryFn: () => fetch(apiUrl("/agenda/events")).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => fetch(apiUrl("/agenda/events"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agenda-events-all"] }); qc.invalidateQueries({ queryKey: ["agenda-events"] }); setShowForm(false); setForm({ titulo: "", data: "", horaInicio: "", horaFim: "", descricao: "", categoria: "pessoal", alerta: false }); toast({ title: "Evento criado!" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(apiUrl(`/agenda/events/${id}`), { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agenda-events-all"] }); qc.invalidateQueries({ queryKey: ["agenda-events"] }); toast({ title: "Evento removido" }); },
  });

  const filtered = filterCat === "todos" ? events : events.filter((e: any) => e.categoria === filterCat);
  const sorted = [...filtered].sort((a: any, b: any) => a.data.localeCompare(b.data));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Eventos</h1>
            <p className="text-sm text-slate-500 mt-0.5">Lista completa de eventos cadastrados</p>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Novo Evento
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterCat("todos")} className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors", filterCat === "todos" ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-600 hover:border-slate-300")}>Todos</button>
          {CATEGORIAS.map(c => (
            <button key={c.value} onClick={() => setFilterCat(c.value)} className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors", filterCat === c.value ? cn(c.color, "border-transparent") : "border-slate-200 text-slate-600 hover:border-slate-300")}>
              {c.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Carregando...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">Nenhum evento encontrado</p>
            <p className="text-sm text-slate-400 mt-1">Crie seu primeiro evento</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((e: any) => {
              const cat = getCat(e.categoria);
              return (
                <div key={e.id} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all group">
                  <div className={cn("w-1.5 rounded-full self-stretch flex-shrink-0", cat.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-900">{e.titulo}</p>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", cat.color)}>{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{formatDate(e.data)}</span>
                      {e.horaInicio && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{e.horaInicio}{e.horaFim ? ` – ${e.horaFim}` : ""}</span>}
                    </div>
                    {e.descricao && <p className="text-sm text-slate-500 mt-1">{e.descricao}</p>}
                  </div>
                  <button onClick={() => deleteMutation.mutate(e.id)} className="text-slate-200 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Novo Evento</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Título *</label><input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Data *</label><input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoria</label><select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">{CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Início</label><input type="time" value={form.horaInicio} onChange={e => setForm(f => ({ ...f, horaInicio: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Fim</label><input type="time" value={form.horaFim} onChange={e => setForm(f => ({ ...f, horaFim: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição</label><textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" /></div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancelar</button>
              <button onClick={() => { if (!form.titulo || !form.data) { toast({ title: "Preencha título e data", variant: "destructive" }); return; } createMutation.mutate(form); }} disabled={createMutation.isPending} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">{createMutation.isPending ? "Salvando..." : "Criar Evento"}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
