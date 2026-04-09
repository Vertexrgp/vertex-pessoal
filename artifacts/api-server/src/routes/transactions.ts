import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, categoriesTable, subcategoriesTable, accountsTable, creditCardsTable } from "@workspace/db/schema";
import { eq, and, sql, ilike } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function formatTx(tx: any) {
  return { ...tx, amount: Number(tx.amount) };
}

const selectFields = {
  id: transactionsTable.id,
  competenceDate: transactionsTable.competenceDate,
  movementDate: transactionsTable.movementDate,
  categoryId: transactionsTable.categoryId,
  categoryName: categoriesTable.name,
  subcategoryId: transactionsTable.subcategoryId,
  subcategoryName: subcategoriesTable.name,
  type: transactionsTable.type,
  paymentMethod: transactionsTable.paymentMethod,
  creditType: transactionsTable.creditType,
  modoUsoCartao: transactionsTable.modoUsoCartao,
  creditCardId: transactionsTable.creditCardId,
  creditCardNome: creditCardsTable.nomeCartao,
  creditCardApelido: creditCardsTable.apelidoCartao,
  creditCardDigitos: creditCardsTable.ultimos4Digitos,
  creditCardCor: creditCardsTable.cor,
  description: transactionsTable.description,
  amount: transactionsTable.amount,
  accountId: transactionsTable.accountId,
  accountName: accountsTable.name,
  status: transactionsTable.status,
  notes: transactionsTable.notes,
  totalInstallments: transactionsTable.totalInstallments,
  currentInstallment: transactionsTable.currentInstallment,
  installmentGroupId: transactionsTable.installmentGroupId,
  createdAt: transactionsTable.createdAt,
};

