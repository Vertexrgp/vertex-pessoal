import { Router } from "express";
import { db } from "@workspace/db";
import { conhecimentoLivros, conhecimentoFrases, conhecimentoInsights, conhecimentoArtigos, conhecimentoArtigoInsights, conhecimentoVideos } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";

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
    const { titulo, autor, genero, status, progresso, currentPage, nota, dataInicio, dataFim, resumo, cor, totalPaginas, capa, favorito } = req.body;
    if (!titulo || !autor) return res.status(400).json({ error: "titulo e autor são obrigatórios" });
    const computedProgresso = (() => {
      if (currentPage != null && totalPaginas != null && totalPaginas > 0) return Math.round((currentPage / totalPaginas) * 100);
      return progresso ?? 0;
    })();
    const [livro] = await db
      .insert(conhecimentoLivros)
      .values({ titulo, autor, genero: genero || "geral", status: status || "quero_ler", progresso: computedProgresso, currentPage: currentPage ?? null, nota: nota ?? 0, dataInicio: dataInicio || null, dataFim: dataFim || null, resumo: resumo || null, cor: cor || "#F59E0B", totalPaginas: totalPaginas || null, capa: capa || null, favorito: favorito ?? false })
      .returning();
    res.json(livro);
  } catch {
    res.status(500).json({ error: "Erro ao criar livro" });
  }
});

router.put("/conhecimento/livros/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, autor, genero, status, progresso, currentPage, nota, dataInicio, dataFim, resumo, cor, totalPaginas, capa, favorito } = req.body;
    const setData: Record<string, unknown> = { updatedAt: new Date() };
    if (titulo !== undefined) setData.titulo = titulo;
    if (autor !== undefined) setData.autor = autor;
    if (genero !== undefined) setData.genero = genero;
    if (status !== undefined) setData.status = status;
    if (nota !== undefined) setData.nota = nota;
    if (dataInicio !== undefined) setData.dataInicio = dataInicio;
    if (dataFim !== undefined) setData.dataFim = dataFim;
    if (resumo !== undefined) setData.resumo = resumo;
    if (cor !== undefined) setData.cor = cor;
    if (totalPaginas !== undefined) setData.totalPaginas = totalPaginas;
    if (capa !== undefined) setData.capa = capa;
    if (favorito !== undefined) setData.favorito = favorito;
    if (currentPage !== undefined) {
      setData.currentPage = currentPage;
      if (totalPaginas != null && totalPaginas > 0) {
        setData.progresso = Math.min(100, Math.round((currentPage / totalPaginas) * 100));
      }
    } else if (progresso !== undefined) {
      setData.progresso = progresso;
    }
    const [updated] = await db
      .update(conhecimentoLivros)
      .set(setData as Parameters<typeof db.update>[0] extends infer T ? any : any)
      .where(eq(conhecimentoLivros.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Livro não encontrado" });
    res.json(updated);
  } catch (e) {
    console.error(e);
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
    const { livroId, frase, pagina, tag, imagemUrl, favorito } = req.body;
    if (!livroId || !frase) return res.status(400).json({ error: "livroId e frase são obrigatórios" });
    const [f] = await db.insert(conhecimentoFrases).values({ livroId: parseInt(livroId), frase, pagina: pagina || null, tag: tag || null, imagemUrl: imagemUrl || null, favorito: favorito ?? false }).returning();
    res.json(f);
  } catch {
    res.status(500).json({ error: "Erro ao criar frase" });
  }
});

