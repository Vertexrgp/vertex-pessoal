import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { CalendarCheck, Plus, Trash2, Clock, Tag, ChevronLeft, ChevronRight, Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getApiBase } from "@/lib/api-base";

const apiUrl = (path: string) => `${getApiBase()}/api${path}`;

const CATEGORIAS = [
  { value: "saude", label: "Saúde", color: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  { value: "trabalho", label: "Trabalho", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  { value: "pessoal", label: "Pessoal", color: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  { value: "financeiro", label: "Financeiro", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  { value: "viagem", label: "Viagem", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  { value: "outros", label: "Outros", color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
];

function getCat(val: string) {
  return CATEGORIAS.find(c => c.value === val) || CATEGORIAS[5];
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function isToday(dateStr: string) {
  const today = new Date();
  const [y, m, d] = dateStr.split("-").map(Number);
  return today.getFullYear() === y && today.getMonth() + 1 === m && today.getDate() === d;
}

function isPast(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date < today;
}

export default function AgendaPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [showForm, setShowForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    data: "",
    horaInicio: "",
    horaFim: "",
    descricao: "",
    categoria: "pessoal",
    alerta: false,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["agenda-events", viewYear, viewMonth],
    queryFn: () =>
      fetch(apiUrl(`/agenda/events?month=${viewMonth}&year=${viewYear}`)).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      fetch(apiUrl("/agenda/events"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda-events"] });
      setShowForm(false);
      setForm({ titulo: "", data: "", horaInicio: "", horaFim: "", descricao: "", categoria: "pessoal", alerta: false });
      toast({ title: "Evento criado!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(apiUrl(`/agenda/events/${id}`), { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda-events"] });
      toast({ title: "Evento removido" });
    },
  });

  // Build calendar
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const calendarDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const eventsByDay: Record<string, typeof events> = {};
  events.forEach((e: any) => {
    const key = e.data;
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(e);
  });

  const dayKey = (day: number) => `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const upcomingEvents = [...events]
    .filter((e: any) => !isPast(e.data) || isToday(e.data))
    .sort((a: any, b: any) => a.data.localeCompare(b.data))
    .slice(0, 8);

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleSubmit = () => {
    if (!form.titulo.trim() || !form.data) {
      toast({ title: "Preencha título e data", variant: "destructive" });
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda</h1>
            <p className="text-sm text-slate-500 mt-0.5">Organize seus eventos e compromissos</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setForm(f => ({ ...f, data: selectedDay || "" })); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Evento
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <h2 className="font-semibold text-slate-900">{MESES[viewMonth - 1]} {viewYear}</h2>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-slate-100">
                {DIAS_SEMANA.map(d => (
                  <div key={d} className="text-center py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  const key = day ? dayKey(day) : "";
                  const dayEvents = day ? (eventsByDay[key] || []) : [];
                  const today = day ? isToday(key) : false;
                  const selected = key === selectedDay;

                  return (
                    <div
                      key={idx}
                      onClick={() => day && setSelectedDay(selected ? null : key)}
                      className={cn(
                        "min-h-[72px] p-1.5 border-b border-r border-slate-100 cursor-pointer transition-colors",
                        day ? "hover:bg-slate-50" : "bg-slate-50/50",
                        selected && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                      )}
                    >
                      {day && (
                        <>
                          <span className={cn(
                            "inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full mb-1",
                            today ? "bg-primary text-white" : "text-slate-700"
                          )}>
                            {day}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            {dayEvents.slice(0, 2).map((e: any) => {
                              const cat = getCat(e.categoria);
                              return (
                                <div key={e.id} className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium truncate", cat.color)}>
                                  {e.titulo}
                                </div>
                              );
                            })}
                            {dayEvents.length > 2 && (
                              <div className="text-[10px] text-slate-400 px-1">+{dayEvents.length - 2}</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected day events */}
            {selectedDay && (
              <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">{formatDate(selectedDay)}</h3>
                  <button
                    onClick={() => { setShowForm(true); setForm(f => ({ ...f, data: selectedDay })); }}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                </div>
                {selectedEvents.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhum evento neste dia</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((e: any) => {
                      const cat = getCat(e.categoria);
                      return (
                        <div key={e.id} className="flex items-start justify-between gap-3 p-3 bg-slate-50 rounded-xl">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", cat.dot)} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{e.titulo}</p>
                              {e.horaInicio && (
                                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />{e.horaInicio}{e.horaFim ? ` → ${e.horaFim}` : ""}
                                </p>
                              )}
                              {e.descricao && <p className="text-xs text-slate-500 mt-0.5">{e.descricao}</p>}
                            </div>
                          </div>
                          <button onClick={() => deleteMutation.mutate(e.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Upcoming events sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Próximos Eventos</h3>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum evento próximo</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingEvents.map((e: any) => {
                    const cat = getCat(e.categoria);
                    const today = isToday(e.data);
                    return (
                      <div key={e.id} className="flex gap-3 group">
                        <div className={cn("w-1 rounded-full flex-shrink-0", cat.dot)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{e.titulo}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {today ? <span className="text-primary font-medium">Hoje</span> : formatDate(e.data)}
                            {e.horaInicio && <span> · {e.horaInicio}</span>}
                          </p>
                        </div>
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md h-fit flex-shrink-0", cat.color)}>
                          {cat.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Categorias legend */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-900 mb-3 text-sm">Categorias</h3>
              <div className="space-y-2">
                {CATEGORIAS.map(cat => (
                  <div key={cat.value} className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", cat.dot)} />
                    <span className="text-sm text-slate-600">{cat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Novo Evento */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Novo Evento</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título *</label>
                <input
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Consulta médica"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data *</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {CATEGORIAS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Horário início</label>
                  <input
                    type="time"
                    value={form.horaInicio}
                    onChange={e => setForm(f => ({ ...f, horaInicio: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Horário fim</label>
                  <input
                    type="time"
                    value={form.horaFim}
                    onChange={e => setForm(f => ({ ...f, horaFim: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Detalhes adicionais..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.alerta}
                  onChange={e => setForm(f => ({ ...f, alerta: e.target.checked }))}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm text-slate-600">Ativar lembrete</span>
                <Bell className="w-3.5 h-3.5 text-slate-400" />
              </label>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? "Salvando..." : "Criar Evento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
