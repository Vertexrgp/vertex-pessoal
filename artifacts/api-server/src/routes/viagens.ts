import { Router } from "express";
import { db } from "@workspace/db";
import {
  viagensTripsTable,
  viagensExpensesTable,
  viagensChecklistTable,
  viagensRoteiroTable,
  viagensLugaresTable,
  viagensMemoriasTable,
} from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";

const router = Router();

// ── TRIPS ─────────────────────────────────────────────────────────────────────

router.get("/viagens/trips", async (_req, res) => {
  const trips = await db.select().from(viagensTripsTable).orderBy(desc(viagensTripsTable.createdAt));
  res.json(trips);
});

router.get("/viagens/trips/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [trip] = await db.select().from(viagensTripsTable).where(eq(viagensTripsTable.id, id));
  if (!trip) return res.status(404).json({ error: "Not found" });

  const [expenses, checklist, roteiro, lugares, memorias] = await Promise.all([
    db.select().from(viagensExpensesTable).where(eq(viagensExpensesTable.viagemId, id)).orderBy(desc(viagensExpensesTable.createdAt)),
    db.select().from(viagensChecklistTable).where(eq(viagensChecklistTable.viagemId, id)).orderBy(asc(viagensChecklistTable.createdAt)),
    db.select().from(viagensRoteiroTable).where(eq(viagensRoteiroTable.viagemId, id)).orderBy(asc(viagensRoteiroTable.dia), asc(viagensRoteiroTable.ordem)),
    db.select().from(viagensLugaresTable).where(eq(viagensLugaresTable.viagemId, id)).orderBy(asc(viagensLugaresTable.ordemRoteiro), asc(viagensLugaresTable.createdAt)),
    db.select().from(viagensMemoriasTable).where(eq(viagensMemoriasTable.viagemId, id)).orderBy(desc(viagensMemoriasTable.createdAt)),
  ]);

  res.json({ trip, expenses, checklist, roteiro, lugares, memorias });
});

router.post("/viagens/trips", async (req, res) => {
  const { destino, dataInicio, dataFim, orcamento, status, descricao, pais, cidade, moeda } = req.body;
  if (!destino) return res.status(400).json({ error: "destino obrigatório" });
  const [trip] = await db.insert(viagensTripsTable).values({
    destino, dataInicio: dataInicio || null, dataFim: dataFim || null,
    orcamento: orcamento ? String(orcamento) : null,
    status: status || "planejando", descricao: descricao || null,
    pais: pais || null, cidade: cidade || null, moeda: moeda || "BRL",
  }).returning();
  res.json(trip);
});

router.put("/viagens/trips/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { destino, dataInicio, dataFim, orcamento, status, descricao, pais, cidade, moeda } = req.body;
  const [trip] = await db.update(viagensTripsTable).set({
    destino, dataInicio: dataInicio || null, dataFim: dataFim || null,
    orcamento: orcamento ? String(orcamento) : null,
    status, descricao: descricao || null,
    pais: pais || null, cidade: cidade || null, moeda: moeda || "BRL",
    updatedAt: new Date(),
  }).where(eq(viagensTripsTable.id, id)).returning();
  res.json(trip);
});

router.delete("/viagens/trips/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(viagensMemoriasTable).where(eq(viagensMemoriasTable.viagemId, id));
  await db.delete(viagensRoteiroTable).where(eq(viagensRoteiroTable.viagemId, id));
  await db.delete(viagensLugaresTable).where(eq(viagensLugaresTable.viagemId, id));
  await db.delete(viagensExpensesTable).where(eq(viagensExpensesTable.viagemId, id));
  await db.delete(viagensChecklistTable).where(eq(viagensChecklistTable.viagemId, id));
  await db.delete(viagensTripsTable).where(eq(viagensTripsTable.id, id));
  res.json({ ok: true });
});

// ── LUGARES ───────────────────────────────────────────────────────────────────

router.post("/viagens/trips/:id/lugares", async (req, res) => {
  const viagemId = Number(req.params.id);
  const { nome, endereco, cidade, pais, bairro, categoria, descricao, notas, horario, comoChegar, linkExterno, prioridade, status, lat, lng, diaViagem, ordemRoteiro, duracaoEstimada } = req.body;
  if (!nome) return res.status(400).json({ error: "nome obrigatório" });
  const [lugar] = await db.insert(viagensLugaresTable).values({
    viagemId, nome,
    endereco: endereco || null, cidade: cidade || null, pais: pais || null,
    bairro: bairro || null,
    categoria: categoria || "ponto_turistico",
    descricao: descricao || null, notas: notas || null,
    horario: horario || null, comoChegar: comoChegar || null,
    linkExterno: linkExterno || null,
    prioridade: prioridade || "media", status: status || "planejado",
    duracaoEstimada: duracaoEstimada ? Number(duracaoEstimada) : null,
    lat: lat ? String(lat) : null, lng: lng ? String(lng) : null,
    diaViagem: diaViagem ? Number(diaViagem) : null,
    ordemRoteiro: ordemRoteiro ? Number(ordemRoteiro) : 0,
  }).returning();
  res.json(lugar);
});

