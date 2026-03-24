import { Router } from "express";
import { db } from "@workspace/db";
import {
  viagensTripsTable,
  viagensExpensesTable,
  viagensChecklistTable,
  viagensRoteiroTable,
  viagensLugaresTable,
  viagensMemoriasTable,
  viagensOrcamentoTable,
  viagensSugestoesTable,
  viagensPreferenciasTable,
} from "@workspace/db";
import { agendaEventsTable } from "@workspace/db";
import { transactionsTable, categoriesTable } from "@workspace/db";
import { eq, asc, desc, and } from "drizzle-orm";

const router = Router();

// ── HELPERS ───────────────────────────────────────────────────────────────────

async function upsertTripAgendaEvents(trip: any) {
  if (!trip.dataInicio) return;
  const cor = "#F97316"; // orange for trips
  const existing = await db.select().from(agendaEventsTable)
    .where(eq(agendaEventsTable.viagemId, trip.id));

  // Delete existing trip events before recreating
  if (existing.length > 0) {
    for (const ev of existing) {
      if (ev.categoria === "viagem") {
        await db.delete(agendaEventsTable).where(eq(agendaEventsTable.id, ev.id));
      }
    }
  }

  // Create start event
  await db.insert(agendaEventsTable).values({
    titulo: `✈️ ${trip.destino} — partida`,
    data: trip.dataInicio,
    horaInicio: null,
    horaFim: null,
    descricao: trip.descricao || `Início da viagem para ${trip.destino}`,
    categoria: "viagem",
    cor,
    alerta: true,
    lembrete: true,
    viagemId: trip.id,
    updatedAt: new Date(),
  });

  // Create end event if different from start
  if (trip.dataFim && trip.dataFim !== trip.dataInicio) {
    await db.insert(agendaEventsTable).values({
      titulo: `🏠 ${trip.destino} — retorno`,
      data: trip.dataFim,
      horaInicio: null,
      horaFim: null,
      descricao: `Fim da viagem: ${trip.destino}`,
      categoria: "viagem",
      cor,
      alerta: false,
      lembrete: false,
      viagemId: trip.id,
      updatedAt: new Date(),
    });
  }
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ── TRIPS ─────────────────────────────────────────────────────────────────────

router.get("/viagens/trips", async (_req, res) => {
  const trips = await db.select().from(viagensTripsTable).orderBy(desc(viagensTripsTable.createdAt));
  res.json(trips);
});

router.get("/viagens/trips/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [trip] = await db.select().from(viagensTripsTable).where(eq(viagensTripsTable.id, id));
  if (!trip) return res.status(404).json({ error: "Not found" });

  const [expenses, checklist, roteiro, lugares, memorias, orcamento, agendaEvents] = await Promise.all([
    db.select().from(viagensExpensesTable).where(eq(viagensExpensesTable.viagemId, id)).orderBy(desc(viagensExpensesTable.createdAt)),
    db.select().from(viagensChecklistTable).where(eq(viagensChecklistTable.viagemId, id)).orderBy(asc(viagensChecklistTable.createdAt)),
    db.select().from(viagensRoteiroTable).where(eq(viagensRoteiroTable.viagemId, id)).orderBy(asc(viagensRoteiroTable.dia), asc(viagensRoteiroTable.ordem)),
    db.select().from(viagensLugaresTable).where(eq(viagensLugaresTable.viagemId, id)).orderBy(asc(viagensLugaresTable.ordemRoteiro), asc(viagensLugaresTable.createdAt)),
    db.select().from(viagensMemoriasTable).where(eq(viagensMemoriasTable.viagemId, id)).orderBy(desc(viagensMemoriasTable.createdAt)),
    db.select().from(viagensOrcamentoTable).where(eq(viagensOrcamentoTable.viagemId, id)).orderBy(asc(viagensOrcamentoTable.categoria)),
    db.select().from(agendaEventsTable).where(eq(agendaEventsTable.viagemId, id)).orderBy(asc(agendaEventsTable.data)),
  ]);

  res.json({ trip, expenses, checklist, roteiro, lugares, memorias, orcamento, agendaEvents });
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

  // Auto-create agenda events if dates provided
  if (trip.dataInicio) {
    await upsertTripAgendaEvents(trip);
  }

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

  // Update agenda events
  if (trip && trip.dataInicio) {
    await upsertTripAgendaEvents(trip);
  }

  res.json(trip);
});

