import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { visionApi, goalsApi, type VisionItem, type Goal } from "@/lib/crescimento-api";
import { Star, Plus, Trash2, X, Loader2, Quote, Link2 } from "lucide-react";

const CATS = [
  { value: "geral",           label: "Geral",           emoji: "✨" },
  { value: "carreira",        label: "Carreira",        emoji: "💼" },
  { value: "financas",        label: "Finanças",        emoji: "💰" },
  { value: "saude",           label: "Saúde",           emoji: "🏋️" },
  { value: "relacionamentos", label: "Relações",        emoji: "❤️" },
  { value: "aprendizado",     label: "Aprendizado",     emoji: "📚" },
  { value: "experiencias",    label: "Experiências",    emoji: "✈️" },
];

const CORES = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#64748B"];

function catEmoji(cat: string) {
  return CATS.find((c) => c.value === cat)?.emoji ?? "✨";
}

function AddModal({
  goals,
  onSave,
  onClose,
  saving,
}: {
  goals: Goal[];
  onSave: (d: { titulo: string; tipo: string; conteudo: string; categoria: string; goalId?: number; cor: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [tipo, setTipo] = useState<"frase" | "referencia">("frase");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [categoria, setCategoria] = useState("geral");
  const [goalId, setGoalId] = useState<number | undefined>(undefined);
  const [cor, setCor] = useState("#6366F1");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Adicionar ao Vision Board</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex rounded-xl overflow-hidden border border-slate-200">
            <button onClick={() => setTipo("frase")} className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tipo === "frase" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              Frase / Citação
            </button>
            <button onClick={() => setTipo("referencia")} className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tipo === "referencia" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              Referência / Link
            </button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={tipo === "frase" ? "Ex: Minha missão de vida" : "Ex: Viver no Canadá"} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">{tipo === "frase" ? "Frase / Citação *" : "URL ou Descrição *"}</label>
            {tipo === "frase" ? (
              <textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={3} placeholder="Escreva a frase que te inspira..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            ) : (
              <input value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder="https://..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoria</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {CATS.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            {goals.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Meta vinculada</label>
                <select value={goalId ?? ""} onChange={(e) => setGoalId(e.target.value ? parseInt(e.target.value) : undefined)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Nenhuma</option>
                  {goals.map((g) => <option key={g.id} value={g.id}>{g.titulo}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Cor do card</label>
            <div className="flex gap-2 flex-wrap">
              {CORES.map((c) => (
                <button key={c} onClick={() => setCor(c)} className="w-7 h-7 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: cor === c ? "#1e293b" : "transparent" }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button
            onClick={() => titulo.trim() && conteudo.trim() && onSave({ titulo, tipo, conteudo, categoria, goalId, cor })}
            disabled={saving || !titulo.trim() || !conteudo.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

function VisionCard({ item, goalTitle, onDelete }: { item: VisionItem; goalTitle?: string; onDelete: () => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative">
      <div className="h-3 w-full" style={{ backgroundColor: item.cor }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{catEmoji(item.categoria)}</span>
            <span className="text-xs text-slate-500 font-medium">{CATS.find((c) => c.value === item.categoria)?.label ?? item.categoria}</span>
          </div>
          <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
          </button>
        </div>

        <p className="font-bold text-sm text-slate-900 mb-2">{item.titulo}</p>

        {item.tipo === "frase" ? (
          <div className="border-l-3 border-slate-200 pl-3" style={{ borderLeftColor: item.cor }}>
            <p className="text-xs text-slate-600 italic leading-relaxed">"{item.conteudo}"</p>
          </div>
        ) : (
          <a href={item.conteudo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Link2 className="w-3 h-3" />
            <span className="truncate">{item.conteudo}</span>
          </a>
        )}

        {goalTitle && (
          <div className="mt-3 flex items-center gap-1.5">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-[10px] text-slate-400 font-medium">{goalTitle}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VisionBoardPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");

  const { data: items = [], isLoading } = useQuery<VisionItem[]>({
    queryKey: ["vision"],
    queryFn: visionApi.list,
  });

  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ["goals"], queryFn: goalsApi.list });
  const goalsMap = Object.fromEntries(goals.map((g) => [g.id, g]));

  const create = useMutation({
    mutationFn: visionApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vision"] }); setModal(false); },
  });

  const remove = useMutation({
    mutationFn: visionApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vision"] }),
  });

  const usedCats = [...new Set(items.map((i) => i.categoria))];
  const filtered = filterCat === "all" ? items : items.filter((i) => i.categoria === filterCat);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Crescimento</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-500" /> Vision Board
            </h1>
            <p className="text-sm text-slate-400 mt-1">Frases, referências e inspirações que guiam sua vida.</p>
          </div>
          <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>

        {/* Category filter */}
        {items.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterCat("all")} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filterCat === "all" ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              Tudo
            </button>
            {usedCats.map((cat) => {
              const c = CATS.find((x) => x.value === cat);
              return (
                <button key={cat} onClick={() => setFilterCat(cat)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filterCat === cat ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  <span>{c?.emoji}</span> {c?.label ?? cat}
                </button>
              );
            })}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4"><Star className="w-8 h-8 text-amber-400" /></div>
            <p className="font-semibold text-slate-700 mb-1">Board vazio</p>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">Adicione frases inspiracionais, referências e visões do que você quer construir.</p>
            <button onClick={() => setModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4" /> Adicionar primeiro item
            </button>
          </div>
        ) : (
          <div className="columns-3 gap-4 space-y-4">
            {filtered.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <VisionCard
                  item={item}
                  goalTitle={item.goalId ? goalsMap[item.goalId]?.titulo : undefined}
                  onDelete={() => remove.mutate(item.id)}
                />
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
