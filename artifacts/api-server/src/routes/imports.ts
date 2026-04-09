import { Router } from "express";
import multer from "multer";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import { transactionsTable, importBatchesTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ─── DIAGNOSTIC LOGGER ────────────────────────────────────────────────────────
function log(tag: string, msg: string, extra?: any) {
  const line = `[IMPORT:${tag}] ${msg}`;
  if (extra !== undefined) console.log(line, JSON.stringify(extra));
  else console.log(line);
}

// ─── BRAZILIAN DATE PARSER ────────────────────────────────────────────────────
function parseBrazilianDate(raw: string): string | null {
  if (!raw) return null;
  raw = raw.trim();

  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // DD/MM/YYYY or DD/MM/YY
  const dmy = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmy) {
    let [, d, m, y] = dmy;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // MM/DD/YYYY (US)
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    const mo = parseInt(m), da = parseInt(d);
    if (mo <= 12 && da <= 31) {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }

  return null;
}

// ─── BRAZILIAN AMOUNT PARSER ──────────────────────────────────────────────────
function parseBrazilianAmount(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[R$\s]/g, "");

  if (!s) return null;

  const isNeg = s.startsWith("-") || s.startsWith("(") || s.endsWith(")");
  s = s.replace(/[()+-]/g, "");

  // Brazilian: 1.234,56 → has dot as thousands and comma as decimal
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+(,\d{1,2})?$/.test(s)) {
    // 1234,56
    s = s.replace(",", ".");
  }
  // else: US format 1234.56 — keep as-is

  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return isNeg ? -n : n;
}

// ─── CSV PARSER (robust, handles ; , \t separators) ──────────────────────────
function parseCSVRobust(text: string): { headers: string[]; rows: Record<string, string>[]; delimiter: string; totalLines: number; skipped: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  log("CSV", `Total lines in file: ${lines.length}`);

  // Detect delimiter from first non-empty line
  const sample = lines.find((l) => l.length > 5) ?? "";
  const scores = { ";": 0, ",": 0, "\t": 0 };
  for (const d of Object.keys(scores) as Array<keyof typeof scores>) {
    scores[d] = (sample.match(new RegExp(`\\${d === "\t" ? "t" : d}`, "g")) ?? []).length;
  }
  const delimiter = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]) as string;
  log("CSV", `Detected delimiter: ${JSON.stringify(delimiter)}, scores:`, scores);

  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (!inQuote && line[i] === delimiter[0]) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  // Find header row: first row with >1 non-empty cells
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cells = splitLine(lines[i]);
    if (cells.filter((c) => c.trim()).length > 1) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    log("CSV", "Could not find header row");
    return { headers: [], rows: [], delimiter, totalLines: lines.length, skipped: lines.length };
  }

  const headers = splitLine(lines[headerIdx]).map((h) => h.replace(/^["']|["']$/g, "").trim());
  log("CSV", `Headers found at line ${headerIdx}:`, headers);

  const rows: Record<string, string>[] = [];
  let skipped = 0;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    if (cells.every((c) => !c.trim())) { skipped++; continue; }
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (cells[idx] ?? "").trim(); });
    rows.push(row);
  }

  log("CSV", `Parsed ${rows.length} data rows, skipped ${skipped} empty lines`);
  return { headers, rows, delimiter, totalLines: lines.length, skipped };
}

// ─── COLUMN MAPPER ────────────────────────────────────────────────────────────
const DATE_PATTERNS = /^(data|date|dt|dia|vencimento|competência|competencia|lançamento|lancamento|data\s*lançamento|data do lançamento)$/i;
const DESC_PATTERNS = /^(descrição|descricao|descrição|historico|histórico|lançamento|lancamento|título|titulo|detalhe|memo|detail|estabelecimento|beneficiário|beneficiario|narration|transaction|favorecido|complemento)$/i;
const AMOUNT_PATTERNS = /^(valor|value|amount|quantia|montante|vlr|vl|val|valor\s*(r\$|\(r\$\))|valor\s*do\s*lançamento)$/i;
// Separate credit/debit column patterns (common in Brazilian bank exports)
const CREDIT_PATTERNS = /^(crédito|credito|entrada|credit|cr\.?|recebido)$/i;
const DEBIT_PATTERNS = /^(débito|debito|saída|saida|debit|db\.?|pago)$/i;
const TYPE_PATTERNS = /^(tipo|type|natureza|operação|operacao|dc|cr\/db|débito\/crédito|natureza do lançamento)$/i;
const INSTALLMENT_PATTERNS = /^(parcela|parcelamento|installment|parc|parc\.|nº\s*parcela)$/i;