router.delete("/viagens/trips/:id", async (req, res) => {
  const id = Number(req.params.id);
  // Remove linked agenda events
  await db.delete(agendaEventsTable).where(eq(agendaEventsTable.viagemId, id));
  await db.delete(viagensMemoriasTable).where(eq(viagensMemoriasTable.viagemId, id));
  await db.delete(viagensRoteiroTable).where(eq(viagensRoteiroTable.viagemId, id));
  await db.delete(viagensLugaresTable).where(eq(viagensLugaresTable.viagemId, id));
  await db.delete(viagensExpensesTable).where(eq(viagensExpensesTable.viagemId, id));
  await db.delete(viagensChecklistTable).where(eq(viagensChecklistTable.viagemId, id));
  await db.delete(viagensOrcamentoTable).where(eq(viagensOrcamentoTable.viagemId, id));
  await db.delete(viagensTripsTable).where(eq(viagensTripsTable.id, id));
  res.json({ ok: true });
});

// ── SYNC ROTEIRO → AGENDA ─────────────────────────────────────────────────────

router.post("/viagens/trips/:id/sync-agenda", async (req, res) => {
  const viagemId = Number(req.params.id);
  const [trip] = await db.select().from(viagensTripsTable).where(eq(viagensTripsTable.id, viagemId));
  if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });

  const lugares = await db.select().from(viagensLugaresTable)
    .where(and(eq(viagensLugaresTable.viagemId, viagemId)));

  const withDay = lugares.filter(l => l.diaViagem !== null);
  if (withDay.length === 0) return res.status(400).json({ error: "Nenhum lugar com dia definido no roteiro" });

  const cor = "#F97316";
  let created = 0;

  for (const lugar of withDay) {
    const dia = lugar.diaViagem! - 1;
    const data = trip.dataInicio ? addDays(trip.dataInicio, dia) : null;
    if (!data) continue;

    // Check if already exists
    const alreadyExists = await db.select().from(agendaEventsTable)
      .where(and(eq(agendaEventsTable.viagemId, viagemId), eq(agendaEventsTable.data, data)));
    const titleExists = alreadyExists.find(e => e.titulo.includes(lugar.nome));
    if (titleExists) continue;

    const catEmoji: Record<string, string> = {
      ponto_turistico: "🏛️", restaurante: "🍽️", hotel: "🏨", bar: "☕",
      museu: "🎨", parque: "🌿", compras: "🛍️", transporte: "🚗", praia: "🏖️", outro: "📍",
    };
    const emoji = catEmoji[lugar.categoria] ?? "📍";

    await db.insert(agendaEventsTable).values({
      titulo: `${emoji} ${lugar.nome}`,
      data,
      horaInicio: lugar.horario || null,
      horaFim: null,
      descricao: lugar.descricao || lugar.endereco || null,
      categoria: "viagem",
      cor,
      alerta: false,
      lembrete: false,
      viagemId,
      updatedAt: new Date(),
    });
    created++;
  }

  res.json({ ok: true, created, message: `${created} eventos criados na agenda` });
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
  const { descricao, valor, categoria, data, formaPagamento, pago, previsto, cartaoId } = req.body;
  if (!descricao || !valor) return res.status(400).json({ error: "descricao e valor obrigatórios" });
  const [exp] = await db.insert(viagensExpensesTable).values({
    viagemId, descricao, valor: String(valor),
    categoria: categoria || "outros",
    data: data || null,
    formaPagamento: formaPagamento || "dinheiro",
    pago: pago !== undefined ? Boolean(pago) : true,
    previsto: previsto !== undefined ? Boolean(previsto) : false,
    cartaoId: cartaoId ? Number(cartaoId) : null,
    updatedAt: new Date(),
  }).returning();
  res.json(exp);
});

