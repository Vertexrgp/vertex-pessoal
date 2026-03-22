import { Router } from "express";
import { db } from "@workspace/db";
import { creditCardsTable, transactionsTable } from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

function parseCardBody(body: any) {
  return {
    nomeCartao: String(body.nomeCartao ?? ""),
    apelidoCartao: body.apelidoCartao ? String(body.apelidoCartao) : null,
    banco: String(body.banco ?? ""),
    bandeira: String(body.bandeira ?? "Outros"),
    limiteTotal: String(Number(body.limiteTotal ?? 0).toFixed(2)),
    diaFechamento: Math.round(Number(body.diaFechamento ?? 5)),
    diaVencimento: Math.round(Number(body.diaVencimento ?? 10)),
    cor: String(body.cor ?? "#6366F1"),
    ultimos4Digitos: String(body.ultimos4Digitos ?? ""),
    ativo: body.ativo !== false,
  };
}

const router = Router();

// ─── LIST CREDIT CARDS ────────────────────────────────────────────────────────
router.get("/credit-cards", async (_req, res) => {
  const cards = await db.select().from(creditCardsTable).orderBy(creditCardsTable.nomeCartao);
  res.json(cards.map(c => ({ ...c, limiteTotal: Number(c.limiteTotal) })));
});

// ─── CREATE CREDIT CARD ───────────────────────────────────────────────────────
router.post("/credit-cards", async (req, res) => {
  const data = parseCardBody(req.body);
  const [card] = await db.insert(creditCardsTable).values(data).returning();
  res.status(201).json({ ...card, limiteTotal: Number(card.limiteTotal) });
});

// ─── GET CREDIT CARD ──────────────────────────────────────────────────────────
router.get("/credit-cards/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [card] = await db.select().from(creditCardsTable).where(eq(creditCardsTable.id, id));
  if (!card) return res.status(404).json({ error: "Not found" });
  res.json({ ...card, limiteTotal: Number(card.limiteTotal) });
});

// ─── UPDATE CREDIT CARD ───────────────────────────────────────────────────────
router.put("/credit-cards/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const data = parseCardBody(req.body);
  const [card] = await db.update(creditCardsTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(creditCardsTable.id, id))
    .returning();
  if (!card) return res.status(404).json({ error: "Not found" });
  res.json({ ...card, limiteTotal: Number(card.limiteTotal) });
});

// ─── DELETE CREDIT CARD ───────────────────────────────────────────────────────
router.delete("/credit-cards/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(creditCardsTable).where(eq(creditCardsTable.id, id));
  res.status(204).send();
});

// ─── GET FATURA ───────────────────────────────────────────────────────────────
// Returns all items of a fatura for a given month/year
router.get("/credit-cards/:id/fatura", async (req, res) => {
  const cardId = parseInt(req.params.id);
  const month = parseInt(String(req.query.month ?? new Date().getMonth() + 1));
  const year = parseInt(String(req.query.year ?? new Date().getFullYear()));

  const [card] = await db.select().from(creditCardsTable).where(eq(creditCardsTable.id, cardId));
  if (!card) return res.status(404).json({ error: "Not found" });

  // Billing cycle: from (diaFechamento+1) of previous month → diaFechamento of current month
  // E.g., closing day = 5 → cycle is 6/prev to 5/curr
  const closingDay = card.diaFechamento;

  // Build cycle start (day after closing of previous month)
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const cycleStart = buildDate(prevYear, prevMonth, closingDay + 1);
  const cycleEnd = buildDate(year, month, closingDay);

  // Vencimento
  const vencimento = buildDate(year, month, card.diaVencimento);

  // Fetch transactions for this card in this cycle
  const items = await db.select().from(transactionsTable).where(
    and(
      eq(transactionsTable.creditCardId, cardId),
      gte(transactionsTable.competenceDate, cycleStart),
      lte(transactionsTable.competenceDate, cycleEnd)
    )
  ).orderBy(transactionsTable.competenceDate);

  const formattedItems = items.map(tx => ({ ...tx, amount: Number(tx.amount) }));

  const totalFatura = formattedItems.reduce((acc, tx) => acc + tx.amount, 0);
  const totalPago = formattedItems.filter(tx => tx.status === "paid").reduce((acc, tx) => acc + tx.amount, 0);
  const totalAberto = formattedItems.filter(tx => tx.status === "planned").reduce((acc, tx) => acc + tx.amount, 0);
  const limiteTotal = Number(card.limiteTotal);

  // Limit utilization: sum of all unpaid/open items across all future cycles
  const allOpenItems = await db.select({ amount: transactionsTable.amount }).from(transactionsTable).where(
    and(
      eq(transactionsTable.creditCardId, cardId),
      eq(transactionsTable.status, "planned")
    )
  );
  const limiteUtilizado = allOpenItems.reduce((acc, tx) => acc + Number(tx.amount), 0);
  const limiteDisponivel = Math.max(0, limiteTotal - limiteUtilizado);

  // Future invoices (next 3 months)
  const nextInvoices = [];
  for (let i = 1; i <= 3; i++) {
    let nm = month + i;
    let ny = year;
    while (nm > 12) { nm -= 12; ny++; }
    const nCycleStart = buildDate(nm === 1 ? ny - 1 : ny, nm === 1 ? 12 : nm - 1, closingDay + 1);
    const nCycleEnd = buildDate(ny, nm, closingDay);
    const nItems = await db.select({ amount: transactionsTable.amount }).from(transactionsTable).where(
      and(
        eq(transactionsTable.creditCardId, cardId),
        gte(transactionsTable.competenceDate, nCycleStart),
        lte(transactionsTable.competenceDate, nCycleEnd)
      )
    );
    const total = nItems.reduce((acc, tx) => acc + Number(tx.amount), 0);
    const installments = await db.select({ count: sql<number>`count(*)` }).from(transactionsTable).where(
      and(
        eq(transactionsTable.creditCardId, cardId),
        gte(transactionsTable.competenceDate, nCycleStart),
        lte(transactionsTable.competenceDate, nCycleEnd),
        eq(transactionsTable.creditType, "parcelado")
      )
    );
    nextInvoices.push({
      month: nm,
      year: ny,
      total,
      installmentCount: Number(installments[0]?.count ?? 0),
    });
  }

  // Total parcelado futuro
  const futureInstallments = await db.select({ amount: transactionsTable.amount }).from(transactionsTable).where(
    and(
      eq(transactionsTable.creditCardId, cardId),
      gte(transactionsTable.competenceDate, buildDate(year, month, closingDay + 1)),
      eq(transactionsTable.creditType, "parcelado"),
      eq(transactionsTable.status, "planned")
    )
  );
  const totalParceladoFuturo = futureInstallments.reduce((acc, tx) => acc + Number(tx.amount), 0);

  res.json({
    card: { ...card, limiteTotal },
    fatura: {
      month,
      year,
      cycleStart,
      cycleEnd,
      vencimento,
      totalFatura,
      totalPago,
      totalAberto,
      limiteTotal,
      limiteUtilizado,
      limiteDisponivel,
      totalParceladoFuturo,
      proximaFatura: nextInvoices[0]?.total ?? 0,
    },
    items: formattedItems,
    nextInvoices,
  });
});

function buildDate(year: number, month: number, day: number): string {
  // Clamp day to actual days in that month
  const maxDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(day, maxDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

export default router;