function mapColumns(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers) {
    const clean = h.trim();
    if (!map.date && DATE_PATTERNS.test(clean)) map.date = h;
    else if (!map.description && DESC_PATTERNS.test(clean)) map.description = h;
    else if (!map.amount && AMOUNT_PATTERNS.test(clean)) map.amount = h;
    else if (!map.credit && CREDIT_PATTERNS.test(clean)) map.credit = h;
    else if (!map.debit && DEBIT_PATTERNS.test(clean)) map.debit = h;
    else if (!map.type && TYPE_PATTERNS.test(clean)) map.type = h;
    else if (!map.installment && INSTALLMENT_PATTERNS.test(clean)) map.installment = h;
  }
  log("CSV", "Column mapping:", map);
  return map;
}

// ─── INSTALLMENT PARSER ────────────────────────────────────────────────────────
function parseInstallment(desc: string): { current: number | null; total: number | null; cleanDesc: string } {
  const match = desc.match(/\b(\d{1,2})\s*[\/\-]\s*(\d{1,2})\b/);
  if (match) {
    const current = parseInt(match[1]);
    const total = parseInt(match[2]);
    if (current <= total && total >= 2 && total <= 48) {
      return { current, total, cleanDesc: desc.replace(match[0], "").trim() };
    }
  }
  return { current: null, total: null, cleanDesc: desc };
}

