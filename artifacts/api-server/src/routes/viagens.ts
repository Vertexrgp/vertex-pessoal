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
    db.select().from(viagensLugaresTable).where(eq(viagensLugaresTable.viagemId, id)).orderBy(asc(viagensLugaresTable.createdAt)),
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
  const { nome, endereco, cidade, pais, categoria, descricao, notas, horario, comoChegar, linkExterno, prioridade, status, lat, lng, diaViagem, ordemRoteiro } = req.body;
  if (!nome) return res.status(400).json({ error: "nome obrigatório" });
  const [lugar] = await db.insert(viagensLugaresTable).values({
    viagemId, nome,
    endereco: endereco || null, cidade: cidade || null, pais: pais || null,
    categoria: categoria || "ponto_turistico",
    descricao: descricao || null, notas: notas || null,
    horario: horario || null, comoChegar: comoChegar || null,
    linkExterno: linkExterno || null,
    prioridade: prioridade || "media", status: status || "planejado",
    lat: lat ? String(lat) : null, lng: lng ? String(lng) : null,
    diaViagem: diaViagem ? Number(diaViagem) : null,
    ordemRoteiro: ordemRoteiro ? Number(ordemRoteiro) : 0,
  }).returning();
  res.json(lugar);
});

router.put("/viagens/lugares/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, endereco, cidade, pais, categoria, descricao, notas, horario, comoChegar, linkExterno, prioridade, status, lat, lng, diaViagem, ordemRoteiro } = req.body;
  const [lugar] = await db.update(viagensLugaresTable).set({
    nome,
    endereco: endereco || null, cidade: cidade || null, pais: pais || null,
    categoria: categoria || "ponto_turistico",
    descricao: descricao || null, notas: notas || null,
    horario: horario || null, comoChegar: comoChegar || null,
    linkExterno: linkExterno || null,
    prioridade: prioridade || "media", status: status || "planejado",
    lat: lat ? String(lat) : null, lng: lng ? String(lng) : null,
    diaViagem: diaViagem ? Number(diaViagem) : null,
    ordemRoteiro: ordemRoteiro !== undefined ? Number(ordemRoteiro) : 0,
  }).where(eq(viagensLugaresTable.id, id)).returning();
  res.json(lugar);
});

router.delete("/viagens/lugares/:id", async (req, res) => {
  await db.delete(viagensLugaresTable).where(eq(viagensLugaresTable.id, Number(req.params.id)));
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
