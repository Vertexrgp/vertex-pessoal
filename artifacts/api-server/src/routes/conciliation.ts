import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, categoriesTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

// ─── Text similarity helpers ──────────────────────────────────────────────────

/** Normalize: lowercase, remove accents, keep only alphanumeric+space */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip accent marks
    .replace(/[^a-z0-9\s]/g, " ")       // punctuation → space
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Jaro-Winkler similarity (0–1).
 * Returns 1.0 for identical strings, 0 for completely different.
 */
function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (!s1.length || !s2.length) return 0;

  const matchWindow = Math.max(Math.floor(Math.max(s1.length, s2.length) / 2) - 1, 0);
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (!matches) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix boost (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Composite similarity:
 * - Jaro-Winkler on full string (weight 0.5)
 * - Token-set overlap: words common to both / total unique words (weight 0.5)
 * Returns 0–1.
 */
function descriptionSimilarity(raw1: string, raw2: string): number {
  const a = normalize(raw1);
  const b = normalize(raw2);

  if (a === b) return 1;
  if (!a || !b) return 0;

  const jwScore = jaroWinkler(a, b);

  const wordsA = new Set(a.split(" ").filter(w => w.length > 2));
  const wordsB = new Set(b.split(" ").filter(w => w.length > 2));
  const union = new Set([...wordsA, ...wordsB]);
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const tokenScore = union.size > 0 ? intersection / union.size : 0;

  return jwScore * 0.5 + tokenScore * 0.5;
}

/**
 * Confidence level based on similarity scores.
 * - "high":   very likely duplicate — show prominently
 * - "medium": possible duplicate — show as suggestion
 * - none:     skip (false positive)
 */
function confidenceLevel(
  simScore: number,
  amtDiff: number,
  daysDiff: number
): "high" | "medium" | null {
  // Require minimum description similarity to even consider it
  if (simScore < 0.50) return null;

  // High confidence: similar name + same amount + same/next day
  if (simScore >= 0.72 && amtDiff <= 0.005 && daysDiff <= 2) return "high";

  // High confidence: very similar name + tiny amount diff + within 5 days
  if (simScore >= 0.80 && amtDiff <= 0.01 && daysDiff <= 5) return "high";

  // Medium confidence
  if (simScore >= 0.60 && amtDiff <= 0.02 && daysDiff <= 5) return "medium";

  // Medium: very close name even if slightly different amount/date
  if (simScore >= 0.75 && amtDiff <= 0.02 && daysDiff <= 7) return "medium";

  return null;
}

/** Build a human-readable reason string for the UI */
function buildReason(simScore: number, amtDiff: number, daysDiff: number): string {
  const parts: string[] = [];
  if (simScore >= 0.90) parts.push("nome idêntico");
  else if (simScore >= 0.75) parts.push("nome muito semelhante");
  else parts.push("nome semelhante");

  if (amtDiff === 0) parts.push("valor exato");
  else if (amtDiff < 0.005) parts.push("valor praticamente igual");
  else parts.push(`valor com diferença de ${(amtDiff * 100).toFixed(1)}%`);

  if (daysDiff === 0) parts.push("mesma data");
  else parts.push(`data com diferença de ${Math.round(daysDiff)} dia${daysDiff > 1 ? "s" : ""}`);

  return parts.join(" + ");
}

// ─── GET /api/conciliation/candidates ─────────────────────────────────────────
router.get("/candidates", async (req, res) => {
  try {
    const userId = (req as any).user?.id;

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
          sql`(${transactionsTable.conciliationStatus} IS NULL OR ${transactionsTable.conciliationStatus} NOT IN ('conciliated', 'dismissed'))`
        )
      )
      .orderBy(transactionsTable.competenceDate);

    const pairs: Array<{
      a: any; b: any;
      confidence: "high" | "medium";
      reason: string;
      simScore: number;
    }> = [];
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

        // Date within 7 days (fast pre-filter before expensive similarity)
        const dateA = new Date(a.competenceDate).getTime();
        const dateB = new Date(b.competenceDate).getTime();
        const daysDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);
        if (daysDiff > 7) continue;

        // Amount within 2% (fast pre-filter)
        const amtA = Number(a.amount);
        const amtB = Number(b.amount);
        const amtDiff = Math.abs(amtA - amtB) / Math.max(amtA, amtB, 0.01);
        if (amtDiff > 0.02) continue;

        // ── Description similarity (the critical gate) ──
        const simScore = descriptionSimilarity(a.description, b.description);
        const confidence = confidenceLevel(simScore, amtDiff, daysDiff);
        if (!confidence) continue; // Low similarity → not a duplicate

        const reason = buildReason(simScore, amtDiff, daysDiff);

        pairs.push({
          a: { ...a, amount: amtA },
          b: { ...b, amount: amtB },
          confidence,
          reason,
          simScore,
        });
        usedIds.add(a.id);
        usedIds.add(b.id);
        break;
      }
    }

    // Sort: high confidence first, then by simScore descending
    pairs.sort((x, y) => {
      if (x.confidence !== y.confidence) return x.confidence === "high" ? -1 : 1;
      return y.simScore - x.simScore;
    });

    res.json(pairs.slice(0, 50));
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao buscar candidatos" });
  }
});

// ─── POST /api/conciliation/merge ─────────────────────────────────────────────
router.post("/merge", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { keepId, deleteId } = req.body;
    if (!keepId || !deleteId) return res.status(400).json({ error: "keepId e deleteId são obrigatórios" });

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

// ─── POST /api/conciliation/dismiss ───────────────────────────────────────────
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