router.patch("/conhecimento/frases/:id/favorito", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select().from(conhecimentoFrases).where(eq(conhecimentoFrases.id, id));
    if (!current) return res.status(404).json({ error: "Frase não encontrada" });
    const [updated] = await db.update(conhecimentoFrases).set({ favorito: !current.favorito }).where(eq(conhecimentoFrases.id, id)).returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao alternar favorito" });
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

// ─── OCR ──────────────────────────────────────────────────────────────────────

router.post("/conhecimento/ocr", async (req, res) => {
  try {
    const { imagemBase64, mimeType } = req.body;
    if (!imagemBase64) return res.status(400).json({ error: "imagemBase64 é obrigatório" });

    const openai = new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "dummy",
    });

    const mime = mimeType || "image/jpeg";
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${imagemBase64}` },
            },
            {
              type: "text",
              text: "Extraia todo o texto visível nesta imagem de página de livro. Retorne apenas o texto extraído, sem comentários, explicações ou formatação extra. Preserve quebras de parágrafo.",
            },
          ],
        },
      ],
    });

    const texto = response.choices[0]?.message?.content ?? "";
    res.json({ texto });
  } catch (e) {
    console.error("OCR error:", e);
    res.status(500).json({ error: "Erro ao extrair texto da imagem" });
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

// ─── ARTIGOS ──────────────────────────────────────────────────────────────────

router.get("/conhecimento/artigos", async (_req, res) => {
  try {
    const artigos = await db.select().from(conhecimentoArtigos).orderBy(desc(conhecimentoArtigos.createdAt));
    res.json(artigos);
  } catch {
    res.status(500).json({ error: "Erro ao buscar artigos" });
  }
});

router.get("/conhecimento/artigos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [artigo] = await db.select().from(conhecimentoArtigos).where(eq(conhecimentoArtigos.id, id));
    if (!artigo) return res.status(404).json({ error: "Artigo não encontrado" });
    res.json(artigo);
  } catch {
    res.status(500).json({ error: "Erro ao buscar artigo" });
  }
});

router.post("/conhecimento/artigos", async (req, res) => {
  try {
    const { titulo, fonte, tema, dataLeitura, resumo, cor, favorito } = req.body;
    if (!titulo) return res.status(400).json({ error: "titulo é obrigatório" });
    const [artigo] = await db
      .insert(conhecimentoArtigos)
      .values({ titulo, fonte: fonte || null, tema: tema || "geral", dataLeitura: dataLeitura || null, resumo: resumo || null, cor: cor || "#6366F1", favorito: favorito ?? false })
      .returning();
    res.json(artigo);
  } catch {
    res.status(500).json({ error: "Erro ao criar artigo" });
  }
});

router.put("/conhecimento/artigos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, fonte, tema, dataLeitura, resumo, cor, favorito } = req.body;
    const [updated] = await db
      .update(conhecimentoArtigos)
      .set({ titulo, fonte, tema, dataLeitura, resumo, cor, favorito: favorito !== undefined ? favorito : undefined, updatedAt: new Date() })
      .where(eq(conhecimentoArtigos.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Artigo não encontrado" });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao atualizar artigo" });
  }
});

router.delete("/conhecimento/artigos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(conhecimentoArtigos).where(eq(conhecimentoArtigos.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao deletar artigo" });
  }
});

// ─── ARTIGO INSIGHTS ──────────────────────────────────────────────────────────

router.get("/conhecimento/artigo-insights", async (req, res) => {
  try {
    const artigoId = req.query.artigoId ? parseInt(req.query.artigoId as string) : null;
    const insights = artigoId
      ? await db.select().from(conhecimentoArtigoInsights).where(eq(conhecimentoArtigoInsights.artigoId, artigoId)).orderBy(desc(conhecimentoArtigoInsights.createdAt))
      : await db.select().from(conhecimentoArtigoInsights).orderBy(desc(conhecimentoArtigoInsights.createdAt));
    res.json(insights);
  } catch {
    res.status(500).json({ error: "Erro ao buscar insights" });
  }
});

router.post("/conhecimento/artigo-insights", async (req, res) => {
  try {
    const { artigoId, conteudo, tag } = req.body;
    if (!artigoId || !conteudo) return res.status(400).json({ error: "artigoId e conteudo são obrigatórios" });
    const [ins] = await db
      .insert(conhecimentoArtigoInsights)
      .values({ artigoId: parseInt(artigoId), conteudo, tag: tag || null })
      .returning();
    res.json(ins);
  } catch {
    res.status(500).json({ error: "Erro ao criar insight" });
  }
});

router.delete("/conhecimento/artigo-insights/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(conhecimentoArtigoInsights).where(eq(conhecimentoArtigoInsights.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao deletar insight" });
  }
});

// ─── VÍDEOS ───────────────────────────────────────────────────────────────────

router.get("/conhecimento/videos", async (_req, res) => {
  try {
    const videos = await db.select().from(conhecimentoVideos).orderBy(desc(conhecimentoVideos.createdAt));
    res.json(videos);
  } catch {
    res.status(500).json({ error: "Erro ao buscar vídeos" });
  }
});

router.get("/conhecimento/videos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [video] = await db.select().from(conhecimentoVideos).where(eq(conhecimentoVideos.id, id));
    if (!video) return res.status(404).json({ error: "Vídeo não encontrado" });
    res.json(video);
  } catch {
    res.status(500).json({ error: "Erro ao buscar vídeo" });
  }
});

router.post("/conhecimento/videos", async (req, res) => {
  try {
    const { titulo, link, plataforma, categoria, tema, thumbnail, status, dataInicio, dataFim, resumo, insights, pontosImportantes, frasesMarcantes, favorito } = req.body;
    if (!titulo) return res.status(400).json({ error: "titulo é obrigatório" });
    const [video] = await db
      .insert(conhecimentoVideos)
      .values({
        titulo,
        link: link || null,
        plataforma: plataforma || "YouTube",
        categoria: categoria || "Outros",
        tema: tema || null,
        thumbnail: thumbnail || null,
        status: status || "quero_ver",
        dataInicio: dataInicio || null,
        dataFim: dataFim || null,
        resumo: resumo || null,
        insights: insights || null,
        pontosImportantes: pontosImportantes || null,
        frasesMarcantes: frasesMarcantes || null,
        favorito: favorito ?? false,
      })
      .returning();
    res.json(video);
  } catch {
    res.status(500).json({ error: "Erro ao criar vídeo" });
  }
});

router.put("/conhecimento/videos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, link, plataforma, categoria, tema, thumbnail, status, dataInicio, dataFim, resumo, insights, pontosImportantes, frasesMarcantes, favorito } = req.body;
    const [updated] = await db
      .update(conhecimentoVideos)
      .set({ titulo, link, plataforma, categoria, tema, thumbnail, status, dataInicio, dataFim, resumo, insights, pontosImportantes, frasesMarcantes, favorito: favorito !== undefined ? favorito : undefined, updatedAt: new Date() })
      .where(eq(conhecimentoVideos.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Vídeo não encontrado" });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao atualizar vídeo" });
  }
});

router.delete("/conhecimento/videos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(conhecimentoVideos).where(eq(conhecimentoVideos.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao deletar vídeo" });
  }
});

// ─── TOGGLE FAVORITO ──────────────────────────────────────────────────────────

router.patch("/conhecimento/livros/:id/favorito", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select().from(conhecimentoLivros).where(eq(conhecimentoLivros.id, id));
    if (!current) return res.status(404).json({ error: "Livro não encontrado" });
    const [updated] = await db.update(conhecimentoLivros).set({ favorito: !current.favorito, updatedAt: new Date() }).where(eq(conhecimentoLivros.id, id)).returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao alternar favorito" });
  }
});

router.patch("/conhecimento/artigos/:id/favorito", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select().from(conhecimentoArtigos).where(eq(conhecimentoArtigos.id, id));
    if (!current) return res.status(404).json({ error: "Artigo não encontrado" });
    const [updated] = await db.update(conhecimentoArtigos).set({ favorito: !current.favorito, updatedAt: new Date() }).where(eq(conhecimentoArtigos.id, id)).returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao alternar favorito" });
  }
});

router.patch("/conhecimento/videos/:id/favorito", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select().from(conhecimentoVideos).where(eq(conhecimentoVideos.id, id));
    if (!current) return res.status(404).json({ error: "Vídeo não encontrado" });
    const [updated] = await db.update(conhecimentoVideos).set({ favorito: !current.favorito, updatedAt: new Date() }).where(eq(conhecimentoVideos.id, id)).returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Erro ao alternar favorito" });
  }
});

export default router;