// ─── CSV → TRANSACTIONS (structural, no AI needed for well-structured CSVs) ──
function extractFromCSV(text: string): { transactions: any[]; diagnostic: any } {
  const { headers, rows, delimiter, totalLines, skipped } = parseCSVRobust(text);
  const colMap = mapColumns(headers);

  const diagnostic = {
    totalLines,
    headerRowFound: headers.length > 0,
    headers,
    delimiter,
    dataRows: rows.length,
    skippedRows: skipped,
    columnMapping: colMap,
    missingColumns: [] as string[],
    discardedRows: [] as string[],
  };

  const hasSplitColumns = !colMap.amount && (colMap.credit || colMap.debit);
  const hasAmountColumn = !!colMap.amount;

  if (!colMap.date || !colMap.description || (!hasAmountColumn && !hasSplitColumns)) {
    diagnostic.missingColumns = [];
    if (!colMap.date) diagnostic.missingColumns.push("data");
    if (!colMap.description) diagnostic.missingColumns.push("descrição");
    if (!hasAmountColumn && !hasSplitColumns) diagnostic.missingColumns.push("valor (crédito/débito)");
    log("CSV", "Missing critical columns — will fall back to AI", diagnostic.missingColumns);
    return { transactions: [], diagnostic };
  }

  log("CSV", `Column mode: ${hasSplitColumns ? "split credit/debit" : "single amount"}`);

  const transactions: any[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = row[colMap.date] ?? "";
    const rawDesc = row[colMap.description] ?? "";
    const rawType = colMap.type ? row[colMap.type] ?? "" : "";

    // Amount resolution: single column OR split credit/debit
    let rawAmount = "";
    let derivedType: "income" | "expense" | null = null;

    if (hasAmountColumn) {
      rawAmount = row[colMap.amount] ?? "";
    } else {
      // Split columns: prefer whichever has a value
      const creditVal = (colMap.credit ? row[colMap.credit] ?? "" : "").trim();
      const debitVal = (colMap.debit ? row[colMap.debit] ?? "" : "").trim();

      if (creditVal && parseBrazilianAmount(creditVal) !== null) {
        rawAmount = creditVal;
        derivedType = "income";
      } else if (debitVal && parseBrazilianAmount(debitVal) !== null) {
        rawAmount = debitVal;
        derivedType = "expense";
      }
    }

    if (!rawDate && !rawAmount) {
      diagnostic.discardedRows.push(`linha ${i + 2}: data e valor vazios`);
      continue;
    }

    if (!rawDate) {
      diagnostic.discardedRows.push(`linha ${i + 2}: data vazia`);
      continue;
    }

    const date = parseBrazilianDate(rawDate);
    if (!date) {
      diagnostic.discardedRows.push(`linha ${i + 2}: data inválida "${rawDate}"`);
      continue;
    }

    if (!rawAmount) {
      diagnostic.discardedRows.push(`linha ${i + 2}: valor vazio (desc: ${rawDesc})`);
      continue;
    }

    const amountRaw = parseBrazilianAmount(rawAmount);
    if (amountRaw === null) {
      diagnostic.discardedRows.push(`linha ${i + 2}: valor inválido "${rawAmount}"`);
      continue;
    }

    // Type detection (priority: derived from split columns > explicit type column > sign)
    let type: "income" | "expense";
    if (derivedType) {
      type = derivedType;
    } else if (rawType) {
      const t = rawType.toLowerCase();
      if (/créd|credit|recebido|entrada|depósito|deposito|^c$/.test(t)) type = "income";
      else if (/déb|debit|pago|saída|saida|^d$/.test(t)) type = "expense";
      else type = amountRaw >= 0 ? "expense" : "income";
    } else {
      type = amountRaw < 0 ? "income" : "expense";
    }

    // Override type based on description keywords for common patterns
    const descLower2 = rawDesc.toLowerCase();
    if (/salário|salario|proventos|vencimento|freelance|ted recebida|pix recebido|depósito|deposito/.test(descLower2)) type = "income";

    const { current: installmentCurrent, total: installmentTotal, cleanDesc } = parseInstallment(rawDesc);

    // Suggest category based on description
    const descLower = rawDesc.toLowerCase();
    let suggestedCategory = "Outros";
    if (/netflix|spotify|amazon prime|youtube|globo|deezer|apple|microsoft|adobe|canva|notion/.test(descLower)) suggestedCategory = "Assinaturas";
    else if (/uber|99|taxi|ifood|rappi|ônibus|metro|gasolina|combustível|pedágio|estacionamento|porto seguro auto/.test(descLower)) suggestedCategory = "Transporte";
    else if (/mercado|supermercado|padaria|açougue|hortifruti|pão|carrefour|extra|atacadão|assaí|walmart|costco/.test(descLower)) suggestedCategory = "Alimentação";
    else if (/restaurant|restaurante|lanchonete|fast food|mcdonald|burger|pizza|sushi|ifood|rappi|bar |café/.test(descLower)) suggestedCategory = "Alimentação";
    else if (/farmácia|drogaria|remédio|hospital|clínica|médico|dentista|plano saúde|unimed|bradesco saude/.test(descLower)) suggestedCategory = "Saúde";
    else if (/escola|universidade|faculdade|curso|udemy|alura|coursera|livro|educação/.test(descLower)) suggestedCategory = "Educação";
    else if (/salário|salary|freelance|pagamento|honorário|pro labore/.test(descLower)) suggestedCategory = "Receita";
    else if (/aluguel|condomínio|iptu|luz|água|gás|internet|telefone|tim|claro|vivo|oi|net|/.test(descLower)) suggestedCategory = "Moradia";
    else if (/cinema|teatro|show|ingresso|viagem|hotel|airbnb/.test(descLower)) suggestedCategory = "Lazer";
    else if (type === "income") suggestedCategory = "Receita";

    transactions.push({
      _id: crypto.randomUUID(),
      date,
      description: cleanDesc || rawDesc,
      amount: Math.abs(amountRaw),
      type,
      installmentCurrent,
      installmentTotal,
      suggestedCategory,
      confidence: "high",
      categoryId: null,
      accountId: null,
      creditCardId: null,
    });
  }

  log("CSV", `Extracted ${transactions.length} transactions from ${rows.length} rows`);
  return { transactions, diagnostic };
}