router.put("/viagens/lugares/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, endereco, cidade, pais, bairro, categoria, descricao, notas, horario, comoChegar, linkExterno, prioridade, status, lat, lng, diaViagem, ordemRoteiro, duracaoEstimada } = req.body;
  const [lugar] = await db.update(viagensLugaresTable).set({
    nome,
    endereco: endereco || null, cidade: cidade || null, pais: pais || null,
    bairro: bairro || null,
    categoria: categoria || "ponto_turistico",
    descricao: descricao || null, notas: notas || null,
    horario: horario || null, comoChegar: comoChegar || null,
    linkExterno: linkExterno || null,
    prioridade: prioridade || "media", status: status || "planejado",
    duracaoEstimada: duracaoEstimada ? Number(duracaoEstimada) : null,
    lat: lat ? String(lat) : null, lng: lng ? String(lng) : null,
    diaViagem: diaViagem !== undefined ? (diaViagem ? Number(diaViagem) : null) : undefined,
    ordemRoteiro: ordemRoteiro !== undefined ? Number(ordemRoteiro) : 0,
  }).where(eq(viagensLugaresTable.id, id)).returning();
  res.json(lugar);
});

router.delete("/viagens/lugares/:id", async (req, res) => {
  await db.delete(viagensLugaresTable).where(eq(viagensLugaresTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ── ROTEIRO INTELIGENTE ───────────────────────────────────────────────────────

function generateRoteiroInteligente(
  lugares: any[],
  numDias: number
): Array<{ lugarId: number; dia: number; ordem: number }> {
  if (!lugares.length || !numDias) return [];

  const PRIO: Record<string, number> = { alta: 3, media: 2, baixa: 1 };

  const CAT_SLOT: Record<string, number> = {
    cafe: 1,
    museu: 2,
    ponto_turistico: 3,
    parque: 4,
    hotel: 5,
    compras: 5,
    outros: 5,
    restaurante: 7,
    bar: 8,
  };

  const DEFAULT_DURATION = 90;

  const getGroup = (l: any) => (l.bairro?.trim() || l.categoria || "outros").toLowerCase();

  const sorted = [...lugares].sort((a, b) => {
    const pa = PRIO[a.prioridade] ?? 2;
    const pb = PRIO[b.prioridade] ?? 2;
    if (pa !== pb) return pb - pa;
    return getGroup(a).localeCompare(getGroup(b));
  });

  const dayMinutes = new Array(numDias).fill(0);
  const dayLists: number[][] = Array.from({ length: numDias }, () => []);

  for (const lugar of sorted) {
    const dur = lugar.duracaoEstimada && lugar.duracaoEstimada > 0 ? lugar.duracaoEstimada : DEFAULT_DURATION;
    let bestDay = 0;
    let bestLoad = dayMinutes[0];
    for (let d = 1; d < numDias; d++) {
      if (dayMinutes[d] < bestLoad) {
        bestLoad = dayMinutes[d];
        bestDay = d;
      }
    }
    dayLists[bestDay].push(lugar.id);
    dayMinutes[bestDay] += dur;
  }

  const assignments: { lugarId: number; dia: number; ordem: number }[] = [];

  for (let d = 0; d < numDias; d++) {
    if (dayLists[d].length === 0) continue;
    const dayLugares = dayLists[d].map((id) => lugares.find((l) => l.id === id)!);

    dayLugares.sort((a, b) => {
      const sa = CAT_SLOT[a.categoria] ?? 5;
      const sb = CAT_SLOT[b.categoria] ?? 5;
      if (sa !== sb) return sa - sb;
      const pa = PRIO[a.prioridade] ?? 2;
      const pb = PRIO[b.prioridade] ?? 2;
      return pb - pa;
    });

    dayLugares.forEach((l, idx) => {
      assignments.push({ lugarId: l.id, dia: d + 1, ordem: idx + 1 });
    });
  }

  return assignments;
}

router.post("/viagens/trips/:id/roteiro-inteligente", async (req, res) => {
  const viagemId = Number(req.params.id);
  const { numDias } = req.body;

  const [trip] = await db.select().from(viagensTripsTable).where(eq(viagensTripsTable.id, viagemId));
  if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });

  const lugares = await db.select().from(viagensLugaresTable).where(eq(viagensLugaresTable.viagemId, viagemId));
  if (lugares.length === 0) return res.status(400).json({ error: "Nenhum lugar cadastrado" });

  let dias = numDias ? Number(numDias) : 1;
  if (trip.dataInicio && trip.dataFim && !numDias) {
    const start = new Date(trip.dataInicio).getTime();
    const end = new Date(trip.dataFim).getTime();
    dias = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
  }

  const assignments = generateRoteiroInteligente(lugares, dias);

  await Promise.all(
    assignments.map((a) =>
      db.update(viagensLugaresTable)
        .set({ diaViagem: a.dia, ordemRoteiro: a.ordem })
        .where(eq(viagensLugaresTable.id, a.lugarId))
    )
  );

  const stats = {
    totalLugares: lugares.length,
    numDias: dias,
    distribuicao: assignments.reduce((acc: Record<number, number>, a) => {
      acc[a.dia] = (acc[a.dia] || 0) + 1;
      return acc;
    }, {}),
  };

  res.json({ ok: true, assignments, stats });
});

router.post("/viagens/trips/:id/limpar-roteiro", async (req, res) => {
  const viagemId = Number(req.params.id);
  await db.update(viagensLugaresTable)
    .set({ diaViagem: null, ordemRoteiro: 0 })
    .where(eq(viagensLugaresTable.viagemId, viagemId));
  res.json({ ok: true });
});

// ── EXPENSES ──────────────────────────────────────────────────────────────────

router.post("/viagens/trips/:id/expenses", async (req, res) => {
  const viagemId = Number(req.params.id);
  const { descricao, valor, categoria, data } = req.body;
  if (!descricao || !valor) return res.status(400).json({ error: "descricao e valor obrigatórios" });
  const [exp] = await db.insert(viagensExpensesTable).values({
    viagemId, descricao, valor: String(valor), categoria: categoria || "outros", data: data || null,
  }).returning();
  res.json(exp);
});

router.delete("/viagens/expenses/:id", async (req, res) => {
  await db.delete(viagensExpensesTable).where(eq(viagensExpensesTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ── CHECKLIST ─────────────────────────────────────────────────────────────────

router.post("/viagens/trips/:id/checklist", async (req, res) => {
  const viagemId = Number(req.params.id);
  const { item, fase } = req.body;
  if (!item) return res.status(400).json({ error: "item obrigatório" });
  const [check] = await db.insert(viagensChecklistTable).values({
    viagemId, item, fase: fase || "antes",
  }).returning();
  res.json(check);
});

router.put("/viagens/checklist/:id", async (req, res) => {
  const { concluido, item, fase } = req.body;
  const [check] = await db.update(viagensChecklistTable).set({
    ...(concluido !== undefined ? { concluido } : {}),
    ...(item ? { item } : {}),
    ...(fase ? { fase } : {}),
  }).where(eq(viagensChecklistTable.id, Number(req.params.id))).returning();
  res.json(check);
});

router.delete("/viagens/checklist/:id", async (req, res) => {
  await db.delete(viagensChecklistTable).where(eq(viagensChecklistTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ── ROTEIRO ───────────────────────────────────────────────────────────────────

router.post("/viagens/trips/:id/roteiro", async (req, res) => {
  const viagemId = Number(req.params.id);
  const { dia, data, titulo, descricao, hora, tipo, ordem, lugarId } = req.body;
  if (!titulo || !dia) return res.status(400).json({ error: "titulo e dia obrigatórios" });
  const [item] = await db.insert(viagensRoteiroTable).values({
    viagemId, lugarId: lugarId ? Number(lugarId) : null,
    dia: Number(dia), data: data || null,
    titulo, descricao: descricao || null,
    hora: hora || null, tipo: tipo || "atividade",
    ordem: ordem ? Number(ordem) : 0,
  }).returning();
  res.json(item);
});

router.delete("/viagens/roteiro/:id", async (req, res) => {
  await db.delete(viagensRoteiroTable).where(eq(viagensRoteiroTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ── MEMÓRIAS ──────────────────────────────────────────────────────────────────

router.post("/viagens/trips/:id/memorias", async (req, res) => {
  const viagemId = Number(req.params.id);
  const { titulo, conteudo, data, dia, tipo, fotoUrl } = req.body;
  if (!titulo) return res.status(400).json({ error: "titulo obrigatório" });
  const [mem] = await db.insert(viagensMemoriasTable).values({
    viagemId, titulo, conteudo: conteudo || null,
    data: data || null, dia: dia ? Number(dia) : null,
    tipo: tipo || "nota", fotoUrl: fotoUrl || null,
  }).returning();
  res.json(mem);
});

router.put("/viagens/memorias/:id", async (req, res) => {
  const { titulo, conteudo, data, dia, tipo, fotoUrl } = req.body;
  const [mem] = await db.update(viagensMemoriasTable).set({
    titulo, conteudo: conteudo || null,
    data: data || null, dia: dia ? Number(dia) : null,
    tipo: tipo || "nota", fotoUrl: fotoUrl || null,
  }).where(eq(viagensMemoriasTable.id, Number(req.params.id))).returning();
  res.json(mem);
});

router.delete("/viagens/memorias/:id", async (req, res) => {
  await db.delete(viagensMemoriasTable).where(eq(viagensMemoriasTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

export default router;
