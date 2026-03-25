import { getApiBase as getBase } from "@/lib/api-base";

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface Livro {
  id: number;
  titulo: string;
  autor: string;
  genero: string;
  status: "quero_ler" | "lendo" | "concluido" | "abandonado";
  progresso: number;
  nota: number;
  dataInicio: string | null;
  dataFim: string | null;
  resumo: string | null;
  cor: string;
  totalPaginas: number | null;
  capa: string | null;
  favorito: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Video {
  id: number;
  titulo: string;
  link: string | null;
  plataforma: string;
  categoria: string;
  tema: string | null;
  thumbnail: string | null;
  status: "quero_ver" | "vendo" | "concluido";
  dataInicio: string | null;
  dataFim: string | null;
  resumo: string | null;
  insights: string | null;
  pontosImportantes: string | null;
  frasesMarcantes: string | null;
  favorito: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Frase {
  id: number;
  livroId: number;
  frase: string;
  pagina: string | null;
  tag: string | null;
  createdAt: string;
}

export interface Insight {
  id: number;
  livroId: number;
  conteudo: string;
  tag: string | null;
  createdAt: string;
}

export const livrosApi = {
  list: () => req<Livro[]>("GET", "/api/conhecimento/livros"),
  get: (id: number) => req<Livro>("GET", `/api/conhecimento/livros/${id}`),
  create: (data: Omit<Livro, "id" | "createdAt" | "updatedAt">) => req<Livro>("POST", "/api/conhecimento/livros", data),
  update: (id: number, data: Partial<Livro>) => req<Livro>("PUT", `/api/conhecimento/livros/${id}`, data),
  remove: (id: number) => req<{ ok: true }>("DELETE", `/api/conhecimento/livros/${id}`),
  toggleFavorito: (id: number) => req<Livro>("PATCH", `/api/conhecimento/livros/${id}/favorito`),
};

export const frasesApi = {
  list: (livroId: number) => req<Frase[]>("GET", `/api/conhecimento/frases?livroId=${livroId}`),
  create: (data: { livroId: number; frase: string; pagina?: string; tag?: string }) => req<Frase>("POST", "/api/conhecimento/frases", data),
  remove: (id: number) => req<{ ok: true }>("DELETE", `/api/conhecimento/frases/${id}`),
};

export const insightsApi = {
  list: (livroId: number) => req<Insight[]>("GET", `/api/conhecimento/insights?livroId=${livroId}`),
  create: (data: { livroId: number; conteudo: string; tag?: string }) => req<Insight>("POST", "/api/conhecimento/insights", data),
  remove: (id: number) => req<{ ok: true }>("DELETE", `/api/conhecimento/insights/${id}`),
};

export interface Artigo {
  id: number;
  titulo: string;
  fonte: string | null;
  tema: string;
  dataLeitura: string | null;
  resumo: string | null;
  cor: string;
  favorito: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ArtigoInsight {
  id: number;
  artigoId: number;
  conteudo: string;
  tag: string | null;
  createdAt: string;
}

export const artigosApi = {
  list: () => req<Artigo[]>("GET", "/api/conhecimento/artigos"),
  get: (id: number) => req<Artigo>("GET", `/api/conhecimento/artigos/${id}`),
  create: (data: Omit<Artigo, "id" | "createdAt" | "updatedAt">) => req<Artigo>("POST", "/api/conhecimento/artigos", data),
  update: (id: number, data: Partial<Artigo>) => req<Artigo>("PUT", `/api/conhecimento/artigos/${id}`, data),
  remove: (id: number) => req<{ ok: true }>("DELETE", `/api/conhecimento/artigos/${id}`),
  toggleFavorito: (id: number) => req<Artigo>("PATCH", `/api/conhecimento/artigos/${id}/favorito`),
};

export const artigoInsightsApi = {
  list: (artigoId: number) => req<ArtigoInsight[]>("GET", `/api/conhecimento/artigo-insights?artigoId=${artigoId}`),
  create: (data: { artigoId: number; conteudo: string; tag?: string }) => req<ArtigoInsight>("POST", "/api/conhecimento/artigo-insights", data),
  remove: (id: number) => req<{ ok: true }>("DELETE", `/api/conhecimento/artigo-insights/${id}`),
};

export const videosApi = {
  list: () => req<Video[]>("GET", "/api/conhecimento/videos"),
  get: (id: number) => req<Video>("GET", `/api/conhecimento/videos/${id}`),
  create: (data: Omit<Video, "id" | "createdAt" | "updatedAt">) => req<Video>("POST", "/api/conhecimento/videos", data),
  update: (id: number, data: Partial<Video>) => req<Video>("PUT", `/api/conhecimento/videos/${id}`, data),
  remove: (id: number) => req<{ ok: true }>("DELETE", `/api/conhecimento/videos/${id}`),
  toggleFavorito: (id: number) => req<Video>("PATCH", `/api/conhecimento/videos/${id}/favorito`),
};
