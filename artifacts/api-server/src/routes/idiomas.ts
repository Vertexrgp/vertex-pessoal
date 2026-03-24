import { Router } from "express";
import { db } from "@workspace/db";
import { idiomaConfig, idiomaSessoes, idiomaVocabulario } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

export const idiomasRouter = Router();

idiomasRouter.get("/config/:idioma", async (req, res) => {
  try {
    const { idioma } = req.params;
    let [cfg] = await db.select().from(idiomaConfig).where(eq(idiomaConfig.idioma, idioma));
    if (!cfg) {
      [cfg] = await db.insert(idiomaConfig).values({ idioma, nivelAtual: "B1", nivelMeta: "B2" }).returning();
    }
    res.json(cfg);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

idiomasRouter.put("/config/:idioma", async (req, res) => {
  try {
    const { idioma } = req.params;
    const { nivelAtual, nivelMeta } = req.body;
    let [cfg] = await db.select().from(idiomaConfig).where(eq(idiomaConfig.idioma, idioma));
    if (!cfg) {
      [cfg] = await db.insert(idiomaConfig).values({ idioma, nivelAtual: nivelAtual ?? "B1", nivelMeta: nivelMeta ?? "B2" }).returning();
    } else {
      const upd: Record<string, unknown> = { updatedAt: new Date() };
      if (nivelAtual !== undefined) upd.nivelAtual = nivelAtual;
      if (nivelMeta !== undefined) upd.nivelMeta = nivelMeta;
      [cfg] = await db.update(idiomaConfig).set(upd).where(eq(idiomaConfig.idioma, idioma)).returning();
    }
    res.json(cfg);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

idiomasRouter.get("/sessoes/:idioma", async (req, res) => {
  try {
    const { idioma } = req.params;
    const rows = await db.select().from(idiomaSessoes).where(eq(idiomaSessoes.idioma, idioma)).orderBy(desc(idiomaSessoes.data));
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

idiomasRouter.post("/sessoes/:idioma", async (req, res) => {
  try {
    const { idioma } = req.params;
    const { data, duracao, tipo, concluida, notas } = req.body;
    if (!data) return res.status(400).json({ error: "data é obrigatório" });
    const [row] = await db.insert(idiomaSessoes).values({
      idioma, data,
      duracao: duracao ? parseInt(duracao) : null,
      tipo: tipo || null,
      concluida: concluida ?? false,
      notas: notas || null,
    }).returning();
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

idiomasRouter.put("/sessoes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { data, duracao, tipo, concluida, notas } = req.body;
    const upd: Record<string, unknown> = { updatedAt: new Date() };
    if (data !== undefined) upd.data = data;
    if (duracao !== undefined) upd.duracao = duracao ? parseInt(duracao) : null;
    if (tipo !== undefined) upd.tipo = tipo || null;
    if (concluida !== undefined) upd.concluida = concluida;
    if (notas !== undefined) upd.notas = notas || null;
    const [row] = await db.update(idiomaSessoes).set(upd).where(eq(idiomaSessoes.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Sessão não encontrada" });
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

idiomasRouter.delete("/sessoes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(idiomaSessoes).where(eq(idiomaSessoes.id, id));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

idiomasRouter.get("/vocabulario/:idioma", async (req, res) => {
  try {
    const { idioma } = req.params;
    const rows = await db.select().from(idiomaVocabulario).where(eq(idiomaVocabulario.idioma, idioma)).orderBy(desc(idiomaVocabulario.createdAt));
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

idiomasRouter.post("/vocabulario/:idioma", async (req, res) => {
  try {
    const { idioma } = req.params;
    const { palavra, traducao, nivel, aprendida, notas } = req.body;
    if (!palavra || !traducao) return res.status(400).json({ error: "palavra e traducao são obrigatórios" });
    const [row] = await db.insert(idiomaVocabulario).values({
      idioma, palavra, traducao,
      nivel: nivel || null,
      aprendida: aprendida ?? false,
      notas: notas || null,
    }).returning();
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

idiomasRouter.put("/vocabulario/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { palavra, traducao, nivel, aprendida, notas } = req.body;
    const upd: Record<string, unknown> = { updatedAt: new Date() };
    if (palavra !== undefined) upd.palavra = palavra;
    if (traducao !== undefined) upd.traducao = traducao;
    if (nivel !== undefined) upd.nivel = nivel || null;
    if (aprendida !== undefined) upd.aprendida = aprendida;
    if (notas !== undefined) upd.notas = notas || null;
    const [row] = await db.update(idiomaVocabulario).set(upd).where(eq(idiomaVocabulario.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Palavra não encontrada" });
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

idiomasRouter.delete("/vocabulario/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(idiomaVocabulario).where(eq(idiomaVocabulario.id, id));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