router.put("/viagens/expenses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { descricao, valor, categoria, data, formaPagamento, pago, previsto, cartaoId } = req.body;
  const [exp] = await db.update(viagensExpensesTable).set({
    descricao, valor: String(valor),
    categoria: categoria || "outros",
    data: data || null,
    formaPagamento: formaPagamento || "dinheiro",
    pago: pago !== undefined ? Boolean(pago) : true,
    previsto: previsto !== undefined ? Boolean(previsto) : false,
    cartaoId: cartaoId ? Number(cartaoId) : null,
    updatedAt: new Date(),
  }).where(eq(viagensExpensesTable.id, id)).returning();
  res.json(exp);
});

router.delete("/viagens/expenses/:id", async (req, res) => {
  await db.delete(viagensExpensesTable).where(eq(viagensExpensesTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ── VINCULAR DESPESA AO FINANCEIRO ────────────────────────────────────────────

router.post("/viagens/expenses/:id/vincular-financeiro", async (req, res) => {
  const expId = Number(req.params.id);
  const [expense] = await db.select().from(viagensExpensesTable).where(eq(viagensExpensesTable.id, expId));
  if (!expense) return res.status(404).json({ error: "Despesa não encontrada" });

  if (expense.transactionId) {
    return res.status(400).json({ error: "Despesa já vinculada ao financeiro" });
  }

  const [trip] = await db.select().from(viagensTripsTable).where(eq(viagensTripsTable.id, expense.viagemId!));

  // Find or use travel category
  const categories = await db.select().from(categoriesTable);
  const catMap: Record<string, string> = {
    hospedagem: "Moradia", voos: "Transporte", alimentação: "Alimentação",
    transporte: "Transporte", passeios: "Lazer", compras: "Outros", outros: "Outros",
  };
  const targetCatName = catMap[expense.categoria] ?? "Outros";
  const category = categories.find(c => c.name === targetCatName || c.name?.toLowerCase().includes(targetCatName.toLowerCase()));

  const paymentMethod = expense.formaPagamento === "cartao" ? "credit_card" : expense.formaPagamento === "pix" ? "pix" : "debit_card";
  const transDate = expense.data || new Date().toISOString().split("T")[0];

  const [tx] = await db.insert(transactionsTable).values({
    competenceDate: transDate,
    movementDate: transDate,
    type: "expense",
    description: `[Viagem: ${trip?.destino ?? "—"}] ${expense.descricao}`,
    amount: expense.valor,
    paymentMethod,
    creditCardId: expense.cartaoId || null,
    categoryId: category?.id || null,
    status: expense.pago ? "completed" : "planned",
    notes: `Despesa importada da viagem ${trip?.destino ?? ""}`,
  }).returning();

  // Update expense with transaction link
  await db.update(viagensExpensesTable).set({ transactionId: tx.id, updatedAt: new Date() })
    .where(eq(viagensExpensesTable.id, expId));

  res.json({ ok: true, transaction: tx });
});

// ── ORÇAMENTO POR CATEGORIA ───────────────────────────────────────────────────

router.get("/viagens/trips/:id/orcamento", async (req, res) => {
  const viagemId = Number(req.params.id);
  const items = await db.select().from(viagensOrcamentoTable)
    .where(eq(viagensOrcamentoTable.viagemId, viagemId))
    .orderBy(asc(viagensOrcamentoTable.categoria));
  res.json(items);
});

router.put("/viagens/trips/:id/orcamento/:categoria", async (req, res) => {
  const viagemId = Number(req.params.id);
  const { categoria } = req.params;
  const { valorPrevisto } = req.body;

  const existing = await db.select().from(viagensOrcamentoTable)
    .where(and(eq(viagensOrcamentoTable.viagemId, viagemId), eq(viagensOrcamentoTable.categoria, categoria)));

  if (existing.length > 0) {
    const [updated] = await db.update(viagensOrcamentoTable)
      .set({ valorPrevisto: String(valorPrevisto), updatedAt: new Date() })
      .where(and(eq(viagensOrcamentoTable.viagemId, viagemId), eq(viagensOrcamentoTable.categoria, categoria)))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(viagensOrcamentoTable)
      .values({ viagemId, categoria, valorPrevisto: String(valorPrevisto) })
      .returning();
    res.json(created);
  }
});

// ── SUGESTÕES INTELIGENTES DE ROTEIRO ─────────────────────────────────────────

function calcularMinDia(lugares: any[]): number {
  return lugares.reduce((s: number, l: any) => s + (Number(l.duracaoEstimada) || 90), 0);
}

function gerarSugestoesAlgoritmo(lugares: any[], trip: any, prefs: any): any[] {
  const sugestoes: any[] = [];
  const INTENSO_MIN = 420;
  const LEVE_MAX = 120;

  const porDia: Record<number, any[]> = {};
  const semDia: any[] = [];
  for (const lugar of lugares) {
    if (lugar.diaViagem) {
      if (!porDia[lugar.diaViagem]) porDia[lugar.diaViagem] = [];
      porDia[lugar.diaViagem].push(lugar);
    } else { semDia.push(lugar); }
  }
  const diasNums = Object.keys(porDia).map(Number);

  // 1. Lugares sem dia
  if (semDia.length > 0) {
    sugestoes.push({
      tipo: "SEM_DIA",
      titulo: `${semDia.length} lugar${semDia.length > 1 ? "es" : ""} sem dia definido`,
      motivo: `Os seguintes lugares ainda não foram alocados no roteiro: ${semDia.map((l: any) => l.nome).join(", ")}`,
      impacto: "Eles não aparecerão no calendário nem na sincronização com a Agenda",
      acao: null,
    });
  }

  // 2. Dias sobrecarregados → sugerir mover
  for (const dia of diasNums) {
    const lugaresNoDia = porDia[dia];
    const totalMin = calcularMinDia(lugaresNoDia);

    if (totalMin > INTENSO_MIN) {
      const movable = lugaresNoDia
        .filter((l: any) => !l.fixo)
        .sort((a: any, b: any) => {
          const p: Record<string, number> = { alta: 3, media: 2, baixa: 1 };
          return (p[a.prioridade] ?? 2) - (p[b.prioridade] ?? 2);
        });

      if (movable.length > 0) {
        const toMove = movable[0];
        const diasMaisLeves = diasNums
          .filter(d => d !== dia && calcularMinDia(porDia[d]) < INTENSO_MIN)
          .sort((a, b) => calcularMinDia(porDia[a]) - calcularMinDia(porDia[b]));

        if (diasMaisLeves.length > 0) {
          const targetDia = diasMaisLeves[0];
          sugestoes.push({
            tipo: "MOVER_LUGAR",
            titulo: `Mover "${toMove.nome}" do Dia ${dia} para o Dia ${targetDia}`,
            motivo: `O Dia ${dia} tem ${(totalMin / 60).toFixed(1)}h de atividades (acima do ideal de 7h). "${toMove.nome}" é prioridade ${toMove.prioridade} e pode ser realocado.`,
            impacto: `O Dia ${dia} ficará mais equilibrado (${((totalMin - (toMove.duracaoEstimada || 90)) / 60).toFixed(1)}h) e "${toMove.nome}" terá mais espaço no Dia ${targetDia}`,
            acao: JSON.stringify({ tipo: "mover", lugarId: toMove.id, diaViagem: targetDia }),
          });
        } else {
          sugestoes.push({
            tipo: "DIA_SOBRECARREGADO",
            titulo: `Dia ${dia} está sobrecarregado com ${(totalMin / 60).toFixed(1)}h`,
            motivo: `Você tem ${lugaresNoDia.length} atividades no Dia ${dia}, totalizando ${(totalMin / 60).toFixed(1)}h — acima do recomendado de 7h`,
            impacto: "O dia pode se tornar cansativo; considere redistribuir atividades para outros dias",
            acao: null,
          });
        }
      }
    }

    // 3. Dia muito vazio → puxar de dia cheio
    if (totalMin < LEVE_MAX && diasNums.length > 1) {
      const maisCarregado = diasNums
        .filter(d => d !== dia)
        .sort((a, b) => calcularMinDia(porDia[b]) - calcularMinDia(porDia[a]))[0];

      if (maisCarregado && calcularMinDia(porDia[maisCarregado]) > INTENSO_MIN) {
        const movable = porDia[maisCarregado].filter((l: any) => !l.fixo);
        if (movable.length > 0) {
          const toBring = movable[movable.length - 1];
          sugestoes.push({
            tipo: "MOVER_LUGAR",
            titulo: `Puxar "${toBring.nome}" para o Dia ${dia}`,
            motivo: `O Dia ${dia} tem apenas ${(totalMin / 60).toFixed(1)}h de atividades, enquanto o Dia ${maisCarregado} está sobrecarregado`,
            impacto: "Melhor aproveitamento e distribuição equilibrada ao longo da viagem",
            acao: JSON.stringify({ tipo: "mover", lugarId: toBring.id, diaViagem: dia }),
          });
        }
      }
    }

    // 4. Transporte a pé sugerido (mesmo bairro)
    const bairros = [...new Set(lugaresNoDia.filter((l: any) => l.bairro).map((l: any) => l.bairro))] as string[];
    if (bairros.length === 1 && lugaresNoDia.length >= 2) {
      const jaIgnoradoTransporte = (prefs?.tiposIgnorados || "").includes("TRANSPORTE_SUGERIDO");
      if (!jaIgnoradoTransporte) {
        sugestoes.push({
          tipo: "TRANSPORTE_SUGERIDO",
          titulo: `Dia ${dia}: todos os locais ficam em ${bairros[0]}`,
          motivo: `${lugaresNoDia.map((l: any) => l.nome).join(", ")} estão no mesmo bairro (${bairros[0]})`,
          impacto: "Possível fazer a pé ou com transporte local — sem necessidade de taxi ou carro",
          acao: null,
        });
      }
    }

    // 5. Restaurante como primeira atividade do dia
    const ordered = [...lugaresNoDia].sort((a: any, b: any) => (a.ordemRoteiro ?? 99) - (b.ordemRoteiro ?? 99));
    if (ordered.length >= 2 && ordered[0].categoria === "restaurante") {
      sugestoes.push({
        tipo: "REORDENAR_DIA",
        titulo: `Dia ${dia}: "${ordered[0].nome}" aparece antes de pontos turísticos`,
        motivo: `"${ordered[0].nome}" é um restaurante mas está no início do dia, antes de atividades turísticas`,
        impacto: "Roteiro mais natural — pontos turísticos de manhã, refeições no meio/fim do dia",
        acao: JSON.stringify({ tipo: "reordenar", dia, lugarRestauranteId: ordered[0].id, novaOrdem: ordered.length }),
      });
    }
  }

  // 6. Agrupamento de bairro entre dias diferentes
  const bairroLugares: Record<string, any[]> = {};
  for (const lugar of lugares.filter((l: any) => l.bairro && l.diaViagem)) {
    if (!bairroLugares[lugar.bairro]) bairroLugares[lugar.bairro] = [];
    bairroLugares[lugar.bairro].push(lugar);
  }
  for (const [bairro, ls] of Object.entries(bairroLugares)) {
    const diasDoBairro = [...new Set(ls.map((l: any) => l.diaViagem))] as number[];
    if (diasDoBairro.length >= 2 && ls.length >= 2) {
      const melhorDia = diasDoBairro.sort((a: number, b: number) =>
        ls.filter((l: any) => l.diaViagem === b).length - ls.filter((l: any) => l.diaViagem === a).length
      )[0];
      const paraAgrupar = ls.filter((l: any) => l.diaViagem !== melhorDia && !l.fixo);
      if (paraAgrupar.length > 0) {
        const toMove = paraAgrupar[0];
        sugestoes.push({
          tipo: "MOVER_LUGAR",
          titulo: `Agrupar "${toMove.nome}" com outros locais em ${bairro}`,
          motivo: `"${toMove.nome}" está no bairro ${bairro} (Dia ${toMove.diaViagem}), mas outros locais do mesmo bairro estão no Dia ${melhorDia}`,
          impacto: `Menos deslocamento e melhor aproveitamento do bairro ${bairro} em um único dia`,
          acao: JSON.stringify({ tipo: "mover", lugarId: toMove.id, diaViagem: melhorDia }),
        });
      }
    }
  }

  // 7. Dia sem nenhum lugar (gaps no roteiro)
  if (trip.dataInicio && trip.dataFim) {
    const numDias = Math.round((new Date(trip.dataFim).getTime() - new Date(trip.dataInicio).getTime()) / 86400000) + 1;
    for (let d = 1; d <= numDias; d++) {
      if (!porDia[d] && lugares.length > 0) {
        const semDiaLugares = lugares.filter((l: any) => !l.diaViagem);
        if (semDiaLugares.length > 0) {
          sugestoes.push({
            tipo: "DIA_VAZIO",
            titulo: `Dia ${d} sem atividades planejadas`,
            motivo: `O Dia ${d} da sua viagem não tem nenhuma atividade alocada. Você tem ${semDiaLugares.length} lugar${semDiaLugares.length > 1 ? "es" : ""} sem dia definido.`,
            impacto: "Considere alocar um lugar existente ou planejar uma atividade livre",
            acao: null,
          });
          break;
        }
      }
    }
  }

  return sugestoes;
}

async function getOrCreatePrefs(viagemId: number) {
  const existing = await db.select().from(viagensPreferenciasTable)
    .where(eq(viagensPreferenciasTable.viagemId, viagemId));
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(viagensPreferenciasTable)
    .values({ viagemId }).returning();
  return created;
}

router.post("/viagens/trips/:id/gerar-sugestoes", async (req, res) => {
  const viagemId = Number(req.params.id);
  const [trip] = await db.select().from(viagensTripsTable).where(eq(viagensTripsTable.id, viagemId));
  if (!trip) return res.status(404).json({ error: "Viagem não encontrada" });

  const lugares = await db.select().from(viagensLugaresTable)
    .where(eq(viagensLugaresTable.viagemId, viagemId))
    .orderBy(asc(viagensLugaresTable.diaViagem), asc(viagensLugaresTable.ordemRoteiro));

  const prefs = await getOrCreatePrefs(viagemId);

  if (lugares.length === 0) {
    return res.json({ sugestoes: [], msg: "Adicione lugares à viagem para receber sugestões" });
  }

  // Delete pending suggestions before generating new ones
  await db.delete(viagensSugestoesTable)
    .where(and(eq(viagensSugestoesTable.viagemId, viagemId), eq(viagensSugestoesTable.status, "pendente")));

  const candidatas = gerarSugestoesAlgoritmo(lugares, trip, prefs);

  const salvas: any[] = [];
  for (const s of candidatas) {
    const [saved] = await db.insert(viagensSugestoesTable).values({
      viagemId,
      tipo: s.tipo,
      titulo: s.titulo,
      motivo: s.motivo,
      impacto: s.impacto,
      acao: s.acao || null,
      status: "pendente",
    }).returning();
    salvas.push(saved);
  }

  res.json({ sugestoes: salvas, preferencias: prefs });
});

router.get("/viagens/trips/:id/sugestoes", async (req, res) => {
  const viagemId = Number(req.params.id);
  const sugestoes = await db.select().from(viagensSugestoesTable)
    .where(and(eq(viagensSugestoesTable.viagemId, viagemId), eq(viagensSugestoesTable.status, "pendente")))
    .orderBy(asc(viagensSugestoesTable.createdAt));
  const prefs = await getOrCreatePrefs(viagemId);
  res.json({ sugestoes, preferencias: prefs });
});

router.post("/viagens/sugestoes/:id/aplicar", async (req, res) => {
  const id = Number(req.params.id);
  const [sug] = await db.select().from(viagensSugestoesTable).where(eq(viagensSugestoesTable.id, id));
  if (!sug) return res.status(404).json({ error: "Sugestão não encontrada" });

  // Execute the action
  if (sug.acao) {
    try {
      const acao = JSON.parse(sug.acao);
      if (acao.tipo === "mover" && acao.lugarId && acao.diaViagem !== undefined) {
        await db.update(viagensLugaresTable)
          .set({ diaViagem: acao.diaViagem })
          .where(eq(viagensLugaresTable.id, acao.lugarId));
      } else if (acao.tipo === "reordenar" && acao.lugarRestauranteId && acao.novaOrdem) {
        await db.update(viagensLugaresTable)
          .set({ ordemRoteiro: acao.novaOrdem })
          .where(eq(viagensLugaresTable.id, acao.lugarRestauranteId));
      }
    } catch {}
  }

  // Mark suggestion as accepted
  await db.update(viagensSugestoesTable)
    .set({ status: "aceita", updatedAt: new Date() })
    .where(eq(viagensSugestoesTable.id, id));

  // Update preferences
  const prefs = await getOrCreatePrefs(sug.viagemId);
  const tiposAceitos = prefs.tiposAceitos || "";
  const novosAceitos = tiposAceitos ? `${tiposAceitos},${sug.tipo}` : sug.tipo;
  let novoRitmo = prefs.ritmo;
  if (sug.tipo === "DIA_SOBRECARREGADO" || sug.tipo === "MOVER_LUGAR") novoRitmo = "moderado";

  await db.update(viagensPreferenciasTable).set({
    sugestoesAceitas: (prefs.sugestoesAceitas || 0) + 1,
    tiposAceitos: novosAceitos,
    ritmo: novoRitmo,
    updatedAt: new Date(),
  }).where(eq(viagensPreferenciasTable.viagemId, sug.viagemId));

  res.json({ ok: true, sugestao: { ...sug, status: "aceita" } });
});

router.post("/viagens/sugestoes/:id/ignorar", async (req, res) => {
  const id = Number(req.params.id);
  const [sug] = await db.select().from(viagensSugestoesTable).where(eq(viagensSugestoesTable.id, id));
  if (!sug) return res.status(404).json({ error: "Sugestão não encontrada" });

  await db.update(viagensSugestoesTable)
    .set({ status: "ignorada", updatedAt: new Date() })
    .where(eq(viagensSugestoesTable.id, id));

  // Update preferences — learn what user ignores
  const prefs = await getOrCreatePrefs(sug.viagemId);
  const tiposIgnorados = prefs.tiposIgnorados || "";
  const novosIgnorados = tiposIgnorados ? `${tiposIgnorados},${sug.tipo}` : sug.tipo;

  await db.update(viagensPreferenciasTable).set({
    sugestoesIgnoradas: (prefs.sugestoesIgnoradas || 0) + 1,
    tiposIgnorados: novosIgnorados,
    updatedAt: new Date(),
  }).where(eq(viagensPreferenciasTable.viagemId, sug.viagemId));

  res.json({ ok: true });
});

router.get("/viagens/trips/:id/preferencias", async (req, res) => {
  const viagemId = Number(req.params.id);
  const prefs = await getOrCreatePrefs(viagemId);
  res.json(prefs);
});

router.put("/viagens/trips/:id/preferencias", async (req, res) => {
  const viagemId = Number(req.params.id);
  const { ritmo, transportePreferido, horarioInicio } = req.body;
  const prefs = await getOrCreatePrefs(viagemId);
  const [updated] = await db.update(viagensPreferenciasTable).set({
    ...(ritmo ? { ritmo } : {}),
    ...(transportePreferido ? { transportePreferido } : {}),
    ...(horarioInicio ? { horarioInicio } : {}),
    updatedAt: new Date(),
  }).where(eq(viagensPreferenciasTable.viagemId, viagemId)).returning();
  res.json(updated);
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