// ─── PDF TEXT EXTRACTION (pdf-parse v1.x — lib direct import) ────────────────
// pdf-parse@1.1.1 has a known bug: index.js tries to read a test PDF on module
// load (relative path ./test/data/...) which fails in non-root CWDs.
// Fix: import lib/pdf-parse.js directly, bypassing the buggy index.js.
async function extractPDFText(buffer: Buffer): Promise<string> {
  const { createRequire } = await import("module");
  const req = createRequire(import.meta.url);
  const pdfParse = req("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{ text: string }>;
  const data = await pdfParse(buffer);
  return data.text ?? "";
}

// ─── XLSX TEXT EXTRACTION ─────────────────────────────────────────────────────
async function extractXLSXText(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const mod = (XLSX as any).default ?? XLSX;
  const workbook = mod.read(buffer, { type: "buffer" });
  const sheets: string[] = [];
  workbook.SheetNames.forEach((name: string) => {
    const ws = workbook.Sheets[name];
    const csv = mod.utils.sheet_to_csv(ws);
    sheets.push(`=== Aba: ${name} ===\n${csv}`);
  });
  return sheets.join("\n\n");
}

// ─── AI EXTRACTION FALLBACK ────────────────────────────────────────────────────
async function parseWithAI(text: string, fileName: string): Promise<any[]> {
  log("AI", `Sending ${text.length} chars to Claude Haiku for file: ${fileName}`);

  const prompt = `Você é um extrator de dados financeiros para um app brasileiro de finanças pessoais. Analise o texto abaixo extraído de um documento financeiro (fatura de cartão, extrato bancário, CSV ou planilha) e extraia TODOS os lançamentos/transações financeiras visíveis.

Para cada transação, extraia:
- date: data no formato YYYY-MM-DD (se o ano não estiver explícito, use ${new Date().getFullYear()})
- description: nome limpo do estabelecimento/descrição
- amount: número positivo
- type: "expense" (despesa/débito/compra) ou "income" (receita/crédito/depósito/estorno/salário)
- installmentCurrent: número da parcela atual (ex: 3 para "3/12"), null se não parcelado
- installmentTotal: total de parcelas (ex: 12 para "3/12"), null se não parcelado
- suggestedCategory: uma das opções: Alimentação, Transporte, Saúde, Educação, Lazer, Moradia, Compras, Assinaturas, Investimentos, Receita, Outros
- confidence: "high", "medium" ou "low"

Regras:
- Ignore linhas de totais, saldos, cabeçalhos e rodapés
- Trate valores brasileiros: vírgula como decimal (R$ 1.234,56 → 1234.56)
- Datas brasileiras: DD/MM/YYYY
- PGTO/PG = pagamento, SAQ = saque, DEP = depósito, IOF = imposto
- Netflix, Spotify = Assinaturas; Uber, 99 = Transporte; Mercado, Padaria = Alimentação
- Salário, transferência recebida = income
- Parcelas: "AMAZON 03/12" → installmentCurrent=3, installmentTotal=12

RETORNE APENAS um array JSON válido, sem markdown, sem texto explicativo.

ARQUIVO: ${fileName}
TEXTO:
${text.substring(0, 15000)}`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "[]";
  log("AI", `Response length: ${responseText.length}`);

  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    log("AI", "No JSON array found in response. Raw:", responseText.substring(0, 300));
    return [];
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const arr = Array.isArray(parsed) ? parsed : [];
    log("AI", `Parsed ${arr.length} transactions from AI`);
    return arr.map((tx: any) => ({
      ...tx,
      _id: crypto.randomUUID(),
      amount: Math.abs(Number(tx.amount) || 0),
      type: tx.type === "income" ? "income" : "expense",
      categoryId: null,
      accountId: null,
      creditCardId: null,
    }));
  } catch (e) {
    log("AI", "JSON.parse failed:", String(e));
    return [];
  }
}

// ─── DUPLICATE DETECTOR ────────────────────────────────────────────────────────
function detectDuplicates(transactions: any[], existing: any[]): any[] {
  return transactions.map((tx) => {
    const amountNum = Math.abs(Number(tx.amount) || 0);
    const isDuplicate = existing.some((e) => {
      const sameDate = e.competenceDate === tx.date;
      const sameAmount = Math.abs(Number(e.amount) - amountNum) < 0.02;
      const descA = String(e.description ?? "").toLowerCase().replace(/\W+/g, "").substring(0, 8);
      const descB = String(tx.description ?? "").toLowerCase().replace(/\W+/g, "").substring(0, 8);
      return sameDate && sameAmount && descA === descB;
    });
    return {
      ...tx,
      isDuplicate,
      selected: !isDuplicate,
    };
  });
}

