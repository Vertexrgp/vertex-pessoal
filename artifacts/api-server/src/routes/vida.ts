import { Router } from "express";
import { db } from "@workspace/db";
import {
  vidaProjetos, vidaCidades, vidaCustoVida, vidaProsContras, vidaPlanoAcao, vidaCheckpoints,
  vidaTrabalho, vidaVisto, vidaQualidade, vidaScorePesos,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function totalCusto(c: typeof vidaCustoVida.$inferSelect | null): number {
  if (!c) return 0;
  return (c.aluguel || 0) + (c.condominio || 0) + (c.energiaGas || 0) + (c.internetCelular || 0) +
    (c.mercado || 0) + (c.alimentacaoFora || 0) + (c.transporte || 0) + (c.saude || 0) +
    (c.academia || 0) + (c.lazer || 0) + (c.impostos || 0) + (c.custosExtras || 0) +
    (c.alimentacao || 0) + (c.outros || 0);
}

async function getCidadeCompleta(cidadeId: number) {
  const [cidade] = await db.select().from(vidaCidades).where(eq(vidaCidades.id, cidadeId));
  if (!cidade) return null;
  const [custo] = await db.select().from(vidaCustoVida).where(eq(vidaCustoVida.cidadeId, cidadeId));
  const [trabalho] = await db.select().from(vidaTrabalho).where(eq(vidaTrabalho.cidadeId, cidadeId));
  const [visto] = await db.select().from(vidaVisto).where(eq(vidaVisto.cidadeId, cidadeId));
  const [qualidade] = await db.select().from(vidaQualidade).where(eq(vidaQualidade.cidadeId, cidadeId));
  const pros = await db.select().from(vidaProsContras).where(eq(vidaProsContras.cidadeId, cidadeId));
  return { ...cidade, custoVida: custo || null, trabalho: trabalho || null, visto: visto || null, qualidade: qualidade || null, prosContras: pros };
}

function calcScore(cidade: Awaited<ReturnType<typeof getCidadeCompleta>>, pesos: typeof vidaScorePesos.$inferSelect | null, allCidades: Awaited<ReturnType<typeof getCidadeCompleta>>[]) {
  if (!cidade) return 0;
  const p = pesos || { pesoCusto: 20, pesoRenda: 25, pesoImigracao: 20, pesoSeguranca: 15, pesoAdaptacao: 10, pesoQualidade: 10 };
  const totalPesos = (p.pesoCusto + p.pesoRenda + p.pesoImigracao + p.pesoSeguranca + p.pesoAdaptacao + p.pesoQualidade) || 100;

  // Custo: menor custo = melhor score (normalize against max)
  const custos = allCidades.map((c) => totalCusto(c?.custoVida || null)).filter((v) => v > 0);
  const maxCusto = Math.max(...custos, 1);
  const minCusto = Math.min(...custos, maxCusto);
  const custoDiff = maxCusto - minCusto || 1;
  const myCusto = totalCusto(cidade.custoVida);
  const custoScore = myCusto > 0 ? ((maxCusto - myCusto) / custoDiff) * 10 : 5;

  // Renda: facilidade de recolocação 1-10
  const rendaScore = cidade.trabalho?.facilidadeRecolocacao ?? 5;

  // Imigração: nota viabilidade 1-10
  const imigracaoScore = cidade.visto?.notaViabilidade ?? 5;

  // Segurança: 1-10
  const segurancaScore = cidade.qualidade?.seguranca ?? 5;

  // Adaptação: adaptacao 1-10
  const adaptacaoScore = cidade.qualidade?.adaptacao ?? 5;

  // Qualidade: média dos outros scores de qualidade
  const q = cidade.qualidade;
  const qScores = [q?.saude, q?.transportePublico, q?.clima, q?.comunidadeBrasileira, q?.qualidadeFamilia, q?.qualidadeCarreira, q?.potencialFinanceiro].filter(Boolean) as number[];
  const qualidadeScore = qScores.length > 0 ? qScores.reduce((a, b) => a + b, 0) / qScores.length : 5;

  const weighted =
    (custoScore * p.pesoCusto +
      rendaScore * p.pesoRenda +
      imigracaoScore * p.pesoImigracao +
      segurancaScore * p.pesoSeguranca +
      adaptacaoScore * p.pesoAdaptacao +
      qualidadeScore * p.pesoQualidade) / totalPesos;

  return Math.round(weighted * 10) / 10;
}

// ─── Projetos ──────────────────────────────────────────────────────────────────

router.get("/vida/projetos", async (_req, res) => {
  try {
    const projetos = await db.select().from(vidaProjetos).orderBy(desc(vidaProjetos.createdAt));
    const result = await Promise.all(projetos.map(async (p) => {
      const cidades = await db.select().from(vidaCidades).where(eq(vidaCidades.projetoId, p.id));
      return { ...p, cidadesCount: cidades.length };
    }));
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao buscar projetos" }); }
});

router.post("/vida/projetos", async (req, res) => {
  try {
    const { titulo, descricao, tipo, status } = req.body;
    if (!titulo) return res.status(400).json({ error: "titulo é obrigatório" });
    const [p] = await db.insert(vidaProjetos).values({ titulo, descricao, tipo: tipo || "mudanca_pais", status: status || "explorando" }).returning();
    await db.insert(vidaScorePesos).values({ projetoId: p.id });
    res.json(p);
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao criar projeto" }); }
});

router.get("/vida/projetos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [projeto] = await db.select().from(vidaProjetos).where(eq(vidaProjetos.id, id));
    if (!projeto) return res.status(404).json({ error: "Projeto não encontrado" });

    const cidadesBase = await db.select().from(vidaCidades).where(eq(vidaCidades.projetoId, id));
    const cidades = await Promise.all(cidadesBase.map((c) => getCidadeCompleta(c.id)));

    const planoAcao = await db.select().from(vidaPlanoAcao).where(eq(vidaPlanoAcao.projetoId, id)).orderBy(vidaPlanoAcao.ordem);
    const checkpoints = await db.select().from(vidaCheckpoints).where(eq(vidaCheckpoints.projetoId, id)).orderBy(vidaCheckpoints.createdAt);
    const [pesos] = await db.select().from(vidaScorePesos).where(eq(vidaScorePesos.projetoId, id));

    const validCidades = cidades.filter(Boolean) as Awaited<ReturnType<typeof getCidadeCompleta>>[];
    const cidadesComScore = validCidades.map((c) => ({
      ...c,
      scoreCalculado: calcScore(c, pesos || null, validCidades),
    }));

    res.json({ ...projeto, cidades: cidadesComScore, planoAcao, checkpoints, scorePesos: pesos || null });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao buscar projeto" }); }
});

router.put("/vida/projetos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, descricao, tipo, status } = req.body;
    const [p] = await db.update(vidaProjetos).set({ titulo, descricao, tipo, status, updatedAt: new Date() }).where(eq(vidaProjetos.id, id)).returning();
    res.json(p);
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao atualizar projeto" }); }
});

router.delete("/vida/projetos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const cidades = await db.select().from(vidaCidades).where(eq(vidaCidades.projetoId, id));
    for (const c of cidades) {
      await db.delete(vidaProsContras).where(eq(vidaProsContras.cidadeId, c.id));
      await db.delete(vidaCustoVida).where(eq(vidaCustoVida.cidadeId, c.id));
      await db.delete(vidaTrabalho).where(eq(vidaTrabalho.cidadeId, c.id));
      await db.delete(vidaVisto).where(eq(vidaVisto.cidadeId, c.id));
      await db.delete(vidaQualidade).where(eq(vidaQualidade.cidadeId, c.id));
    }
    await db.delete(vidaCidades).where(eq(vidaCidades.projetoId, id));
    await db.delete(vidaCheckpoints).where(eq(vidaCheckpoints.projetoId, id));
    await db.delete(vidaPlanoAcao).where(eq(vidaPlanoAcao.projetoId, id));
    await db.delete(vidaScorePesos).where(eq(vidaScorePesos.projetoId, id));
    await db.delete(vidaProjetos).where(eq(vidaProjetos.id, id));
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao deletar projeto" }); }
});

