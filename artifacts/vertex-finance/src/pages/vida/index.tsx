import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";
import {
  Plus, Compass, Globe, Trash2, Pencil, ChevronRight,
  MapPin, CheckSquare, Clock, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getApiBase } from "@/lib/api-base";

const apiUrl = (path: string) => `${getApiBase()}/api${path}`;

const TIPOS = [
  { value: "mudanca_pais", label: "Mudança de País", emoji: "🌍" },
  { value: "mudanca_cidade", label: "Mudança de Cidade", emoji: "🏙️" },
  { value: "carreira", label: "Transição de Carreira", emoji: "💼" },
  { value: "estilo_vida", label: "Estilo de Vida", emoji: "🌿" },
  { value: "outro", label: "Outro", emoji: "✨" },
];

const STATUS = [
  { value: "explorando", label: "Explorando", color: "bg-slate-100 text-slate-600" },
  { value: "planejando", label: "Planejando", color: "bg-amber-100 text-amber-700" },
  { value: "executando", label: "Executando", color: "bg-blue-100 text-blue-700" },
  { value: "concluido", label: "Concluído", color: "bg-emerald-100 text-emerald-700" },
];

interface Projeto {
  id: number;
  titulo: string;
  descricao: string | null;
  tipo: string;
  status: string;
  cidadesCount: number;
  createdAt: string;
}

function ProjetoModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Projeto | null;
  onClose: () => void;
  onSave: (data: { titulo: string; descricao: string; tipo: string; status: string }) => void;
}) {
  const [titulo, setTitulo] = useState(initial?.titulo || "");
  const [descricao, setDescricao] = useState(initial?.descricao || "");
  const [tipo, setTipo] = useState(initial?.tipo || "mudanca_pais");
  const [status, setStatus] = useState(initial?.status || "explorando");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 mb-5">{initial ? "Editar projeto" : "Novo projeto de vida"}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nome do projeto</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder='Ex: "Morar no exterior"'
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o objetivo deste projeto..."
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              >
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              >
                {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium">Cancelar</button>
          <button
            onClick={() => { if (titulo.trim()) onSave({ titulo, descricao, tipo, status }); }}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {initial ? "Salvar" : "Criar projeto"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VidaPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editProjeto, setEditProjeto] = useState<Projeto | null>(null);

  const { data: projetos = [], isLoading } = useQuery<Projeto[]>({
    queryKey: ["vida-projetos"],
    queryFn: () => fetch(apiUrl("/vida/projetos")).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      fetch(apiUrl("/vida/projetos"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vida-projetos"] }); toast({ title: "Projeto criado!" }); setShowModal(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & object) =>
      fetch(apiUrl(`/vida/projetos/${id}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vida-projetos"] }); toast({ title: "Projeto atualizado!" }); setEditProjeto(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(apiUrl(`/vida/projetos/${id}`), { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vida-projetos"] }); toast({ title: "Projeto removido" }); },
  });

  const getTipo = (v: string) => TIPOS.find((t) => t.value === v) || TIPOS[0];
  const getStatus = (v: string) => STATUS.find((s) => s.value === v) || STATUS[0];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center">
                <Compass className="w-5 h-5 text-violet-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Planejamento de Vida</h1>
            </div>
            <p className="text-sm text-slate-400 ml-[52px]">Tome decisões estratégicas com clareza e dados</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Projeto
          </button>
        </div>

        {/* Empty state */}
        {!isLoading && projetos.length === 0 && (
          <div className="text-center py-24 border-2 border-dashed border-slate-100 rounded-3xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-violet-50 flex items-center justify-center">
              <Compass className="w-8 h-8 text-violet-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhum projeto ainda</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">Crie seu primeiro projeto de vida — como morar no exterior, mudar de carreira ou redefinir seu estilo de vida.</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Criar primeiro projeto
            </button>
          </div>
        )}

        {/* Projects grid */}
        {projetos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projetos.map((p) => {
              const tipo = getTipo(p.tipo);
              const st = getStatus(p.status);
              return (
                <div key={p.id} className="group bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all duration-200 relative">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{tipo.emoji}</span>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">{p.titulo}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{tipo.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditProjeto(p)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(p.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {p.descricao && (
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{p.descricao}</p>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", st.color)}>
                      {st.label}
                    </span>
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <MapPin className="w-3 h-3" />
                      <span>{p.cidadesCount} {p.cidadesCount === 1 ? "cidade" : "cidades"}</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <Link href={`/vida/${p.id}`}>
                    <button className="w-full flex items-center justify-center gap-2 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-primary/30 hover:text-primary transition-all">
                      Abrir projeto <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Tips */}
        {projetos.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: Globe, color: "bg-blue-50 text-blue-600", text: "Compare cidades lado a lado com custo de vida detalhado" },
              { icon: Sparkles, color: "bg-violet-50 text-violet-600", text: "Simule quanto tempo você pode viver no exterior" },
              { icon: CheckSquare, color: "bg-emerald-50 text-emerald-600", text: "Crie um plano de ação com checkpoints e prazos" },
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl">
                <div className={cn("w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center", tip.color)}>
                  <tip.icon className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{tip.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showModal || editProjeto) && (
        <ProjetoModal
          initial={editProjeto}
          onClose={() => { setShowModal(false); setEditProjeto(null); }}
          onSave={(data) => {
            if (editProjeto) updateMutation.mutate({ id: editProjeto.id, ...data });
            else createMutation.mutate(data);
          }}
        />
      )}
    </AppLayout>
  );
}
