import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, categoriesTable, subcategoriesTable } from "@workspace/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

const router = Router();

// ─── GET /api/conciliation/candidates ─────────────────────────────────────
// Returns pairs of potentially duplicate transactions using a SQL self-join:
// same userId, same type, amount within 2%, date within 7 days, neither conciliated/dismissed
router.get("/candidates", async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    // Fetch all non-conciliated transactions for the user
    const txs = await db
      .select({
        id: transactionsTable.id,
        competenceDate: transactionsTable.competenceDate,
        description: transactionsTable.description,
        amount: transactionsTable.amount,
        type: transactionsTable.type,
        categoryId: transactionsTable.categoryId,
        categoryName: categoriesTable.name,
        paymentMethod: transactionsTable.paymentMethod,
        status: transactionsTable.status,
        creditType: transactionsTable.creditType,
        installmentGroupId: transactionsTable.installmentGroupId,
        conciliationStatus: transactionsTable.conciliationStatus,
        createdAt: transactionsTable.createdAt,
      })
      .from(transactionsTable)
      .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
      .where(
        and(
          eq(transactionsTable.userId, userId),
          sql`${transactionsTable.conciliationStatus} IS NULL OR ${transactionsTable.conciliationStatus} NOT IN ('conciliated', 'dismissed')`
        )
      )
      .orderBy(transactionsTable.competenceDate);

    // Find pairs client-side (avoids complex SQL self-join in drizzle)
    const pairs: Array<{ a: any; b: any; score: number }> = [];
    const usedIds = new Set<number>();

    for (let i = 0; i < txs.length; i++) {
      if (usedIds.has(txs[i].id)) continue;
      for (let j = i + 1; j < txs.length; j++) {
        if (usedIds.has(txs[j].id)) continue;
        const a = txs[i];
        const b = txs[j];

        // Must be same type
        if (a.type !== b.type) continue;

        // Must not be in the same installment group
        if (a.installmentGroupId && a.installmentGroupId === b.installmentGroupId) continue;

        // Date within 7 days
        const dateA = new Date(a.competenceDate).getTime();
        const dateB = new Date(b.competenceDate).getTime();
        const daysDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);
        if (daysDiff > 7) continue;

        // Amount within 2%
        const amtA = Number(a.amount);
        const amtB = Number(b.amount);
        const amtDiff = Math.abs(amtA - amtB) / Math.max(amtA, amtB, 0.01);
        if (amtDiff > 0.02) continue;

        // Score: lower is better match
        let score = daysDiff * 10 + amtDiff * 100;

        // Bonus: description similarity
        const descA = a.description.toLowerCase().trim();
        const descB = b.description.toLowerCase().trim();
        const wordsA = new Set(descA.split(/\s+/).filter(w => w.length > 3));
        const wordsB = new Set(descB.split(/\s+/).filter(w => w.length > 3));
        const common = [...wordsA].filter(w => wordsB.has(w)).length;
        if (wordsA.size > 0 || wordsB.size > 0) {
          const similarity = common / Math.max(wordsA.size, wordsB.size, 1);
          score -= similarity * 50;
        }

        pairs.push({ a: { ...a, amount: amtA }, b: { ...b, amount: amtB }, score });
        usedIds.add(a.id);
        usedIds.add(b.id);
        break; // Only pair each transaction once
      }
    }

    // Sort by score (best matches first)
    pairs.sort((x, y) => x.score - y.score);

    res.json(pairs.slice(0, 50)); // Return at most 50 pairs
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao buscar candidatos" });
  }
});

// ─── POST /api/conciliation/merge ─────────────────────────────────────────
// Keep one transaction, delete the other, mark kept as conciliated
router.post("/merge", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { keepId, deleteId } = req.body;
    if (!keepId || !deleteId) return res.status(400).json({ error: "keepId e deleteId são obrigatórios" });

    // Verify both belong to user
    const both = await db
      .select({ id: transactionsTable.id })
      .from(transactionsTable)
      .where(and(eq(transactionsTable.userId, userId), sql`${transactionsTable.id} IN (${keepId}, ${deleteId})`));

    if (both.length !== 2) return res.status(403).json({ error: "Acesso negado" });

    await db.delete(transactionsTable).where(
      and(eq(transactionsTable.id, Number(deleteId)), eq(transactionsTable.userId, userId))
    );
    await db.update(transactionsTable)
      .set({ conciliationStatus: "conciliated" })
      .where(and(eq(transactionsTable.id, Number(keepId)), eq(transactionsTable.userId, userId)));

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao conciliar" });
  }
});

// ─── POST /api/conciliation/dismiss ───────────────────────────────────────
// Mark both as dismissed (not duplicates)
router.post("/dismiss", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { id1, id2 } = req.body;
    if (!id1 || !id2) return res.status(400).json({ error: "id1 e id2 são obrigatórios" });

    for (const id of [Number(id1), Number(id2)]) {
      await db.update(transactionsTable)
        .set({ conciliationStatus: "dismissed" })
        .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)));
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao dispensar" });
  }
});

export default router;