// ─── Score Pesos ───────────────────────────────────────────────────────────────

router.put("/vida/projetos/:id/score-pesos", async (req, res) => {
  try {
    const projetoId = parseInt(req.params.id);
    const { pesoCusto, pesoRenda, pesoImigracao, pesoSeguranca, pesoAdaptacao, pesoQualidade } = req.body;
    const [existing] = await db.select().from(vidaScorePesos).where(eq(vidaScorePesos.projetoId, projetoId));
    if (existing) {
      const [r] = await db.update(vidaScorePesos).set({ pesoCusto, pesoRenda, pesoImigracao, pesoSeguranca, pesoAdaptacao, pesoQualidade, updatedAt: new Date() }).where(eq(vidaScorePesos.projetoId, projetoId)).returning();
      res.json(r);
    } else {
      const [r] = await db.insert(vidaScorePesos).values({ projetoId, pesoCusto, pesoRenda, pesoImigracao, pesoSeguranca, pesoAdaptacao, pesoQualidade }).returning();
      res.json(r);
    }
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao salvar pesos" }); }
});

// ─── Cidade Detail ────────────────────────────────────────────────────────────

router.get("/vida/cidades/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const cidade = await getCidadeCompleta(id);
    if (!cidade) return res.status(404).json({ error: "Cidade não encontrada" });
    res.json(cidade);
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao buscar cidade" }); }
});

