import { Router } from "express";
import { db } from "@workspace/db";
import {
  vidaProjetos, vidaCidades, vidaCustoVida,
  vidaProsContras, vidaPlanoAcao, vidaCheckpoints,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// ─── Projetos ──────────────────────────────────────────────────────────────────

router.get("/vida/projetos", async (_req, res) => {
  try {
    const projetos = await db.select().from(vidaProjetos).orderBy(desc(vidaProjetos.createdAt));
    const result = await Promise.all(
      projetos.map(async (p) => {
        const cidades = await db.select().from(vidaCidades).where(eq(vidaCidades.projetoId, p.id));
        return { ...p, cidadesCount: cidades.length };
      })
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar projetos" });
  }
});

router.post("/vida/projetos", async (req, res) => {
  try {
    const { titulo, descricao, tipo, status } = req.body;
    if (!titulo) return res.status(400).json({ error: "titulo é obrigatório" });
    const [p] = await db.insert(vidaProjetos).values({ titulo, descricao, tipo: tipo || "mudanca_pais", status: status || "explorando" }).returning();
    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar projeto" });
  }
});

router.get("/vida/projetos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [projeto] = await db.select().from(vidaProjetos).where(eq(vidaProjetos.id, id));
    if (!projeto) return res.status(404).json({ error: "Projeto não encontrado" });

    const cidades = await db.select().from(vidaCidades).where(eq(vidaCidades.projetoId, id));
    const cidadesComDados = await Promise.all(
      cidades.map(async (c) => {
        const [custo] = await db.select().from(vidaCustoVida).where(eq(vidaCustoVida.cidadeId, c.id));
        const pros = await db.select().from(vidaProsContras).where(eq(vidaProsContras.cidadeId, c.id));
        return { ...c, custoVida: custo || null, prosContras: pros };
      })
    );

    const planoAcao = await db.select().from(vidaPlanoAcao).where(eq(vidaPlanoAcao.projetoId, id)).orderBy(vidaPlanoAcao.ordem);
    const checkpoints = await db.select().from(vidaCheckpoints).where(eq(vidaCheckpoints.projetoId, id)).orderBy(vidaCheckpoints.createdAt);

    res.json({ ...projeto, cidades: cidadesComDados, planoAcao, checkpoints });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar projeto" });
  }
});

router.put("/vida/projetos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, descricao, tipo, status } = req.body;
    const [p] = await db.update(vidaProjetos).set({ titulo, descricao, tipo, status, updatedAt: new Date() }).where(eq(vidaProjetos.id, id)).returning();
    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar projeto" });
  }
});

router.delete("/vida/projetos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(vidaCheckpoints).where(eq(vidaCheckpoints.projetoId, id));
    await db.delete(vidaPlanoAcao).where(eq(vidaPlanoAcao.projetoId, id));
    const cidades = await db.select().from(vidaCidades).where(eq(vidaCidades.projetoId, id));
    for (const c of cidades) {
      await db.delete(vidaProsContras).where(eq(vidaProsContras.cidadeId, c.id));
      await db.delete(vidaCustoVida).where(eq(vidaCustoVida.cidadeId, c.id));
    }
    await db.delete(vidaCidades).where(eq(vidaCidades.projetoId, id));
    await db.delete(vidaProjetos).where(eq(vidaProjetos.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar projeto" });
  }
});

// ─── Cidades ──────────────────────────────────────────────────────────────────

router.post("/vida/projetos/:id/cidades", async (req, res) => {
  try {
    const projetoId = parseInt(req.params.id);
    const { nome, pais, moeda, qualidadeVida, facilidadeAdaptacao, observacoes } = req.body;
    if (!nome || !pais) return res.status(400).json({ error: "nome e pais são obrigatórios" });
    const [c] = await db.insert(vidaCidades).values({ projetoId, nome, pais, moeda: moeda || "USD", qualidadeVida, facilidadeAdaptacao, observacoes }).returning();
    await db.insert(vidaCustoVida).values({ cidadeId: c.id });
    res.json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar cidade" });
  }
});

router.put("/vida/cidades/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nome, pais, moeda, qualidadeVida, facilidadeAdaptacao, observacoes } = req.body;
    const [c] = await db.update(vidaCidades).set({ nome, pais, moeda, qualidadeVida, facilidadeAdaptacao, observacoes, updatedAt: new Date() }).where(eq(vidaCidades.id, id)).returning();
    res.json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar cidade" });
  }
});

router.delete("/vida/cidades/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(vidaProsContras).where(eq(vidaProsContras.cidadeId, id));
    await db.delete(vidaCustoVida).where(eq(vidaCustoVida.cidadeId, id));
    await db.delete(vidaCidades).where(eq(vidaCidades.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar cidade" });
  }
});

