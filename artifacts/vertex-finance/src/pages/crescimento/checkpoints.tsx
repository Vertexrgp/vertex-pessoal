import { AppLayout } from "@/components/layout/AppLayout";
import { Layers, Plus, CheckCircle2, Circle, Clock } from "lucide-react";

const CHECKPOINTS = [
  { id: 1, titulo: "Q1 2026", data: "Mar 2026", concluido: true, itens: ["Criar plano de investimentos", "Iniciar curso de inglês avançado", "Consultar nutricionista"], concluidos: 3 },
  { id: 2, titulo: "Q2 2026", data: "Jun 2026", concluido: false, itens: ["Atingir R$ 200k em patrimônio", "Terminar 6 livros", "Certificação profissional"], concluidos: 1 },
  { id: 3, titulo: "Q3 2026", data: "Set 2026", concluido: false, itens: ["Viagem ao exterior", "10k corrida", "Lançar projeto paralelo"], concluidos: 0 },
];

export default function CheckpointsPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Crescimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-indigo-500" /> Checkpoints
            </h1>
            <p className="text-sm text-slate-400 mt-1">Marcos trimestrais de progresso pessoal.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Novo Checkpoint
          </button>
        </div>

        <div className="relative pl-6">
          <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200" />
          <div className="flex flex-col gap-6">
            {CHECKPOINTS.map((cp) => (
              <div key={cp.id} className="relative">
                <div className={`absolute -left-6 top-4 w-4 h-4 rounded-full border-2 ${cp.concluido ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"}`} />
                <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${cp.concluido ? "border-emerald-200" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900">{cp.titulo}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {cp.data}</p>
                    </div>
                    {cp.concluido
                      ? <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Concluído ✓</span>
                      : <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{cp.concluidos}/{cp.itens.length} feitos</span>}
                  </div>
                  <div className="px-5 py-4 flex flex-col gap-2.5">
                    {cp.itens.map((item, i) => {
                      const done = i < cp.concluidos;
                      return (
                        <div key={i} className="flex items-center gap-2.5">
                          {done
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                          <span className={`text-sm ${done ? "text-slate-400 line-through" : "text-slate-700"}`}>{item}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
