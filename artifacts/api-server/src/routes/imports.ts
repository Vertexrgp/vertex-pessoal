import { Router } from "express";
import multer from "multer";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import { transactionsTable, importBatchesTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function extractTextFromFile(buffer: Buffer, mimetype: string, originalname: string): Promise<string> {
  const ext = (originalname.toLowerCase().split(".").pop() ?? "").trim();

  if (ext === "pdf" || mimetype === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === "xlsx" || ext === "xls" || mimetype.includes("spreadsheet") || mimetype.includes("excel")) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheets: string[] = [];
    workbook.SheetNames.forEach((name) => {
      const ws = workbook.Sheets[name];
      const csv = XLSX.utils.sheet_to_csv(ws);
      sheets.push(`=== Aba: ${name} ===\n${csv}`);
    });
    return sheets.join("\n\n");
  }

  return buffer.toString("utf-8");
}

async function parseTransactionsWithAI(text: string, fileName: string): Promise<any[]> {
  const prompt = `Você é um extrator de dados financeiros para um app brasileiro de finanças pessoais. Analise o texto abaixo extraído de um documento financeiro (fatura de cartão, extrato bancário, CSV ou planilha) e extraia todos os lançamentos/transações.

Para cada transação, extraia:
- date: data no formato YYYY-MM-DD (se o ano não estiver explícito, use o ano mais recente plausível baseado no contexto)
- description: nome limpo do estabelecimento/descrição em português
- amount: número positivo (sempre positivo, nunca negativo)
- type: "expense" (despesa/compra/débito) ou "income" (receita/crédito/depósito/estorno)
- installmentCurrent: número da parcela atual se parcelado (ex: 3 para "3/12"), null se não parcelado
- installmentTotal: total de parcelas se parcelado (ex: 12 para "3/12"), null se não parcelado
- suggestedCategory: categoria mais provável dentre: Alimentação, Transporte, Saúde, Educação, Lazer, Moradia, Compras, Assinaturas, Investimentos, Receita, Outros
- confidence: "high" (certeza), "medium" (provável) ou "low" (incerto)

Regras importantes:
- Créditos/pagamentos recebidos = "income"; débitos/compras/pagamentos feitos = "expense"
- Ignore linhas de totais, saldos, cabeçalhos e rodapés
- Para texto brasileiro: PGTO/PG = pagamento, COMPR = compra, SAQ = saque, DEP = depósito, PIX = pix, IOF = imposto
- Remova duplicatas óbvias
- Para parcelamento: "AMAZON 03/12" → installmentCurrent=3, installmentTotal=12
- Netflix, Spotify, YouTube = Assinaturas
- Uber, 99, Ifood Delivery = Transporte
- Supermercado, Mercado, Padaria = Alimentação
- Farmácia, Hospital, Médico = Saúde

Retorne APENAS um array JSON válido, sem markdown, sem texto extra.

TEXTO A ANALISAR (arquivo: ${fileName}):
${text.substring(0, 14000)}`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "[]";

  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── POST /imports/upload ─────────────────────────────────────────────────────
router.post("/imports/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const { buffer, originalname, mimetype } = req.file;
    const userId = (req as any).user?.id;

    const text = await extractTextFromFile(buffer, mimetype, originalname);

    if (!text || text.trim().length < 20) {
      return res.status(400).json({ error: "Não foi possível extrair dados do arquivo. Verifique se o arquivo contém texto legível." });
    }

    const rawTransactions = await parseTransactionsWithAI(text, originalname);

    if (!rawTransactions.length) {
      return res.status(422).json({ error: "Nenhum lançamento identificado no arquivo. Verifique se o arquivo contém transações financeiras." });
    }

    const existing = await db
      .select({
        competenceDate: transactionsTable.competenceDate,
        amount: transactionsTable.amount,
        description: transactionsTable.description,
      })
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, userId));

    const transactions = rawTransactions.map((tx: any) => {
      const amountNum = Math.abs(Number(tx.amount) || 0);
      const isDuplicate = existing.some((e) => {
        const sameDate = e.competenceDate === tx.date;
        const sameAmount = Math.abs(Number(e.amount) - amountNum) < 0.02;
        const descA = String(e.description ?? "").toLowerCase().replace(/\s+/g, "");
        const descB = String(tx.description ?? "").toLowerCase().replace(/\s+/g, "");
        const similarDesc = descA.length > 3 && descB.length > 3 && (descA.includes(descB.substring(0, 6)) || descB.includes(descA.substring(0, 6)));
        return sameDate && sameAmount && similarDesc;
      });

      return {
        _id: crypto.randomUUID(),
        date: tx.date ?? new Date().toISOString().split("T")[0],
        description: tx.description ?? "Lançamento importado",
        amount: amountNum,
        type: tx.type === "income" ? "income" : "expense",
        installmentCurrent: tx.installmentCurrent ?? null,
        installmentTotal: tx.installmentTotal ?? null,
        suggestedCategory: tx.suggestedCategory ?? "Outros",
        confidence: tx.confidence ?? "medium",
        categoryId: null as number | null,
        accountId: null as number | null,
        creditCardId: null as number | null,
        isDuplicate,
        selected: !isDuplicate,
      };
    });

    res.json({
      fileName: originalname,
      fileType: mimetype,
      count: transactions.length,
      transactions,
    });
  } catch (err: any) {
    console.error("Import upload error:", err);
    res.status(500).json({ error: err.message ?? "Erro ao processar arquivo" });
  }
});

// ─── POST /imports/confirm ────────────────────────────────────────────────────
router.post("/imports/confirm", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { fileName, fileType, transactions } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: "Nenhum lançamento para importar" });
    }

    const rows = transactions.map((tx: any) => ({
      description: String(tx.description || "Lançamento importado"),
      amount: Number(tx.amount || 0).toFixed(2),
      type: tx.type === "income" ? ("income" as const) : ("expense" as const),
      status: "paid" as const,
      competenceDate: String(tx.date || new Date().toISOString().split("T")[0]),
      movementDate: String(tx.date || new Date().toISOString().split("T")[0]),
      categoryId: tx.categoryId ? Number(tx.categoryId) : null,
      accountId: tx.accountId ? Number(tx.accountId) : null,
      creditCardId: tx.creditCardId ? Number(tx.creditCardId) : null,
      paymentMethod: tx.paymentMethod || null,
      creditType: tx.installmentTotal ? "parcelado" : null,
      currentInstallment: tx.installmentCurrent ? Number(tx.installmentCurrent) : null,
      totalInstallments: tx.installmentTotal ? Number(tx.installmentTotal) : null,
      notes: `Importado de: ${fileName}`,
      userId,
    }));

    const inserted = await db.insert(transactionsTable).values(rows).returning({ id: transactionsTable.id });

    const [batch] = await db
      .insert(importBatchesTable)
      .values({
        userId,
        fileName: String(fileName ?? "arquivo"),
        fileType: String(fileType ?? "unknown"),
        totalItems: transactions.length,
        importedItems: inserted.length,
        status: "completed",
      })
      .returning();

    res.status(201).json({ batchId: batch.id, importedCount: inserted.length });
  } catch (err: any) {
    console.error("Import confirm error:", err);
    res.status(500).json({ error: err.message ?? "Erro ao importar lançamentos" });
  }
});

// ─── GET /imports ─────────────────────────────────────────────────────────────
router.get("/imports", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const batches = await db
      .select()
      .from(importBatchesTable)
      .where(eq(importBatchesTable.userId, userId))
      .orderBy(sql`${importBatchesTable.createdAt} DESC`)
      .limit(50);
    res.json(batches);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao listar importações" });
  }
});

export default router;
