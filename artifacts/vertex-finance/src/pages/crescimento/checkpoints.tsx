import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { goalsApi, checkpointsApi, type Goal, type Checkpoint } from "@/lib/crescimento-api";
import {
  Layers, Plus, CheckCircle2, Circle, Trash2, Clock, Loader2, X, CalendarDays,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function fmtData(d: string | null) {
  if (!d) return null;
  try { return format(new Date(d + "T00:00:00"), "dd MMM yyyy", { locale: ptBR }); } catch { return d; }
}

function AddModal({
  goals,
  onSave,
  onClose,
  saving,
}: {
  goals: Goal[];
  onSave: (d: { goalId: number; titulo: string; descricao: string; data: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [goalId, setGoalId] = useState(goals[0]?.id ?? 0);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Novo Checkpoint</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Meta vinculada *</label>
            <select value={goalId} onChange={(e) => setGoalId(parseInt(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {goals.map((g) => <option key={g.id} value={g.id}>{g.titulo}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Marco *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Patrimônio R$ 100k atingido" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data prevista</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button
            onClick={() => titulo.trim() && onSave({ goalId, titulo, descricao, data })}
            disabled={saving || !titulo.trim() || !goalId}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Criar Checkpoint
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckpointsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);

  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ["goals"], queryFn: goalsApi.list });
  const { data: checkpoints = [], isLoading } = useQuery<Checkpoint[]>({
    queryKey: ["checkpoints"],
    queryFn: () => checkpointsApi.list(),
  });

  const create = useMutation({
    mutationFn: checkpointsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["checkpoints"] }); setModal(false); },
  });

  const toggle = useMutation({
    mutationFn: ({ id, concluido }: { id: number; concluido: boolean }) =>
      checkpointsApi.update(id, { concluido }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checkpoints"] }),
  });

  const remove = useMutation({
    mutationFn: checkpointsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checkpoints"] }),
  });

  const grouped = goals.map((g) => ({
    goal: g,
    cps: checkpoints.filter((c) => c.goalId === g.id),
  })).filter((g) => g.cps.length > 0);

  const allGoalsMap = Object.fromEntries(goals.map((g) => [g.id, g]));

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Crescimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-indigo-500" /> Checkpoints
            </h1>
            <p className="text-sm text-slate-400 mt-1">Marcos de progresso para cada meta, com data e status.</p>
          </div>
          <button
            onClick={() => setModal(true)}
            disabled={goals.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Checkpoint
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : checkpoints.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4"><Layers className="w-7 h-7 text-indigo-400" /></div>
            <p className="font-semibold text-slate-700 mb-1">Nenhum checkpoint ainda</p>
            <p className="text-sm text-slate-400 mb-5">Defina marcos mensuráveis para acompanhar seu progresso.</p>
            {goals.length > 0 ? (
              <button onClick={() => setModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
                <Plus className="w-4 h-4" /> Criar primeiro checkpoint
              </button>
            ) : (
              <a href="/crescimento/metas" className="text-sm text-primary font-semibold hover:underline">→ Criar uma meta primeiro</a>
            )}
          </div>
        ) : (
          <div className="relative pl-6 flex flex-col gap-8">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200" />
            {grouped.map(({ goal, cps }) => {
              const done = cps.filter((c) => c.concluido).length;
              return (
                <div key={goal.id}>
                  <div className="flex items-center gap-2 mb-4 relative">
                    <div className="absolute -left-6 w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: goal.cor }} />
                    <p className="font-bold text-slate-800">{goal.titulo}</p>
                    <span className="text-xs text-slate-400">{done}/{cps.length}</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {cps.map((cp) => {
                      const g = allGoalsMap[cp.goalId];
                      const isAtrasado = cp.data && new Date(cp.data) < new Date() && !cp.concluido;
                      return (
                        <div key={cp.id} className={`bg-white border rounded-2xl p-4 shadow-sm relative ml-2 ${cp.concluido ? "border-emerald-200" : isAtrasado ? "border-red-200" : "border-slate-200"}`}>
                          <div className="flex items-start gap-3">
                            <button onClick={() => toggle.mutate({ id: cp.id, concluido: !cp.concluido })} className="mt-0.5 flex-shrink-0">
                              {cp.concluido
                                ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                : <Circle className="w-5 h-5 text-slate-300" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-sm ${cp.concluido ? "line-through text-slate-400" : "text-slate-900"}`}>{cp.titulo}</p>
                              {cp.descricao && <p className="text-xs text-slate-500 mt-0.5">{cp.descricao}</p>}
                              {cp.data && (
                                <div className={`flex items-center gap-1.5 text-xs mt-2 ${isAtrasado ? "text-red-500" : cp.concluido ? "text-emerald-600" : "text-slate-400"}`}>
                                  <CalendarDays className="w-3.5 h-3.5" />
                                  {isAtrasado ? "Atrasado · " : ""}{fmtData(cp.data)}
                                </div>
                              )}
                            </div>
                            <button onClick={() => remove.mutate(cp.id)} className="p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0">
                              <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Orphan checkpoints (no goal match in grouped) */}
            {checkpoints.filter((c) => !grouped.some((g) => g.cps.includes(c))).map((cp) => (
              <div key={cp.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative ml-2">
                <div className="flex items-start gap-3">
                  <button onClick={() => toggle.mutate({ id: cp.id, concluido: !cp.concluido })} className="mt-0.5">
                    {cp.concluido ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-300" />}
                  </button>
                  <div className="flex-1"><p className="font-semibold text-sm text-slate-900">{cp.titulo}</p></div>
                  <button onClick={() => remove.mutate(cp.id)}><Trash2 className="w-3.5 h-3.5 text-slate-300" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <AddModal
          goals={goals}
          saving={create.isPending}
          onClose={() => setModal(false)}
          onSave={create.mutate}
        />
      )}
    </AppLayout>
  );
}