// ─── Cidades CRUD ─────────────────────────────────────────────────────────────

router.post("/vida/projetos/:id/cidades", async (req, res) => {
  try {
    const projetoId = parseInt(req.params.id);
    const { nome, pais, estado, moeda, idiomasPrincipais, fusoHorario, clima, qualidadeVida, facilidadeAdaptacao, observacoes, prioridade } = req.body;
    if (!nome || !pais) return res.status(400).json({ error: "nome e pais são obrigatórios" });
    const [c] = await db.insert(vidaCidades).values({ projetoId, nome, pais, estado, moeda: moeda || "USD", idiomasPrincipais, fusoHorario, clima, qualidadeVida, facilidadeAdaptacao, observacoes, prioridade: prioridade || 0 }).returning();
    await db.insert(vidaCustoVida).values({ cidadeId: c.id });
    res.json(c);
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao criar cidade" }); }
});

router.put("/vida/cidades/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nome, pais, estado, moeda, idiomasPrincipais, fusoHorario, clima, qualidadeVida, facilidadeAdaptacao, observacoes, prioridade } = req.body;
    const [c] = await db.update(vidaCidades).set({ nome, pais, estado, moeda, idiomasPrincipais, fusoHorario, clima, qualidadeVida, facilidadeAdaptacao, observacoes, prioridade: prioridade || 0, updatedAt: new Date() }).where(eq(vidaCidades.id, id)).returning();
    res.json(c);
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao atualizar cidade" }); }
});

router.delete("/vida/cidades/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(vidaProsContras).where(eq(vidaProsContras.cidadeId, id));
    await db.delete(vidaCustoVida).where(eq(vidaCustoVida.cidadeId, id));
    await db.delete(vidaTrabalho).where(eq(vidaTrabalho.cidadeId, id));
    await db.delete(vidaVisto).where(eq(vidaVisto.cidadeId, id));
    await db.delete(vidaQualidade).where(eq(vidaQualidade.cidadeId, id));
    await db.delete(vidaCidades).where(eq(vidaCidades.id, id));
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao deletar cidade" }); }
});

// ─── Custo de Vida ─────────────────────────────────────────────────────────────

