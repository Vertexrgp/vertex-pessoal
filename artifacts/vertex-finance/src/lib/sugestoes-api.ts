import { getApiBase } from "@/lib/api-base";

export type Sugestao = {
  id: number;
  modulo: "agenda" | "financeiro" | "performance" | "crescimento";
  titulo: string;
  explicacao: string;
  motivo: string;
  impacto: string;
  confianca: "baixa" | "media" | "alta";
  status: "pendente" | "aplicada" | "ignorada";
  metadados: Record<string, unknown>;
  geradaEm: string;
  respondidaEm: string | null;
  createdAt: string;
};

export type ComportamentoStats = {
  total: number;
  aceitas: number;
  ignoradas: number;
  taxaAceitacao: number;
  porModulo: Record<string, { aceitas: number; ignoradas: number }>;
  logs: { id: number; tipo: string; modulo: string; createdAt: string }[];
};

export const sugestoesApi = {
  list: async (status?: string): Promise<Sugestao[]> => {
    const base = getApiBase();
    const url = status ? `${base}/api/sugestoes?status=${status}` : `${base}/api/sugestoes`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("Erro ao buscar sugestões");
    return r.json();
  },

  gerar: async (): Promise<{ geradas: number; categorias: string[] }> => {
    const base = getApiBase();
    const r = await fetch(`${base}/api/sugestoes/gerar`, { method: "POST" });
    if (!r.ok) throw new Error("Erro ao gerar sugestões");
    return r.json();
  },

  aplicar: async (id: number): Promise<Sugestao> => {
    const base = getApiBase();
    const r = await fetch(`${base}/api/sugestoes/${id}/aplicar`, { method: "PATCH" });
    if (!r.ok) throw new Error("Erro ao aplicar sugestão");
    return r.json();
  },

  ignorar: async (id: number): Promise<Sugestao> => {
    const base = getApiBase();
    const r = await fetch(`${base}/api/sugestoes/${id}/ignorar`, { method: "PATCH" });
    if (!r.ok) throw new Error("Erro ao ignorar sugestão");
    return r.json();
  },

  comportamento: async (): Promise<ComportamentoStats> => {
    const base = getApiBase();
    const r = await fetch(`${base}/api/sugestoes/comportamento`);
    if (!r.ok) throw new Error("Erro ao buscar comportamento");
    return r.json();
  },
};