// ─── POST /imports/upload ─────────────────────────────────────────────────────
router.post("/imports/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const { buffer, originalname, mimetype } = req.file;
    const userId = (req as any).user?.id;
    const ext = (originalname.toLowerCase().split(".").pop() ?? "").trim();

    log("UPLOAD", `File received: ${originalname} (${mimetype}, ${buffer.length} bytes, ext=${ext})`);

    let rawText = "";
    let usedStructuralParsing = false;
    let structuralTransactions: any[] = [];
    let diagnostic: any = {};

    // ── 1. PDF ────────────────────────────────────────────────────────────────
    if (ext === "pdf" || mimetype === "application/pdf") {
      log("PDF", "Extracting text using pdf-parse v1.x (lib/pdf-parse.js via createRequire)");
      try {
        rawText = await extractPDFText(buffer);
        log("PDF", `Extracted ${rawText.length} characters`);
        if (rawText.trim().length < 30) {
          return res.status(422).json({
            error: "O PDF parece estar protegido ou não contém texto legível. Tente exportar como CSV do seu banco.",
            diagnostic: { textLength: rawText.length },
          });
        }
      } catch (pdfErr: any) {
        log("PDF", "pdf-parse error:", pdfErr.message);
        return res.status(422).json({ error: `Erro ao ler PDF: ${pdfErr.message}` });
      }
    }

    // ── 2. XLSX / XLS ─────────────────────────────────────────────────────────
    else if (ext === "xlsx" || ext === "xls" || mimetype.includes("spreadsheet") || mimetype.includes("excel")) {
      log("XLSX", "Extracting from Excel");
      try {
        rawText = await extractXLSXText(buffer);
        log("XLSX", `Extracted ${rawText.length} characters`);
        // Try structural CSV parsing on the extracted CSV text
        const csvResult = extractFromCSV(rawText);
        diagnostic = csvResult.diagnostic;
        if (csvResult.transactions.length > 0) {
          structuralTransactions = csvResult.transactions;
          usedStructuralParsing = true;
          log("XLSX", `Structural parse: ${structuralTransactions.length} transactions`);
        }
      } catch (xlsxErr: any) {
        log("XLSX", "xlsx error:", xlsxErr.message);
        return res.status(422).json({ error: `Erro ao ler planilha: ${xlsxErr.message}` });
      }
    }

    // ── 3. CSV ────────────────────────────────────────────────────────────────
    else {
      rawText = buffer.toString("utf-8");
      log("CSV", `Text decoded, ${rawText.length} characters`);
      // Try structural parsing first
      const csvResult = extractFromCSV(rawText);
      diagnostic = csvResult.diagnostic;
      if (csvResult.transactions.length > 0) {
        structuralTransactions = csvResult.transactions;
        usedStructuralParsing = true;
        log("CSV", `Structural parse: ${structuralTransactions.length} transactions`);
      } else {
        log("CSV", "Structural parse returned 0 results — will use AI fallback", diagnostic);
      }
    }

    // ── 4. Extract transactions ───────────────────────────────────────────────
    let rawTransactions: any[];
    let parsingMethod: string;

    if (usedStructuralParsing && structuralTransactions.length > 0) {
      rawTransactions = structuralTransactions;
      parsingMethod = "structural";
    } else {
      // AI fallback
      log("AI", "Falling back to AI extraction");
      if (!rawText || rawText.trim().length < 20) {
        return res.status(422).json({
          error: "Não foi possível ler o conteúdo do arquivo.",
          diagnostic,
        });
      }
      rawTransactions = await parseWithAI(rawText, originalname);
      parsingMethod = "ai";
    }

    log("UPLOAD", `Extraction method: ${parsingMethod}, found ${rawTransactions.length} raw transactions`);

    if (!rawTransactions.length) {
      return res.status(422).json({
        error: "Nenhum lançamento identificado no arquivo. Verifique se contém transações financeiras.",
        diagnostic: {
          ...diagnostic,
          parsingMethod,
          textSample: rawText.substring(0, 300),
          hint: "Tente exportar o extrato como CSV no site do seu banco.",
        },
      });
    }

    // ── 5. Duplicate detection ────────────────────────────────────────────────
    const existing = await db
      .select({
        competenceDate: transactionsTable.competenceDate,
        amount: transactionsTable.amount,
        description: transactionsTable.description,
      })
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, userId));

    const transactions = detectDuplicates(rawTransactions, existing);
    const dupeCount = transactions.filter((t) => t.isDuplicate).length;
    log("UPLOAD", `Duplicate check: ${dupeCount}/${transactions.length} flagged`);

    res.json({
      fileName: originalname,
      fileType: mimetype,
      count: transactions.length,
      parsingMethod,
      diagnostic: {
        ...diagnostic,
        parsingMethod,
        transactionsFound: transactions.length,
        duplicatesFound: dupeCount,
      },
      transactions,
    });
  } catch (err: any) {
    console.error("Import upload error:", err);
    res.status(500).json({ error: err.message ?? "Erro ao processar arquivo", stack: err.stack?.split("\n").slice(0, 5) });
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

    log("CONFIRM", `Imported ${inserted.length} transactions, batch ${batch.id}`);
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
