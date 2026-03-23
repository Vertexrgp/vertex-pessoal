import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  roadmapApi, checkpointsApi, plannerTasksApi,
  type Goal, type Checkpoint, type PlannerTask, type RoadmapCheckpointInput,
} from "@/lib/crescimento-api";
import {
  Zap, Loader2, X, CheckCircle2, Circle, Pencil, Trash2, Plus,
  ChevronDown, ChevronRight, CalendarDays, Flag, BarChart2, DollarSign,
  Dumbbell, Globe, Briefcase, ArrowRight, ListTodo, AlertCircle, Clock,
} from "lucide-react";
import { format, addWeeks, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Template Engine ──────────────────────────────────────────────────────────

interface TaskTemplate { titulo: string; prioridade: "alta" | "media" | "baixa" }
interface CpTemplate {
  titulo: string;
  descricao: string;
  semanas: number;
  tarefas: TaskTemplate[];
  integracao?: "performance" | "financeiro";
}
interface RoadmapTemplate { nome: string; descricao: string; icon: React.ElementType; cor: string; checkpoints: CpTemplate[] }

const TEMPLATES: Record<string, RoadmapTemplate> = {
  financeiro: {
    nome: "Meta Financeira",
    descricao: "Crescimento de receita, patrimônio ou renda",
    icon: DollarSign,
    cor: "#10B981",
    checkpoints: [
      {
        titulo: "Validação do modelo de receita",
        descricao: "Primeiro dinheiro real entrando — prova que o modelo funciona",
        semanas: 4,
        integracao: "financeiro",
        tarefas: [
          { titulo: "Definir produto ou serviço principal", prioridade: "alta" },
          { titulo: "Abordar primeiros 10 potenciais clientes", prioridade: "alta" },
          { titulo: "Fechar a primeira venda", prioridade: "alta" },
        ],
      },
      {
        titulo: "Receita recorrente de 25% da meta",
        descricao: "Fluxo de caixa previsível e replicável",
        semanas: 12,
        integracao: "financeiro",
        tarefas: [
          { titulo: "Criar funil de vendas simples", prioridade: "alta" },
          { titulo: "Automatizar captação de clientes", prioridade: "media" },
          { titulo: "Lançar campanha de divulgação", prioridade: "media" },
        ],
      },
      {
        titulo: "Operação estruturada (50% da meta)",
        descricao: "Processos, equipe e entrega funcionando",
        semanas: 24,
        tarefas: [
          { titulo: "Contratar ou terceirizar operação", prioridade: "media" },
          { titulo: "Delegar tarefas operacionais recorrentes", prioridade: "media" },
          { titulo: "Criar padrão de qualidade na entrega", prioridade: "alta" },
        ],
      },
      {
        titulo: "Meta de faturamento atingida e estável",
        descricao: "Receita no nível desejado por 3 meses consecutivos",
        semanas: 52,
        integracao: "financeiro",
        tarefas: [
          { titulo: "Revisão semanal de métricas", prioridade: "alta" },
          { titulo: "Ajustar estratégia conforme dados", prioridade: "media" },
          { titulo: "Planejar próxima fase de crescimento", prioridade: "media" },
        ],
      },
    ],
  },
  fisico: {
    nome: "Meta de Performance Física",
    descricao: "Composição corporal, força, saúde e bem-estar",
    icon: Dumbbell,
    cor: "#EF4444",
    checkpoints: [
      {
        titulo: "Avaliação física inicial completa",
        descricao: "Linha de base para medir evolução com dados reais",
        semanas: 1,
        integracao: "performance",
        tarefas: [
          { titulo: "Tirar fotos e medidas corporais", prioridade: "alta" },
          { titulo: "Realizar bioimpedância ou avaliação física", prioridade: "alta" },
          { titulo: "Definir protocolo de treino com profissional", prioridade: "alta" },
        ],
      },
      {
        titulo: "Rotina de treino consistente (4+ semanas)",
        descricao: "Treino 3x por semana por 4 semanas sem falhas",
        semanas: 6,
        integracao: "performance",
        tarefas: [
          { titulo: "Treinar 3x por semana", prioridade: "alta" },
          { titulo: "Registrar cargas e progressão semanal", prioridade: "media" },
          { titulo: "Ajustar protocolo com base na evolução", prioridade: "media" },
        ],
      },
      {
        titulo: "Nutrição e dieta ajustadas",
        descricao: "Alimentação alinhada com a meta física",
        semanas: 10,
        integracao: "performance",
        tarefas: [
          { titulo: "Consultar nutricionista ou nutricionista esportivo", prioridade: "alta" },
          { titulo: "Seguir cardápio semanal estruturado", prioridade: "alta" },
          { titulo: "Registrar ingestão diária de proteína", prioridade: "media" },
        ],
      },
      {
        titulo: "Resultado físico atingido",
        descricao: "Meta de composição corporal alcançada e confirmada",
        semanas: 24,
        integracao: "performance",
        tarefas: [
          { titulo: "Reavaliação física mensal", prioridade: "alta" },
          { titulo: "Manutenção do protocolo de treino", prioridade: "media" },
          { titulo: "Definir nova meta de composição corporal", prioridade: "baixa" },
        ],
      },
    ],
  },
  pessoal: {
    nome: "Meta de Vida / Projeto Pessoal",
    descricao: "Mudança de vida, imigração, projetos pessoais",
    icon: Globe,
    cor: "#6366F1",
    checkpoints: [
      {
        titulo: "Planejamento detalhado concluído",
        descricao: "Mapa claro de todos os requisitos e passos necessários",
        semanas: 2,
        tarefas: [
          { titulo: "Pesquisar todos os requisitos e pré-condições", prioridade: "alta" },
          { titulo: "Criar lista priorizada de passos necessários", prioridade: "alta" },
          { titulo: "Definir prazo realista com margem de segurança", prioridade: "media" },
        ],
      },
      {
        titulo: "Primeiros passos concretos executados",
        descricao: "Ação real iniciada — saiu do planejamento para a execução",
        semanas: 8,
        tarefas: [
          { titulo: "Executar as 3 primeiras ações do plano", prioridade: "alta" },
          { titulo: "Revisão semanal de progresso", prioridade: "media" },
          { titulo: "Ajustar plano com base nos primeiros aprendizados", prioridade: "media" },
        ],
      },
      {
        titulo: "Pré-requisitos atendidos",
        descricao: "Todos os bloqueios resolvidos, caminho livre",
        semanas: 24,
        tarefas: [
          { titulo: "Verificar checklist completo de requisitos", prioridade: "alta" },
          { titulo: "Resolver pendências e documentação", prioridade: "alta" },
          { titulo: "Confirmar viabilidade e próximos passos", prioridade: "media" },
        ],
      },
      {
        titulo: "Meta realizada e consolidada",
        descricao: "Objetivo final concluído e adaptação ao novo estado",
        semanas: 52,
        tarefas: [
          { titulo: "Celebrar e documentar a conquista", prioridade: "media" },
          { titulo: "Registrar aprendizados do processo", prioridade: "baixa" },
          { titulo: "Definir próxima grande meta", prioridade: "media" },
        ],
      },
    ],
  },
  profissional: {
    nome: "Meta Profissional / Carreira",
    descricao: "Ascensão de carreira, empreendedorismo, habilidades",
    icon: Briefcase,
    cor: "#3B82F6",
    checkpoints: [
      {
        titulo: "Habilidades base dominadas",
        descricao: "Competências essenciais para a posição ou área almejada",
        semanas: 8,
        tarefas: [
          { titulo: "Mapear skills necessários para o objetivo", prioridade: "alta" },
          { titulo: "Iniciar cursos e estudo estruturado", prioridade: "alta" },
          { titulo: "Praticar 1h por dia nas skills principais", prioridade: "media" },
        ],
      },
      {
        titulo: "Portfólio e projetos reais entregues",
        descricao: "Provas concretas de competência para o mercado",
        semanas: 20,
        tarefas: [
          { titulo: "Construir e publicar 3 projetos reais", prioridade: "alta" },
          { titulo: "Compartilhar no LinkedIn e comunidades", prioridade: "media" },
          { titulo: "Buscar feedback de referências da área", prioridade: "media" },
        ],
      },
      {
        titulo: "Rede de contatos estratégica ativa",
        descricao: "Network relevante construído e engajado",
        semanas: 32,
        tarefas: [
          { titulo: "Participar de 2 eventos da área por mês", prioridade: "media" },
          { titulo: "Conectar e conversar com 5 pessoas/mês", prioridade: "media" },
          { titulo: "Contribuir ativamente em comunidades", prioridade: "baixa" },
        ],
      },
      {
        titulo: "Posição almejada conquistada",
        descricao: "Objetivo profissional atingido com sucesso",
        semanas: 52,
        tarefas: [
          { titulo: "Candidatar-se ativamente a oportunidades", prioridade: "alta" },
          { titulo: "Preparar e praticar entrevistas", prioridade: "alta" },
          { titulo: "Negociar condições e proposta", prioridade: "media" },
        ],
      },
    ],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function addWeeksToDate(date: Date, weeks: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
}

function fmtData(d: string | null) {
  if (!d) return null;
  try { return format(new Date(d + "T00:00:00"), "dd MMM yyyy", { locale: ptBR }); } catch { return d; }
}

const STATUS_CP = {
  pendente:    { label: "Pendente",    dot: "bg-slate-300",   ring: "border-slate-300", badge: "bg-slate-100 text-slate-600" },
  em_andamento:{ label: "Em andamento",dot: "bg-blue-400",    ring: "border-blue-400",  badge: "bg-blue-100 text-blue-700" },
  concluido:   { label: "Concluído",   dot: "bg-emerald-500", ring: "border-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  bloqueado:   { label: "Bloqueado",   dot: "bg-rose-400",    ring: "border-rose-400",  badge: "bg-rose-100 text-rose-700" },
};

const PRIOR_COLORS: Record<string, string> = {
  alta: "text-rose-600 bg-rose-50",
  media: "text-amber-600 bg-amber-50",
  baixa: "text-slate-500 bg-slate-100",
};

// ─── Generation Modal ─────────────────────────────────────────────────────────

type EditableCp = {
  titulo: string;
  descricao: string;
  semanas: number;
  integracao?: string;
  tarefas: { titulo: string; prioridade: string }[];
};

function GenerateModal({
  goal,
  onClose,
  onGenerate,
  generating,
}: {
  goal: Goal;
  onClose: () => void;
  onGenerate: (cps: EditableCp[]) => void;
  generating: boolean;
}) {
  const template = TEMPLATES[goal.tipo] ?? TEMPLATES.pessoal;
  const Icon = template.icon;

  const [cps, setCps] = useState<EditableCp[]>(
    template.checkpoints.map((cp) => ({ ...cp, tarefas: cp.tarefas.map((t) => ({ ...t })) }))
  );

  function updateCpTitulo(idx: number, v: string) {
    setCps((prev) => prev.map((cp, i) => i === idx ? { ...cp, titulo: v } : cp));
  }
  function updateCpDescricao(idx: number, v: string) {
    setCps((prev) => prev.map((cp, i) => i === idx ? { ...cp, descricao: v } : cp));
  }
  function updateTaskTitulo(cpIdx: number, tIdx: number, v: string) {
    setCps((prev) => prev.map((cp, i) => i === cpIdx
      ? { ...cp, tarefas: cp.tarefas.map((t, j) => j === tIdx ? { ...t, titulo: v } : t) }
      : cp
    ));
  }
  function addTask(cpIdx: number) {
    setCps((prev) => prev.map((cp, i) => i === cpIdx
      ? { ...cp, tarefas: [...cp.tarefas, { titulo: "", prioridade: "media" }] }
      : cp
    ));
  }
  function removeTask(cpIdx: number, tIdx: number) {
    setCps((prev) => prev.map((cp, i) => i === cpIdx
      ? { ...cp, tarefas: cp.tarefas.filter((_, j) => j !== tIdx) }
      : cp
    ));
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: template.cor + "22" }}>
              <Icon className="w-5 h-5" style={{ color: template.cor }} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Gerar Roadmap Automático</h2>
              <p className="text-xs text-slate-500 mt-0.5">{template.nome} · {cps.length} marcos · {cps.reduce((s, c) => s + c.tarefas.length, 0)} tarefas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>

        {/* Info banner */}
        <div className="mx-6 mt-5 p-3 bg-indigo-50 rounded-xl text-xs text-indigo-700 flex items-start gap-2">
          <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Roadmap baseado no tipo "{template.nome}".</strong> Edite os marcos e tarefas abaixo antes de gerar. Tudo pode ser ajustado depois.
          </div>
        </div>

        {/* Checkpoints editor */}
        <div className="px-6 py-5 flex flex-col gap-5 max-h-[60vh] overflow-y-auto">
          {cps.map((cp, cpIdx) => {
            const semana = `Semana ${cp.semanas}`;
            return (
              <div key={cpIdx} className="border border-slate-200 rounded-2xl overflow-hidden">
                {/* Checkpoint header */}
                <div className="bg-slate-50 px-4 py-3 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-white border-2 border-indigo-400 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0 mt-0.5">
                    {cpIdx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      value={cp.titulo}
                      onChange={(e) => updateCpTitulo(cpIdx, e.target.value)}
                      className="w-full text-sm font-bold text-slate-900 bg-transparent border-0 border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-400 pb-0.5"
                    />
                    <input
                      value={cp.descricao}
                      onChange={(e) => updateCpDescricao(cpIdx, e.target.value)}
                      className="w-full text-xs text-slate-500 bg-transparent border-0 focus:outline-none mt-1"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400">{semana}</span>
                    {cp.integracao === "performance" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 font-medium">Performance</span>
                    )}
                    {cp.integracao === "financeiro" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-medium">Financeiro</span>
                    )}
                  </div>
                </div>
                {/* Tasks */}
                <div className="px-4 py-3 flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tarefas na Agenda</p>
                  {cp.tarefas.map((t, tIdx) => (
                    <div key={tIdx} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                      <input
                        value={t.titulo}
                        onChange={(e) => updateTaskTitulo(cpIdx, tIdx, e.target.value)}
                        className="flex-1 text-xs text-slate-700 bg-transparent border-b border-dashed border-slate-200 focus:outline-none focus:border-indigo-400 pb-0.5"
                        placeholder="Título da tarefa..."
                      />
                      <button onClick={() => removeTask(cpIdx, tIdx)} className="p-1 hover:text-rose-400 text-slate-300 flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addTask(cpIdx)}
                    className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 font-medium mt-1"
                  >
                    <Plus className="w-3 h-3" /> Adicionar tarefa
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">{cps.length} checkpoints · {cps.reduce((s, c) => s + c.tarefas.filter(t => t.titulo.trim()).length, 0)} tarefas serão criadas</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button
              onClick={() => onGenerate(cps)}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-primary/90"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {generating ? "Gerando…" : "Gerar Roadmap"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Checkpoint Card (Timeline) ───────────────────────────────────────────────

function CpCard({
  cp,
  tasks,
  goal,
  idx,
  isLast,
  onUpdate,
  onDelete,
  onAddTask,
}: {
  cp: Checkpoint;
  tasks: PlannerTask[];
  goal: Goal;
  idx: number;
  isLast: boolean;
  onUpdate: (id: number, data: Partial<Checkpoint>) => void;
  onDelete: (id: number) => void;
  onAddTask: (cp: Checkpoint) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const st = STATUS_CP[cp.status as keyof typeof STATUS_CP] ?? STATUS_CP.pendente;
  const isAtrasado = cp.data && new Date(cp.data + "T00:00:00") < new Date() && cp.status !== "concluido";
  const cpTasks = tasks.filter((t) => t.checkpointId === cp.id);
  const tasksDone = cpTasks.filter((t) => t.status === "concluido").length;

  return (
    <div className="flex gap-4">
      {/* Timeline rail */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
        <div
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
            cp.status === "concluido" ? "bg-emerald-500 border-emerald-500 text-white" :
            cp.status === "em_andamento" ? "bg-blue-400 border-blue-400 text-white" :
            "bg-white border-slate-300 text-slate-400"
          }`}
        >
          {cp.status === "concluido" ? <CheckCircle2 className="w-4 h-4" /> : <span>{idx + 1}</span>}
        </div>
        {!isLast && <div className="w-0.5 flex-1 mt-1" style={{ backgroundColor: cp.status === "concluido" ? "#10b981" : "#e2e8f0", minHeight: 24 }} />}
      </div>

      {/* Card */}
      <div className={`flex-1 bg-white border rounded-2xl shadow-sm mb-4 overflow-hidden ${
        cp.status === "concluido" ? "border-emerald-200" : isAtrasado ? "border-rose-200" : "border-slate-200"
      }`}>
        {/* Card Header */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.badge}`}>{st.label}</span>
                {isAtrasado && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-rose-100 text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Atrasado
                  </span>
                )}
                {cp.data && (
                  <span className={`flex items-center gap-1 text-xs ${isAtrasado ? "text-rose-500" : "text-slate-400"}`}>
                    <CalendarDays className="w-3 h-3" /> {fmtData(cp.data)}
                  </span>
                )}
              </div>
              <p className={`font-bold text-slate-900 ${cp.status === "concluido" ? "line-through text-slate-400" : ""}`}>{cp.titulo}</p>
              {cp.descricao && <p className="text-xs text-slate-500 mt-0.5">{cp.descricao}</p>}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <select
                value={cp.status}
                onChange={(e) => {
                  const s = e.target.value;
                  onUpdate(cp.id, { status: s, concluido: s === "concluido", progresso: s === "concluido" ? 100 : cp.progresso });
                }}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                {Object.entries(STATUS_CP).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </select>
              <button onClick={() => onDelete(cp.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
              </button>
            </div>
          </div>

          {/* Progress */}
          {cp.status !== "concluido" && (
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${cp.progresso}%`, backgroundColor: goal.cor }} />
              </div>
              <span className="text-xs font-semibold text-slate-400 w-8 text-right">{cp.progresso}%</span>
              <input
                type="range" min={0} max={100} step={5}
                value={cp.progresso}
                onChange={(e) => onUpdate(cp.id, { progresso: parseInt(e.target.value) })}
                className="w-20 accent-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Tasks section */}
        <div className="border-t border-slate-100">
          <button
            onClick={() => setExpanded((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
          >
            <span className="flex items-center gap-1.5">
              <ListTodo className="w-3.5 h-3.5" />
              {cpTasks.length > 0 ? `${tasksDone}/${cpTasks.length} tarefas` : "Tarefas"}
            </span>
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {expanded && (
            <div className="px-4 pb-3 flex flex-col gap-2">
              {cpTasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">Nenhuma tarefa. Clique em + para adicionar.</p>
              ) : (
                cpTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 flex-shrink-0 ${t.status === "concluido" ? "text-emerald-500" : "text-slate-300"}`}>
                      {t.status === "concluido" ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </div>
                    <span className={`flex-1 text-xs ${t.status === "concluido" ? "line-through text-slate-400" : "text-slate-700"}`}>{t.titulo}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIOR_COLORS[t.prioridade] ?? "text-slate-500"}`}>
                      {t.prioridade === "alta" ? "Alta" : t.prioridade === "media" ? "Média" : "Baixa"}
                    </span>
                  </div>
                ))
              )}
              <button
                onClick={() => onAddTask(cp)}
                className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 font-medium mt-1"
              >
                <Plus className="w-3 h-3" /> Adicionar tarefa
              </button>
            </div>
          )}
        </div>

        {/* Integration links */}
        {(cp.titulo.toLowerCase().includes("treino") || cp.titulo.toLowerCase().includes("físic") || cp.titulo.toLowerCase().includes("nutri")) && (
          <div className="border-t border-slate-100 px-4 py-2.5 flex items-center gap-2">
            <Dumbbell className="w-3 h-3 text-rose-400" />
            <Link href="/performance/treinos" className="text-xs text-rose-600 hover:underline font-medium">Ver Treinos na Performance →</Link>
          </div>
        )}
        {(cp.titulo.toLowerCase().includes("receita") || cp.titulo.toLowerCase().includes("faturamento") || cp.titulo.toLowerCase().includes("financeiro")) && (
          <div className="border-t border-slate-100 px-4 py-2.5 flex items-center gap-2">
            <DollarSign className="w-3 h-3 text-emerald-500" />
            <Link href="/simulador-financeiro" className="text-xs text-emerald-600 hover:underline font-medium">Ver Simulador Financeiro →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function RoadmapTab({
  goal,
  checkpoints,
  tarefas,
  onAddTask,
}: {
  goal: Goal;
  checkpoints: Checkpoint[];
  tarefas: PlannerTask[];
  onAddTask: (cp: Checkpoint) => void;
}) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const generate = useMutation({
    mutationFn: roadmapApi.generate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkpoints", goal.id] });
      qc.invalidateQueries({ queryKey: ["planner-goal", goal.id] });
      setShowModal(false);
    },
  });

  const updateCp = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Checkpoint> }) => checkpointsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checkpoints", goal.id] }),
  });

  const removeCp = useMutation({
    mutationFn: checkpointsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checkpoints", goal.id] }),
  });

  function handleGenerate(cps: EditableCp[]) {
    const today = new Date();
    const monday = getMonday(today);
    const semanaInicio = monday.toISOString().split("T")[0];

    const payload: RoadmapCheckpointInput[] = cps.map((cp) => ({
      titulo: cp.titulo,
      descricao: cp.descricao,
      dataAlvo: addWeeksToDate(today, cp.semanas),
      semanaInicio,
      tarefas: cp.tarefas.filter((t) => t.titulo.trim()),
    }));

    generate.mutate({ goalId: goal.id, checkpoints: payload });
  }

  const template = TEMPLATES[goal.tipo] ?? TEMPLATES.pessoal;
  const Icon = template.icon;
  const hasCheckpoints = checkpoints.length > 0;
  const completedCount = checkpoints.filter((c) => c.status === "concluido" || c.concluido).length;
  const pct = hasCheckpoints ? Math.round((completedCount / checkpoints.length) * 100) : 0;

  return (
    <div>
      {/* Header actions */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {hasCheckpoints && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-900">{completedCount}</span> de {checkpoints.length} marcos concluídos
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: goal.cor }} />
              </div>
              <span className="font-bold text-sm" style={{ color: goal.cor }}>{pct}%</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasCheckpoints && (
            <Link href="/agenda/planejamento-semanal" className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <ListTodo className="w-3.5 h-3.5" /> Ver Agenda
            </Link>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-sm"
          >
            <Zap className="w-4 h-4" />
            {hasCheckpoints ? "Regenerar Roadmap" : "Gerar Roadmap Automático"}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!hasCheckpoints && (
        <div className="flex flex-col items-center py-16 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: template.cor + "22" }}>
            <Icon className="w-8 h-8" style={{ color: template.cor }} />
          </div>
          <h3 className="font-bold text-slate-800 mb-1">Seu roadmap está vazio</h3>
          <p className="text-sm text-slate-500 mb-2 max-w-sm">
            Detectamos que esta é uma <strong>{template.nome}</strong>. Vamos gerar um plano completo com marcos e tarefas automaticamente.
          </p>
          <p className="text-xs text-slate-400 mb-6 max-w-sm">
            O roadmap cria checkpoints (marcos) e tarefas vinculadas à Agenda. Você pode editar tudo depois.
          </p>

          {/* Template preview */}
          <div className="flex flex-col gap-2 mb-6 w-full max-w-sm text-left">
            {template.checkpoints.map((cp, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-xl">
                <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ borderColor: template.cor, color: template.cor }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{cp.titulo}</p>
                  <p className="text-[10px] text-slate-400">{cp.tarefas.length} tarefas · Semana {cp.semanas}</p>
                </div>
                {cp.integracao && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cp.integracao === "performance" ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}>
                    {cp.integracao === "performance" ? "Performance" : "Financeiro"}
                  </span>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary/90 shadow-md"
          >
            <Zap className="w-4 h-4" /> Gerar Roadmap Automático
          </button>
        </div>
      )}

      {/* Timeline */}
      {hasCheckpoints && (
        <div className="flex flex-col">
          {checkpoints.map((cp, idx) => (
            <CpCard
              key={cp.id}
              cp={cp}
              tasks={tarefas}
              goal={goal}
              idx={idx}
              isLast={idx === checkpoints.length - 1}
              onUpdate={(id, data) => updateCp.mutate({ id, data })}
              onDelete={(id) => removeCp.mutate(id)}
              onAddTask={onAddTask}
            />
          ))}

          {/* Finish line */}
          <div className="flex gap-4 items-center">
            <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                <Flag className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
            <div className="flex-1 py-3">
              <p className="text-xs text-slate-400 font-semibold">Meta concluída</p>
              {goal.prazo && <p className="text-xs text-slate-400 mt-0.5">Prazo: {fmtData(goal.prazo)}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Generation Modal */}
      {showModal && (
        <GenerateModal
          goal={goal}
          onClose={() => setShowModal(false)}
          onGenerate={handleGenerate}
          generating={generate.isPending}
        />
      )}
    </div>
  );
}
