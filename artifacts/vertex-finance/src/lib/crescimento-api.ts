function getBase() {
  return import.meta.env.BASE_URL.replace(/\/$/, "").replace(/\/[^/]*$/, "");
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type GoalTipo = "financeiro" | "fisico" | "profissional" | "pessoal";
export type GoalStatus = "ativa" | "pausada" | "concluida" | "cancelada";
export type GoalPrioridade = "alta" | "media" | "baixa";
export type ObjStatus = "pendente" | "em_andamento" | "concluido";

export interface Goal {
  id: number;
  titulo: string;
  descricao: string | null;
  tipo: GoalTipo;
  prazo: string | null;
  status: GoalStatus;
  prioridade: GoalPrioridade;
  progresso: number;
  cor: string;
  createdAt: string;
  updatedAt: string;
}

export interface Objective {
  id: number;
  goalId: number;
  titulo: string;
  descricao: string | null;
  status: ObjStatus;
  ordem: number;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  id: number;
  objectiveId: number;
  titulo: string;
  descricao: string | null;
  status: string;
  ordem: number;
  createdAt: string;
}

export interface Checkpoint {
  id: number;
  goalId: number;
  titulo: string;
  descricao: string | null;
  data: string | null;
  concluido: boolean;
  status: "pendente" | "em_andamento" | "concluido" | "bloqueado";
  progresso: number;
  createdAt: string;
}

export interface PlannerTask {
  id: number;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  categoria: string | null;
  status: string;
  semanaInicio: string;
  diaSemana: string | null;
  goalId: number | null;
  checkpointId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface VisionItem {
  id: number;
  titulo: string;
  tipo: "frase" | "referencia";
  conteudo: string;
  categoria: string;
  goalId: number | null;
  cor: string;
  createdAt: string;
}

// Goals
export const goalsApi = {
  list: () => req<Goal[]>("GET", "/api/crescimento/goals"),
  create: (data: Omit<Goal, "id" | "createdAt" | "updatedAt">) => req<Goal>("POST", "/api/crescimento/goals", data),
  update: (id: number, data: Partial<Goal>) => req<Goal>("PUT", `/api/crescimento/goals/${id}`, data),
  remove: (id: number) => req<{ ok: true }>("DELETE", `/api/crescimento/goals/${id}`),
};

// Objectives
export const objectivesApi = {
  list: (goalId?: number) => req<Objective[]>("GET", `/api/crescimento/objectives${goalId ? `?goalId=${goalId}` : ""}`),
  create: (data: { goalId: number; titulo: string; descricao?: string; status?: string; ordem?: number }) => req<Objective>("POST", "/api/crescimento/objectives", data),
  update: (id: number, data: Partial<Objective>) => req<Objective>("PUT", `/api/crescimento/objectives/${id}`, data),
  remove: (id: number) => req<{ ok: true }>("DELETE", `/api/crescimento/objectives/${id}`),
};

// Plans
export const plansApi = {
  list: (objectiveId?: number) => req<Plan[]>("GET", `/api/crescimento/plans${objectiveId ? `?objectiveId=${objectiveId}` : ""}`),
  create: (data: { objectiveId: number; titulo: string; descricao?: string; status?: string }) => req<Plan>("POST", "/api/crescimento/plans", data),
  update: (id: number, data: Partial<Plan>) => req<Plan>("PUT", `/api/crescimento/plans/${id}`, data),
  remove: (id: number) => req<{ ok: true }>("DELETE", `/api/crescimento/plans/${id}`),
};

// Checkpoints
export const checkpointsApi = {
  list: (goalId?: number) => req<Checkpoint[]>("GET", `/api/crescimento/checkpoints${goalId ? `?goalId=${goalId}` : ""}`),
  create: (data: { goalId: number; titulo: string; descricao?: string; data?: string; status?: string; progresso?: number }) => req<Checkpoint>("POST", "/api/crescimento/checkpoints", data),
  update: (id: number, data: Partial<Checkpoint>) => req<Checkpoint>("PUT", `/api/crescimento/checkpoints/${id}`, data),
  remove: (id: number) => req<{ ok: true }>("DELETE", `/api/crescimento/checkpoints/${id}`),
};

// Planner Tasks (Agenda) linked to goals/checkpoints
export const plannerTasksApi = {
  listByGoal: (goalId: number) => req<PlannerTask[]>("GET", `/api/agenda/planner?goalId=${goalId}`),
  createLinked: (data: { titulo: string; goalId: number; checkpointId?: number; prioridade?: string; semanaInicio: string }) =>
    req<PlannerTask>("POST", "/api/agenda/planner", { ...data, status: "pendente" }),
  update: (id: number, data: Partial<PlannerTask>) => req<PlannerTask>("PUT", `/api/agenda/planner/${id}`, data),
  remove: (id: number) => req<{ ok: true }>("DELETE", `/api/agenda/planner/${id}`),
};

// Roadmap Generation
export interface RoadmapCheckpointInput {
  titulo: string;
  descricao: string;
  dataAlvo: string;
  semanaInicio: string;
  tarefas: { titulo: string; prioridade: string }[];
}

export const roadmapApi = {
  generate: (data: { goalId: number; checkpoints: RoadmapCheckpointInput[] }) =>
    req<{ checkpoints: Checkpoint[]; tasks: PlannerTask[] }>("POST", "/api/crescimento/roadmap/generate", data),
};

// Vision
export const visionApi = {
  list: () => req<VisionItem[]>("GET", "/api/crescimento/vision"),
  create: (data: { titulo: string; tipo: string; conteudo: string; categoria: string; goalId?: number; cor?: string }) => req<VisionItem>("POST", "/api/crescimento/vision", data),
  update: (id: number, data: Partial<VisionItem>) => req<VisionItem>("PUT", `/api/crescimento/vision/${id}`, data),
  remove: (id: number) => req<{ ok: true }>("DELETE", `/api/crescimento/vision/${id}`),
};