router.put("/vida/cidades/:id/custo-vida", async (req, res) => {
  try {
    const cidadeId = parseInt(req.params.id);
    const data = req.body;
    const fields = {
      aluguel: parseFloat(data.aluguel) || 0, condominio: parseFloat(data.condominio) || 0,
      energiaGas: parseFloat(data.energiaGas) || 0, internetCelular: parseFloat(data.internetCelular) || 0,
      mercado: parseFloat(data.mercado) || 0, alimentacaoFora: parseFloat(data.alimentacaoFora) || 0,
      transporte: parseFloat(data.transporte) || 0, saude: parseFloat(data.saude) || 0,
      academia: parseFloat(data.academia) || 0, lazer: parseFloat(data.lazer) || 0,
      impostos: parseFloat(data.impostos) || 0, custosExtras: parseFloat(data.custosExtras) || 0,
      alimentacao: parseFloat(data.alimentacao) || 0, outros: parseFloat(data.outros) || 0,
      updatedAt: new Date(),
    };
    const [existing] = await db.select().from(vidaCustoVida).where(eq(vidaCustoVida.cidadeId, cidadeId));
    if (existing) {
      const [r] = await db.update(vidaCustoVida).set(fields).where(eq(vidaCustoVida.cidadeId, cidadeId)).returning();
      res.json(r);
    } else {
      const [r] = await db.insert(vidaCustoVida).values({ cidadeId, ...fields }).returning();
      res.json(r);
    }
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao salvar custo de vida" }); }
});

// ─── Trabalho & Renda ─────────────────────────────────────────────────────────

router.put("/vida/cidades/:id/trabalho", async (req, res) => {
  try {
    const cidadeId = parseInt(req.params.id);
    const { rendaRafael, rendaFernanda, rendaFamiliar, faixaConservadora, faixaProvavel, faixaOtimista, demandaArea, exigenciaIdioma, validacaoProfissional, facilidadeRecolocacao, observacoes } = req.body;
    const fields = { rendaRafael: parseFloat(rendaRafael) || null, rendaFernanda: parseFloat(rendaFernanda) || null, rendaFamiliar: parseFloat(rendaFamiliar) || null, faixaConservadora: parseFloat(faixaConservadora) || null, faixaProvavel: parseFloat(faixaProvavel) || null, faixaOtimista: parseFloat(faixaOtimista) || null, demandaArea, exigenciaIdioma, validacaoProfissional, facilidadeRecolocacao: parseInt(facilidadeRecolocacao) || null, observacoes, updatedAt: new Date() };
    const [existing] = await db.select().from(vidaTrabalho).where(eq(vidaTrabalho.cidadeId, cidadeId));
    if (existing) {
      const [r] = await db.update(vidaTrabalho).set(fields).where(eq(vidaTrabalho.cidadeId, cidadeId)).returning();
      res.json(r);
    } else {
      const [r] = await db.insert(vidaTrabalho).values({ cidadeId, ...fields }).returning();
      res.json(r);
    }
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao salvar trabalho" }); }
});

// ─── Visto & Imigração ────────────────────────────────────────────────────────

router.put("/vida/cidades/:id/visto", async (req, res) => {
  try {
    const cidadeId = parseInt(req.params.id);
    const { tipoVisto, dificuldadeEstudo, dificuldadeTrabalho, dificuldadePermanente, tempoEstimado, custoProcesso, necessidadeJobOffer, exigenciaIdioma, observacoes, notaViabilidade } = req.body;
    const fields = { tipoVisto, dificuldadeEstudo: parseInt(dificuldadeEstudo) || null, dificuldadeTrabalho: parseInt(dificuldadeTrabalho) || null, dificuldadePermanente: parseInt(dificuldadePermanente) || null, tempoEstimado, custoProcesso: parseFloat(custoProcesso) || null, necessidadeJobOffer: !!necessidadeJobOffer, exigenciaIdioma, observacoes, notaViabilidade: parseInt(notaViabilidade) || null, updatedAt: new Date() };
    const [existing] = await db.select().from(vidaVisto).where(eq(vidaVisto.cidadeId, cidadeId));
    if (existing) {
      const [r] = await db.update(vidaVisto).set(fields).where(eq(vidaVisto.cidadeId, cidadeId)).returning();
      res.json(r);
    } else {
      const [r] = await db.insert(vidaVisto).values({ cidadeId, ...fields }).returning();
      res.json(r);
    }
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao salvar visto" }); }
});

// ─── Qualidade de Vida ────────────────────────────────────────────────────────

router.put("/vida/cidades/:id/qualidade", async (req, res) => {
  try {
    const cidadeId = parseInt(req.params.id);
    const { seguranca, saude, transportePublico, clima, comunidadeBrasileira, adaptacao, qualidadeFamilia, qualidadeCarreira, potencialFinanceiro, observacoes } = req.body;
    const fields = { seguranca: parseInt(seguranca) || null, saude: parseInt(saude) || null, transportePublico: parseInt(transportePublico) || null, clima: parseInt(clima) || null, comunidadeBrasileira: parseInt(comunidadeBrasileira) || null, adaptacao: parseInt(adaptacao) || null, qualidadeFamilia: parseInt(qualidadeFamilia) || null, qualidadeCarreira: parseInt(qualidadeCarreira) || null, potencialFinanceiro: parseInt(potencialFinanceiro) || null, observacoes, updatedAt: new Date() };
    const [existing] = await db.select().from(vidaQualidade).where(eq(vidaQualidade.cidadeId, cidadeId));
    if (existing) {
      const [r] = await db.update(vidaQualidade).set(fields).where(eq(vidaQualidade.cidadeId, cidadeId)).returning();
      res.json(r);
    } else {
      const [r] = await db.insert(vidaQualidade).values({ cidadeId, ...fields }).returning();
      res.json(r);
    }
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao salvar qualidade de vida" }); }
});

// ─── Prós e Contras ───────────────────────────────────────────────────────────

router.post("/vida/cidades/:id/pros-contras", async (req, res) => {
  try {
    const cidadeId = parseInt(req.params.id);
    const { tipo, descricao } = req.body;
    if (!tipo || !descricao) return res.status(400).json({ error: "tipo e descricao são obrigatórios" });
    const [p] = await db.insert(vidaProsContras).values({ cidadeId, tipo, descricao }).returning();
    res.json(p);
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao adicionar" }); }
});

router.delete("/vida/pros-contras/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(vidaProsContras).where(eq(vidaProsContras.id, id));
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao deletar" }); }
});

// ─── Plano de Ação ─────────────────────────────────────────────────────────────

router.post("/vida/projetos/:id/plano-acao", async (req, res) => {
  try {
    const projetoId = parseInt(req.params.id);
    const { titulo, descricao, prazo, status, ordem } = req.body;
    if (!titulo) return res.status(400).json({ error: "titulo é obrigatório" });
    const [p] = await db.insert(vidaPlanoAcao).values({ projetoId, titulo, descricao, prazo, status: status || "pendente", ordem: ordem || 0 }).returning();
    res.json(p);
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao criar item" }); }
});

router.put("/vida/plano-acao/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, descricao, prazo, status, ordem } = req.body;
    const [p] = await db.update(vidaPlanoAcao).set({ titulo, descricao, prazo, status, ordem, updatedAt: new Date() }).where(eq(vidaPlanoAcao.id, id)).returning();
    res.json(p);
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao atualizar" }); }
});

router.delete("/vida/plano-acao/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(vidaPlanoAcao).where(eq(vidaPlanoAcao.id, id));
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao deletar" }); }
});

// ─── Checkpoints ──────────────────────────────────────────────────────────────

router.post("/vida/projetos/:id/checkpoints", async (req, res) => {
  try {
    const projetoId = parseInt(req.params.id);
    const { titulo, descricao, dataAlvo, status } = req.body;
    if (!titulo) return res.status(400).json({ error: "titulo é obrigatório" });
    const [c] = await db.insert(vidaCheckpoints).values({ projetoId, titulo, descricao, dataAlvo, status: status || "pendente" }).returning();
    res.json(c);
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao criar checkpoint" }); }
});

router.put("/vida/checkpoints/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, descricao, dataAlvo, status } = req.body;
    const [c] = await db.update(vidaCheckpoints).set({ titulo, descricao, dataAlvo, status, updatedAt: new Date() }).where(eq(vidaCheckpoints.id, id)).returning();
    res.json(c);
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao atualizar" }); }
});

router.delete("/vida/checkpoints/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(vidaCheckpoints).where(eq(vidaCheckpoints.id, id));
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erro ao deletar" }); }
});

export default router;