// ─── Custo de Vida ─────────────────────────────────────────────────────────────

router.put("/vida/cidades/:id/custo-vida", async (req, res) => {
  try {
    const cidadeId = parseInt(req.params.id);
    const { aluguel, transporte, alimentacao, saude, impostos, lazer, outros } = req.body;
    const [existing] = await db.select().from(vidaCustoVida).where(eq(vidaCustoVida.cidadeId, cidadeId));
    if (existing) {
      const [c] = await db.update(vidaCustoVida).set({ aluguel: aluguel || 0, transporte: transporte || 0, alimentacao: alimentacao || 0, saude: saude || 0, impostos: impostos || 0, lazer: lazer || 0, outros: outros || 0, updatedAt: new Date() }).where(eq(vidaCustoVida.cidadeId, cidadeId)).returning();
      res.json(c);
    } else {
      const [c] = await db.insert(vidaCustoVida).values({ cidadeId, aluguel: aluguel || 0, transporte: transporte || 0, alimentacao: alimentacao || 0, saude: saude || 0, impostos: impostos || 0, lazer: lazer || 0, outros: outros || 0 }).returning();
      res.json(c);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar custo de vida" });
  }
});

// ─── Prós e Contras ───────────────────────────────────────────────────────────

router.post("/vida/cidades/:id/pros-contras", async (req, res) => {
  try {
    const cidadeId = parseInt(req.params.id);
    const { tipo, descricao } = req.body;
    if (!tipo || !descricao) return res.status(400).json({ error: "tipo e descricao são obrigatórios" });
    const [p] = await db.insert(vidaProsContras).values({ cidadeId, tipo, descricao }).returning();
    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao adicionar pró/contra" });
  }
});

router.delete("/vida/pros-contras/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(vidaProsContras).where(eq(vidaProsContras.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar" });
  }
});

// ─── Plano de Ação ─────────────────────────────────────────────────────────────

router.post("/vida/projetos/:id/plano-acao", async (req, res) => {
  try {
    const projetoId = parseInt(req.params.id);
    const { titulo, descricao, prazo, status, ordem } = req.body;
    if (!titulo) return res.status(400).json({ error: "titulo é obrigatório" });
    const [p] = await db.insert(vidaPlanoAcao).values({ projetoId, titulo, descricao, prazo, status: status || "pendente", ordem: ordem || 0 }).returning();
    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar item do plano" });
  }
});

router.put("/vida/plano-acao/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, descricao, prazo, status, ordem } = req.body;
    const [p] = await db.update(vidaPlanoAcao).set({ titulo, descricao, prazo, status, ordem, updatedAt: new Date() }).where(eq(vidaPlanoAcao.id, id)).returning();
    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar item" });
  }
});

router.delete("/vida/plano-acao/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(vidaPlanoAcao).where(eq(vidaPlanoAcao.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar" });
  }
});

// ─── Checkpoints ──────────────────────────────────────────────────────────────

router.post("/vida/projetos/:id/checkpoints", async (req, res) => {
  try {
    const projetoId = parseInt(req.params.id);
    const { titulo, descricao, dataAlvo, status } = req.body;
    if (!titulo) return res.status(400).json({ error: "titulo é obrigatório" });
    const [c] = await db.insert(vidaCheckpoints).values({ projetoId, titulo, descricao, dataAlvo, status: status || "pendente" }).returning();
    res.json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar checkpoint" });
  }
});

router.put("/vida/checkpoints/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, descricao, dataAlvo, status } = req.body;
    const [c] = await db.update(vidaCheckpoints).set({ titulo, descricao, dataAlvo, status, updatedAt: new Date() }).where(eq(vidaCheckpoints.id, id)).returning();
    res.json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar checkpoint" });
  }
});

router.delete("/vida/checkpoints/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(vidaCheckpoints).where(eq(vidaCheckpoints.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar checkpoint" });
  }
});

// ─── Simulação Financeira ─────────────────────────────────────────────────────

router.get("/vida/cidades/:id/simulacao", async (req, res) => {
  try {
    const cidadeId = parseInt(req.params.id);
    const [cidade] = await db.select().from(vidaCidades).where(eq(vidaCidades.id, cidadeId));
    if (!cidade) return res.status(404).json({ error: "Cidade não encontrada" });
    const [custo] = await db.select().from(vidaCustoVida).where(eq(vidaCustoVida.cidadeId, cidadeId));

    const total = custo
      ? (custo.aluguel || 0) + (custo.transporte || 0) + (custo.alimentacao || 0) + (custo.saude || 0) + (custo.impostos || 0) + (custo.lazer || 0) + (custo.outros || 0)
      : 0;

    res.json({ cidade, custoMensal: total, custoAnual: total * 12 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro na simulação" });
  }
});

export default router;