// ─── GET /transactions ────────────────────────────────────────────────────────
router.get("/transactions", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { month, year, categoryId, accountId, type, search } = req.query;

    const query = db
      .select(selectFields)
      .from(transactionsTable)
      .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
      .leftJoin(subcategoriesTable, eq(transactionsTable.subcategoryId, subcategoriesTable.id))
      .leftJoin(accountsTable, eq(transactionsTable.accountId, accountsTable.id))
      .leftJoin(creditCardsTable, eq(transactionsTable.creditCardId, creditCardsTable.id));

    const conditions: any[] = [eq(transactionsTable.userId, userId)];

    if (month && year) {
      conditions.push(
        sql`EXTRACT(MONTH FROM ${transactionsTable.competenceDate}) = ${Number(month)}`,
        sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${Number(year)}`
      );
    } else if (year) {
      conditions.push(sql`EXTRACT(YEAR FROM ${transactionsTable.competenceDate}) = ${Number(year)}`);
    }
    if (categoryId) conditions.push(eq(transactionsTable.categoryId, Number(categoryId)));
    if (accountId) conditions.push(eq(transactionsTable.accountId, Number(accountId)));
    if (type) conditions.push(eq(transactionsTable.type, String(type)));
    if (search) conditions.push(ilike(transactionsTable.description, `%${search}%`));

    const result = await query
      .where(and(...conditions))
      .orderBy(transactionsTable.competenceDate, transactionsTable.currentInstallment);

    res.json(result.map(formatTx));
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao listar lançamentos" });
  }
});

// ─── POST /transactions/installments ─────────────────────────────────────────
router.post("/transactions/installments", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const body = req.body;
    const data = {
      description: String(body.description ?? ""),
      totalAmount: Number(body.totalAmount),
      totalInstallments: Math.round(Number(body.totalInstallments)),
      firstInstallmentDate: String(body.firstInstallmentDate ?? ""),
      firstInstallmentStatus: body.firstInstallmentStatus === "paid" ? "paid" : "planned",
      categoryId: body.categoryId ? Number(body.categoryId) : null,
      subcategoryId: body.subcategoryId ? Number(body.subcategoryId) : null,
      accountId: body.accountId ? Number(body.accountId) : null,
      creditCardId: body.creditCardId ? Number(body.creditCardId) : null,
      paymentMethod: String(body.paymentMethod ?? "Crédito"),
      modoUsoCartao: body.modoUsoCartao ? String(body.modoUsoCartao) : null,
      notes: body.notes ? String(body.notes) : null,
    };

    if (!data.description || !data.totalAmount || data.totalInstallments < 2) {
      return res.status(400).json({ error: "Dados inválidos: descrição, valor total e número de parcelas são obrigatórios" });
    }

    const groupId = crypto.randomUUID();
    const n = data.totalInstallments;
    const baseAmount = Math.floor((data.totalAmount / n) * 100) / 100;
    const lastAmount = Math.round((data.totalAmount - baseAmount * (n - 1)) * 100) / 100;

    const firstDate = new Date(data.firstInstallmentDate + "T12:00:00Z");

    const rows = Array.from({ length: n }, (_, i) => {
      const d = new Date(firstDate);
      d.setMonth(d.getMonth() + i);
      const dateStr = d.toISOString().split("T")[0];
      const amount = i === n - 1 ? lastAmount.toFixed(2) : baseAmount.toFixed(2);
      return {
        competenceDate: dateStr,
        movementDate: dateStr,
        categoryId: data.categoryId ?? null,
        subcategoryId: data.subcategoryId ?? null,
        type: "expense" as const,
        paymentMethod: data.paymentMethod,
        creditType: "parcelado",
        modoUsoCartao: data.modoUsoCartao ?? null,
        creditCardId: data.creditCardId ?? null,
        description: data.description,
        amount,
        accountId: data.accountId ?? null,
        status: i === 0 ? (data.firstInstallmentStatus as string) : "planned",
        notes: data.notes ?? null,
        totalInstallments: n,
        currentInstallment: i + 1,
        installmentGroupId: groupId,
        userId,
      };
    });

    const inserted = await db.insert(transactionsTable).values(rows).returning();
    res.status(201).json(inserted.map(formatTx));
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao criar parcelas" });
  }
});

// ─── POST /transactions ───────────────────────────────────────────────────────
router.post("/transactions", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const body = req.body;

    if (!body.description || body.amount == null || !body.type || !body.status || !body.competenceDate || !body.movementDate) {
      return res.status(400).json({
        error: "Campos obrigatórios ausentes: descrição, valor, tipo, status, data de competência e data de movimento"
      });
    }

    const data = {
      description: String(body.description),
      amount: Number(body.amount).toFixed(2),
      type: String(body.type) as "income" | "expense" | "transfer",
      status: String(body.status),
      competenceDate: String(body.competenceDate),
      movementDate: String(body.movementDate),
      categoryId: body.categoryId != null ? Number(body.categoryId) : null,
      subcategoryId: body.subcategoryId != null ? Number(body.subcategoryId) : null,
      accountId: body.accountId != null ? Number(body.accountId) : null,
      creditCardId: body.creditCardId != null ? Number(body.creditCardId) : null,
      paymentMethod: body.paymentMethod ? String(body.paymentMethod) : null,
      creditType: body.creditType ? String(body.creditType) : null,
      modoUsoCartao: body.modoUsoCartao ? String(body.modoUsoCartao) : null,
      notes: body.notes ? String(body.notes) : null,
      userId,
    };

    const [tx] = await db.insert(transactionsTable).values(data).returning();
    res.status(201).json(formatTx(tx));
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao criar lançamento" });
  }
});

// ─── GET /transactions/:id ────────────────────────────────────────────────────
router.get("/transactions/:id", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const id = parseInt(req.params.id);
    const [tx] = await db
      .select()
      .from(transactionsTable)
      .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)));
    if (!tx) return res.status(404).json({ error: "Lançamento não encontrado" });
    res.json(formatTx(tx));
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao buscar lançamento" });
  }
});

// ─── PUT /transactions/:id ────────────────────────────────────────────────────
router.put("/transactions/:id", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const id = parseInt(req.params.id);
    const body = req.body;

    const data: any = {};
    if (body.description != null) data.description = String(body.description);
    if (body.amount != null) data.amount = Number(body.amount).toFixed(2);
    if (body.type != null) data.type = String(body.type);
    if (body.status != null) data.status = String(body.status);
    if (body.competenceDate != null) data.competenceDate = String(body.competenceDate);
    if (body.movementDate != null) data.movementDate = String(body.movementDate);
    if ("categoryId" in body) data.categoryId = body.categoryId != null ? Number(body.categoryId) : null;
    if ("subcategoryId" in body) data.subcategoryId = body.subcategoryId != null ? Number(body.subcategoryId) : null;
    if ("accountId" in body) data.accountId = body.accountId != null ? Number(body.accountId) : null;
    if ("creditCardId" in body) data.creditCardId = body.creditCardId != null ? Number(body.creditCardId) : null;
    if ("paymentMethod" in body) data.paymentMethod = body.paymentMethod ? String(body.paymentMethod) : null;
    if ("creditType" in body) data.creditType = body.creditType ? String(body.creditType) : null;
    if ("modoUsoCartao" in body) data.modoUsoCartao = body.modoUsoCartao ? String(body.modoUsoCartao) : null;
    if ("notes" in body) data.notes = body.notes ? String(body.notes) : null;

    const [tx] = await db
      .update(transactionsTable)
      .set(data)
      .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)))
      .returning();
    if (!tx) return res.status(404).json({ error: "Lançamento não encontrado" });
    res.json(formatTx(tx));
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao atualizar lançamento" });
  }
});

// ─── PUT /transactions/group/:groupId ────────────────────────────────────────
router.put("/transactions/group/:groupId", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const groupId = req.params.groupId;
    const body = req.body;

    const patch: any = {};
    if ("description" in body) patch.description = String(body.description);
    if ("categoryId" in body) patch.categoryId = body.categoryId != null ? Number(body.categoryId) : null;
    if ("subcategoryId" in body) patch.subcategoryId = body.subcategoryId != null ? Number(body.subcategoryId) : null;
    if ("accountId" in body) patch.accountId = body.accountId != null ? Number(body.accountId) : null;
    if ("creditCardId" in body) patch.creditCardId = body.creditCardId != null ? Number(body.creditCardId) : null;
    if ("modoUsoCartao" in body) patch.modoUsoCartao = body.modoUsoCartao ? String(body.modoUsoCartao) : null;
    if ("notes" in body) patch.notes = body.notes ? String(body.notes) : null;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar" });
    }

    await db
      .update(transactionsTable)
      .set(patch)
      .where(and(eq(transactionsTable.installmentGroupId, groupId), eq(transactionsTable.userId, userId)));

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao atualizar série" });
  }
});

// ─── DELETE /transactions/group/:groupId ──────────────────────────────────────
router.delete("/transactions/group/:groupId", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const groupId = req.params.groupId;
    await db
      .delete(transactionsTable)
      .where(and(eq(transactionsTable.installmentGroupId, groupId), eq(transactionsTable.userId, userId)));
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao excluir parcelas" });
  }
});

// ─── DELETE /transactions/:id ─────────────────────────────────────────────────
router.delete("/transactions/:id", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const id = parseInt(req.params.id);
    await db
      .delete(transactionsTable)
      .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)));
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao excluir lançamento" });
  }
});

// ─── POST /transactions/:id/duplicate ────────────────────────────────────────
router.post("/transactions/:id/duplicate", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const id = parseInt(req.params.id);
    const [original] = await db
      .select()
      .from(transactionsTable)
      .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)));
    if (!original) return res.status(404).json({ error: "Lançamento não encontrado" });
    const { id: _id, createdAt: _ca, installmentGroupId: _gid, currentInstallment: _ci, totalInstallments: _ti, ...rest } = original;
    const [tx] = await db
      .insert(transactionsTable)
      .values({ ...rest, description: `${rest.description} (cópia)`, creditType: null })
      .returning();
    res.status(201).json(formatTx(tx));
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao duplicar lançamento" });
  }
});

// ─── POST /transactions/quick-parse ─────────────────────────────────────────
// Interpreta linguagem natural → retorna estrutura de transação para confirmação
// Arquitetura separada de transcrição/interpretação → pronto para voz no futuro
router.post("/transactions/quick-parse", async (req, res) => {
  const userId = (req as any).user?.id;
  const { text } = req.body;

  if (!text?.trim()) return res.status(400).json({ error: "Texto obrigatório" });

  const userCategories = await db
    .select({ id: categoriesTable.id, name: categoriesTable.name, type: categoriesTable.type })
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId));

  const today = new Date().toISOString().split("T")[0];
  const categoryList = userCategories.length
    ? userCategories.map(c => `${c.name} (${c.type})`).join(", ")
    : "Alimentação (expense), Transporte (expense), Saúde (expense), Lazer (expense), Moradia (expense), Educação (expense), Assinaturas (expense), Compras (expense), Salário (income), Freelance (income), Rendimentos (income)";

  const prompt = `Você é um assistente de finanças pessoais brasileiro. Interprete a frase abaixo e extraia os dados da transação financeira.

Data de hoje: ${today}
Categorias disponíveis: ${categoryList}

Frase do usuário: "${text}"

Responda APENAS com JSON válido (sem markdown), seguindo exatamente este formato:
{
  "type": "expense" ou "income",
  "amount": número decimal positivo (ex: 10.00),
  "description": "descrição curta e clara, sem detalhes do pagamento",
  "suggestedCategory": "nome exato de uma categoria da lista acima, sem o tipo entre parênteses",
  "paymentMethod": "Dinheiro" | "Débito" | "Crédito" | "Pix" | "Transferência" | null,
  "installments": número inteiro >= 2 se parcelado, null caso contrário,
  "totalAmount": valor total se parcelado (installments * valor_parcela), null caso contrário,
  "date": "YYYY-MM-DD",
  "confidence": "high" | "medium" | "low",
  "reasoning": "breve explicação em português de como interpretou a frase"
}

Regras de interpretação:
- "gastei", "paguei", "comprei", "foi", "saiu" → type: expense
- "recebi", "ganhei", "entrada de", "caiu" → type: income
- "no cartão", "crédito", "cartão de crédito" → paymentMethod: Crédito
- "no débito", "débito" → paymentMethod: Débito
- "pix", "no pix", "via pix" → paymentMethod: Pix
- "dinheiro", "em espécie" → paymentMethod: Dinheiro
- "3x", "3 vezes", "em 3", "3 parcelas" → installments: 3
- "3x de 120" → amount: 120.00, installments: 3, totalAmount: 360.00
- "em 3x de 120" → amount: 120.00, installments: 3, totalAmount: 360.00
- Se não mencionar data, use hoje (${today})
- Valores: "10 reais", "R$ 10", "dez reais", "10,00" → 10.00
- Categorização: padaria/café/restaurante/almoço/ifood → Alimentação; uber/99/ônibus/posto/gasolina → Transporte; netflix/spotify/prime → Assinaturas; farmácia/médico/remédio → Saúde; mercado/supermercado → Alimentação; freela/freelance → Freelance`;

  try {
    const { anthropic } = await import("@workspace/integrations-anthropic-ai");
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return res.status(422).json({ error: "Não consegui interpretar a frase. Tente descrever de forma diferente." });
      parsed = JSON.parse(match[0]);
    }

    const matchedCategory = userCategories.find(
      c => c.name.toLowerCase() === parsed.suggestedCategory?.toLowerCase()
    );

    return res.json({
      type: parsed.type ?? "expense",
      amount: Number(parsed.amount) || 0,
      totalAmount: parsed.totalAmount ? Number(parsed.totalAmount) : null,
      description: parsed.description ?? text,
      suggestedCategory: parsed.suggestedCategory ?? null,
      categoryId: matchedCategory?.id ?? null,
      paymentMethod: parsed.paymentMethod ?? null,
      installments: parsed.installments ? Number(parsed.installments) : null,
      date: parsed.date ?? today,
      confidence: parsed.confidence ?? "medium",
      reasoning: parsed.reasoning ?? null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Erro ao interpretar lançamento" });
  }
});

export default router;
