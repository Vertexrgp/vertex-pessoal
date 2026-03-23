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
