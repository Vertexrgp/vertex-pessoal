import { Router } from "express";
import { db } from "@workspace/db";
import { conhecimentoLivros, conhecimentoFrases, conhecimentoInsights } from "@workspace/db";
import { eq, desc, asc } from "drizzle-orm";

const router = Router();

// ─── LIVROS ───────────────────────────────────────────────────────────────────

router.get("/conhecimento/livros", async (_req, res) => {
  try {
    const livros = await db.select().from(conhecimentoLivros).orderBy(desc(conhecimentoLivros.createdAt));
    res.json(livros);
  } catch {
    res.status(500).json({ error: "Erro ao buscar livros" });
  }
});

router.get("/conhecimento/livros/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [livro] = await db.select().from(conhecimentoLivros).where(eq(conhecimentoLivros.id, id));
    if (!livro) return res.status(404).json({ error: "Livro não encontrado" });
    res.json(livro);
  } catch {
    res.status(500).json({ error: "Erro ao buscar livro" });
  }
});

router.post("/conhecimento/livros", async (req, res) => {
  try {
    const { titulo, autor, genero, status, progresso, nota, dataInicio, dataFim, resumo, cor, totalPaginas } = req.body;
    if (!titulo || !autor) return res.status(400).json({ error: "titulo e autor são obrigatórios" });
    const [livro] = await db
      .insert(conhecimentoLivros)
      .values({ titulo, autor, genero: genero || "geral", status: status || "quero_ler", progresso: progresso ?? 0, nota: nota ?? 0, dataInicio: dataInicio || null, dataFim: dataFim || null, resumo: resumo || null, cor: cor || "#F59E0B", totalPaginas: totalPaginas || null })
      .returning();
    res.json(livro);
  } catch {
    res.status(500).json({ error: "Erro ao criar livro" });
  }
});

router.put("/conhecimento/livros/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, autor, genero, status, progresso, nota, dataInicio, dataFim, resumo, cor, totalPaginas } = req.body;
    const [updated] = await db
      .update(conhecimentoLivros)
      .set({ titulo, autor, genero, status, progresso, nota, dataInicio, dataFim, resumo, cor, totalPaginas, updatedAt: new Date() })
      .where(eq(conhecimentoLivros.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Livro não encontrado" });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao atualizar livro" });
  }
});

router.delete("/conhecimento/livros/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(conhecimentoLivros).where(eq(conhecimentoLivros.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao deletar livro" });
  }
});

// ─── FRASES ───────────────────────────────────────────────────────────────────

router.get("/conhecimento/frases", async (req, res) => {
  try {
    const livroId = req.query.livroId ? parseInt(req.query.livroId as string) : null;
    const frases = livroId
      ? await db.select().from(conhecimentoFrases).where(eq(conhecimentoFrases.livroId, livroId)).orderBy(desc(conhecimentoFrases.createdAt))
      : await db.select().from(conhecimentoFrases).orderBy(desc(conhecimentoFrases.createdAt));
    res.json(frases);
  } catch {
    res.status(500).json({ error: "Erro ao buscar frases" });
  }
});

router.post("/conhecimento/frases", async (req, res) => {
  try {
    const { livroId, frase, pagina, tag } = req.body;
    if (!livroId || !frase) return res.status(400).json({ error: "livroId e frase são obrigatórios" });
    const [f] = await db.insert(conhecimentoFrases).values({ livroId: parseInt(livroId), frase, pagina: pagina || null, tag: tag || null }).returning();
    res.json(f);
  } catch {
    res.status(500).json({ error: "Erro ao criar frase" });
  }
});

router.delete("/conhecimento/frases/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(conhecimentoFrases).where(eq(conhecimentoFrases.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao deletar frase" });
  }
});

// ─── INSIGHTS ─────────────────────────────────────────────────────────────────

router.get("/conhecimento/insights", async (req, res) => {
  try {
    const livroId = req.query.livroId ? parseInt(req.query.livroId as string) : null;
    const insights = livroId
      ? await db.select().from(conhecimentoInsights).where(eq(conhecimentoInsights.livroId, livroId)).orderBy(desc(conhecimentoInsights.createdAt))
      : await db.select().from(conhecimentoInsights).orderBy(desc(conhecimentoInsights.createdAt));
    res.json(insights);
  } catch {
    res.status(500).json({ error: "Erro ao buscar insights" });
  }
});

router.post("/conhecimento/insights", async (req, res) => {
  try {
    const { livroId, conteudo, tag } = req.body;
    if (!livroId || !conteudo) return res.status(400).json({ error: "livroId e conteudo são obrigatórios" });
    const [ins] = await db.insert(conhecimentoInsights).values({ livroId: parseInt(livroId), conteudo, tag: tag || null }).returning();
    res.json(ins);
  } catch {
    res.status(500).json({ error: "Erro ao criar insight" });
  }
});

router.delete("/conhecimento/insights/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(conhecimentoInsights).where(eq(conhecimentoInsights.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao deletar insight" });
  }
});

export default router;
