import { Router } from "express";
import multer from "multer";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import { transactionsTable, importBatchesTable, creditCardsTable } from "@workspace/db/schema";
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
  if (extra !== undefined) console.log(line, typeof extra === "object" ? JSON.stringify(extra) : extra);
  else console.log(line);
}

// ─── BRAZILIAN DATE PARSER ────────────────────────────────────────────────────
function parseBrazilianDate(raw: string): string | null {
  if (!raw) return null;
  raw = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const dmy = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmy) {
    let [, d, m, y] = dmy;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
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
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+(,\d{1,2})?$/.test(s)) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return isNeg ? -n : n;
}

// ─── ROBUST CSV PARSER ────────────────────────────────────────────────────────
function parseCSVRobust(text: string): { headers: string[]; rows: Record<string, string>[]; delimiter: string; totalLines: number; skipped: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  log("CSV", `Total lines: ${lines.length}`);

  const sample = lines.find((l) => l.length > 5) ?? "";
  const scores = { ";": 0, ",": 0, "\t": 0 };
  for (const d of Object.keys(scores) as Array<keyof typeof scores>) {
    scores[d] = (sample.match(new RegExp(`\\${d === "\t" ? "t" : d}`, "g")) ?? []).length;
  }
  const delimiter = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]) as string;
  log("CSV", `Delimiter: ${JSON.stringify(delimiter)}`);

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

  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cells = splitLine(lines[i]);
    if (cells.filter((c) => c.trim()).length > 1) { headerIdx = i; break; }
  }

  if (headerIdx === -1) return { headers: [], rows: [], delimiter, totalLines: lines.length, skipped: lines.length };

  const headers = splitLine(lines[headerIdx]).map((h) => h.replace(/^["']|["']$/g, "").trim());
  log("CSV", `Headers at line ${headerIdx}:`, headers);

  const rows: Record<string, string>[] = [];
  let skipped = 0;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    if (cells.every((c) => !c.trim())) { skipped++; continue; }
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (cells[idx] ?? "").trim(); });
    rows.push(row);
  }
  log("CSV", `Data rows: ${rows.length}, skipped: ${skipped}`);
  return { headers, rows, delimiter, totalLines: lines.length, skipped };
}

// ─── COLUMN MAPPER ────────────────────────────────────────────────────────────
const DATE_PAT = /^(data|date|dt|dia|vencimento|competência|competencia|lançamento|lancamento|data\s*lançamento|data do lançamento)$/i;
const DESC_PAT = /^(descrição|descricao|historico|histórico|lançamento|lancamento|título|titulo|detalhe|memo|detail|estabelecimento|beneficiário|beneficiario|narration|transaction|favorecido|complemento)$/i;
const AMOUNT_PAT = /^(valor|value|amount|quantia|montante|vlr|vl|val|valor\s*(r\$|\(r\$\))|valor\s*do\s*lançamento)$/i;
const CREDIT_PAT = /^(crédito|credito|entrada|credit|cr\.?|recebido)$/i;
const DEBIT_PAT = /^(débito|debito|saída|saida|debit|db\.?|pago)$/i;
const TYPE_PAT = /^(tipo|type|natureza|operação|operacao|dc|cr\/db|débito\/crédito|natureza do lançamento)$/i;
const INSTALLMENT_PAT = /^(parcela|parcelamento|installment|parc|parc\.|nº\s*parcela)$/i;

function mapColumns(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers) {
    const c = h.trim();
    if (!map.date && DATE_PAT.test(c)) map.date = h;
    else if (!map.description && DESC_PAT.test(c)) map.description = h;
    else if (!map.amount && AMOUNT_PAT.test(c)) map.amount = h;
    else if (!map.credit && CREDIT_PAT.test(c)) map.credit = h;
    else if (!map.debit && DEBIT_PAT.test(c)) map.debit = h;
    else if (!map.type && TYPE_PAT.test(c)) map.type = h;
    else if (!map.installment && INSTALLMENT_PAT.test(c)) map.installment = h;
  }
  log("CSV", "Column map:", map);
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

// ─── CATEGORY SUGGESTION ──────────────────────────────────────────────────────
function suggestCategory(desc: string, type: "income" | "expense"): string {
  const d = desc.toLowerCase();
  if (/netflix|spotify|amazon prime|youtube premium|globoplay|deezer|apple one|microsoft 365|adobe|canva|notion|hbo|disney/.test(d)) return "Assinaturas";
  if (/uber|99pop|taxi|ifood|rappi|gasolina|combustível|pedágio|estacionamento|shell|posto|petroleo/.test(d)) return "Transporte";
  if (/mercado|supermercado|padaria|açougue|hortifruti|carrefour|extra|atacadão|assaí|walmart|pão de açúcar|sonda/.test(d)) return "Alimentação";
  if (/restaurante|lanchonete|mcdonald|burger|pizza|sushi|bar |café|bistro|giraffas|bk |subway|outback/.test(d)) return "Alimentação";
  if (/farmácia|drogaria|remédio|ultrafarma|pacheco|droga|hospital|clínica|médico|dentista|unimed|amil|sulamerica saude|bradesco saude/.test(d)) return "Saúde";
  if (/escola|universidade|faculdade|curso|udemy|alura|coursera|livro|saraiva|cultura|educação|colégio/.test(d)) return "Educação";
  if (/aluguel|condomínio|iptu|enel|cemig|copel|sabesp|comgas|net clarobr|vivo|tim|claro|oi |gás|internet|telefone/.test(d)) return "Moradia";
  if (/cinema|teatro|show|ingresso|ticketmaster|eventim|viagem|hotel|airbnb|booking|uber eats|delivery/.test(d)) return "Lazer";
  if (/salário|salario|proventos|vencimento|freelance|ted recebida|pix recebido|depósito|deposito|pagamento recebido|holerite/.test(d)) return "Receita";
  if (/amazon|magazine|americanas|shopee|aliexpress|mercado livre|lojas|shopping/.test(d)) return "Compras";
  if (/investimento|cdb|tesouro|fundo|ação|ações|bolsa|corretora|poupança|aplicação/.test(d)) return "Investimentos";
  if (type === "income") return "Receita";
  return "Outros";
}

// ─── CSV → TRANSACTIONS ───────────────────────────────────────────────────────
function extractFromCSV(text: string): { transactions: any[]; diagnostic: any } {
  const { headers, rows, delimiter, totalLines, skipped } = parseCSVRobust(text);
  const colMap = mapColumns(headers);

  const diagnostic: any = { totalLines, headerRowFound: headers.length > 0, headers, delimiter, dataRows: rows.length, skippedRows: skipped, columnMapping: colMap, missingColumns: [], discardedRows: [] };

  const hasSplitColumns = !colMap.amount && (colMap.credit || colMap.debit);

  if (!colMap.date || !colMap.description || (!colMap.amount && !hasSplitColumns)) {
    if (!colMap.date) diagnostic.missingColumns.push("data");
    if (!colMap.description) diagnostic.missingColumns.push("descrição");
    if (!colMap.amount && !hasSplitColumns) diagnostic.missingColumns.push("valor");
    log("CSV", "Missing columns — fallback to AI", diagnostic.missingColumns);
    return { transactions: [], diagnostic };
  }

  const transactions: any[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = row[colMap.date] ?? "";
    const rawDesc = row[colMap.description] ?? "";
    const rawType = colMap.type ? row[colMap.type] ?? "" : "";

    let rawAmount = "";
    let derivedType: "income" | "expense" | null = null;

    if (colMap.amount) {
      rawAmount = row[colMap.amount] ?? "";
    } else {
      const creditVal = (colMap.credit ? row[colMap.credit] ?? "" : "").trim();
      const debitVal = (colMap.debit ? row[colMap.debit] ?? "" : "").trim();
      if (creditVal && parseBrazilianAmount(creditVal) !== null) { rawAmount = creditVal; derivedType = "income"; }
      else if (debitVal && parseBrazilianAmount(debitVal) !== null) { rawAmount = debitVal; derivedType = "expense"; }
    }

    if (!rawDate) { diagnostic.discardedRows.push(`linha ${i + 2}: data vazia`); continue; }
    const date = parseBrazilianDate(rawDate);
    if (!date) { diagnostic.discardedRows.push(`linha ${i + 2}: data inválida "${rawDate}"`); continue; }
    if (!rawAmount) { diagnostic.discardedRows.push(`linha ${i + 2}: valor vazio (${rawDesc})`); continue; }
    const amountRaw = parseBrazilianAmount(rawAmount);
    if (amountRaw === null) { diagnostic.discardedRows.push(`linha ${i + 2}: valor inválido "${rawAmount}"`); continue; }

    let type: "income" | "expense";
    if (derivedType) {
      type = derivedType;
    } else if (rawType) {
      const t = rawType.toLowerCase();
      if (/créd|credit|recebido|entrada|depósito|deposito|^c$/.test(t)) type = "income";
      else if (/déb|debit|pago|saída|saida|^d$/.test(t)) type = "expense";
      else type = amountRaw < 0 ? "income" : "expense";
    } else {
      type = amountRaw < 0 ? "income" : "expense";
    }

    const descLower = rawDesc.toLowerCase();
    if (/salário|salario|proventos|freelance|ted recebida|pix recebido|depósito recebido/.test(descLower)) type = "income";

    const { current: installmentCurrent, total: installmentTotal, cleanDesc } = parseInstallment(rawDesc);

    transactions.push({
      _id: crypto.randomUUID(),
      purchaseDate: date,
      description: cleanDesc || rawDesc,
      amount: Math.abs(amountRaw),
      type,
      installmentCurrent,
      installmentTotal,
      suggestedCategory: suggestCategory(rawDesc, type),
      confidence: "high",
      categoryId: null,
      accountId: null,
      creditCardId: null,
    });
  }

  log("CSV", `Extracted ${transactions.length} from ${rows.length} rows`);
  return { transactions, diagnostic };
}

// ─── PDF TEXT EXTRACTION ──────────────────────────────────────────────────────
// pdf-parse@1.1.1 index.js runs a test on import — bypass it by requiring lib directly
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
    sheets.push(`=== Aba: ${name} ===\n${mod.utils.sheet_to_csv(ws)}`);
  });
  return sheets.join("\n\n");
}

// ─── CARD DETECTION FROM TEXT ─────────────────────────────────────────────────
type CardDetection = { cardName: string | null; bank: string | null; statementMonth: string | null };

function detectCardFromText(text: string): CardDetection {
  const t = text.substring(0, 3000).toLowerCase();
  const result: CardDetection = { cardName: null, bank: null, statementMonth: null };

  // Bank/card detection patterns
  const cardPatterns: Array<{ pattern: RegExp; name: string; bank: string }> = [
    { pattern: /nubank|nu\s+pagamentos/, name: "Nubank", bank: "Nubank" },
    { pattern: /itaucard|itaú card|iataú|itaú\s+personnalité|personnalité/, name: "Itaú", bank: "Itaú" },
    { pattern: /bradesco|bradesco\s+prime|diners\s+club/, name: "Bradesco", bank: "Bradesco" },
    { pattern: /santander|santander\s+select/, name: "Santander", bank: "Santander" },
    { pattern: /c6\s+bank|c6bank/, name: "C6 Bank", bank: "C6 Bank" },
    { pattern: /inter\s+|banco\s+inter/, name: "Banco Inter", bank: "Inter" },
    { pattern: /caixa\s+econômica|caixa\s+economica|cef/, name: "Caixa", bank: "Caixa" },
    { pattern: /bb\s+|banco\s+do\s+brasil|ourocard/, name: "Banco do Brasil", bank: "BB" },
    { pattern: /american express|amex/, name: "Amex", bank: "Amex" },
    { pattern: /latam\s+pass|tam|latam\s+black/, name: "Latam Pass", bank: "Latam" },
    { pattern: /xp\s+|xp\s+investimentos/, name: "XP Visa", bank: "XP" },
    { pattern: /next\s+bank|next\.me/, name: "Next", bank: "Next" },
    { pattern: /will\s+bank|willbank/, name: "Will Bank", bank: "Will Bank" },
    { pattern: /picpay|pic\s+pay/, name: "PicPay", bank: "PicPay" },
  ];

  for (const { pattern, name, bank } of cardPatterns) {
    if (pattern.test(t)) {
      result.cardName = name;
      result.bank = bank;
      break;
    }
  }

  // Statement month detection
  // Patterns: "fatura de abril/2026", "abril/2026", "competência: 04/2026", "vencimento: 15/04/2026"
  const monthNames: Record<string, string> = {
    janeiro: "01", fevereiro: "02", março: "03", marco: "03", abril: "04",
    maio: "05", junho: "06", julho: "07", agosto: "08", setembro: "09",
    outubro: "10", novembro: "11", dezembro: "12",
  };

  const monthNamePat = new RegExp(`(${Object.keys(monthNames).join("|")})[\\s/]*(\\d{4})`, "i");
  const monthNameMatch = text.substring(0, 3000).match(monthNamePat);
  if (monthNameMatch) {
    const monthKey = monthNameMatch[1].toLowerCase();
    const year = monthNameMatch[2];
    const monthNum = monthNames[monthKey];
    if (monthNum) result.statementMonth = `${year}-${monthNum}`;
  }

  // Pattern: MM/YYYY or MM/YY after "fatura" or "competência" or "vencimento"
  if (!result.statementMonth) {
    const compPat = /(?:fatura|competência|competencia|período|periodo|referência|referencia|vencimento)[^\d]*(\d{2})[\s\/](\d{4})/i;
    const compMatch = text.substring(0, 3000).match(compPat);
    if (compMatch) {
      result.statementMonth = `${compMatch[2]}-${compMatch[1]}`;
    }
  }

  log("DETECT", `Card: ${result.cardName ?? "unknown"}, Month: ${result.statementMonth ?? "unknown"}`);
  return result;
}

// ─── AI EXTRACTION FALLBACK ────────────────────────────────────────────────────
async function parseWithAI(text: string, fileName: string): Promise<{ transactions: any[]; detection: CardDetection }> {
  log("AI", `Sending ${text.length} chars for: ${fileName}`);

  // Run detection and AI in parallel
  const detection = detectCardFromText(text);

  const prompt = `Você é um extrator de dados financeiros para um app brasileiro. Analise este documento financeiro (fatura, extrato bancário) e extraia TODOS os lançamentos.

Para cada transação, retorne:
- purchaseDate: data da compra no formato YYYY-MM-DD (se o ano não estiver explícito, use ${new Date().getFullYear()})
- description: nome limpo do estabelecimento
- amount: número positivo
- type: "expense" (débito/compra) ou "income" (crédito/depósito/estorno)
- installmentCurrent: número da parcela (ex: 3 para "3/12"), null se não parcelado
- installmentTotal: total de parcelas (ex: 12 para "3/12"), null se não parcelado
- suggestedCategory: Alimentação|Transporte|Saúde|Educação|Lazer|Moradia|Compras|Assinaturas|Investimentos|Receita|Outros
- confidence: "high"|"medium"|"low"

Regras:
- Ignore totais, saldos, cabeçalhos, rodapés
- Valores brasileiros: vírgula decimal (R$ 1.234,56 → 1234.56)
- Datas: DD/MM/YYYY ou DD/MM/AA
- Parcelamento: "AMAZON 03/12" → installmentCurrent=3, installmentTotal=12
- Salário, PIX recebido, TED recebida = income; compras, débitos = expense
- Netflix/Spotify = Assinaturas; Uber/99 = Transporte; Mercado = Alimentação

APENAS um array JSON válido, sem markdown.

ARQUIVO: ${fileName}
TEXTO:
${text.substring(0, 14000)}`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "[]";
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) { log("AI", "No JSON array found"); return { transactions: [], detection }; }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const transactions = Array.isArray(parsed) ? parsed.map((tx: any) => ({
      ...tx,
      _id: crypto.randomUUID(),
      purchaseDate: tx.purchaseDate ?? new Date().toISOString().split("T")[0],
      amount: Math.abs(Number(tx.amount) || 0),
      type: tx.type === "income" ? "income" : "expense",
      categoryId: null,
      accountId: null,
      creditCardId: null,
    })) : [];
    log("AI", `Parsed ${transactions.length} transactions`);
    return { transactions, detection };
  } catch {
    return { transactions: [], detection };
  }
}

// ─── DUPLICATE DETECTOR ────────────────────────────────────────────────────────
function detectDuplicates(transactions: any[], existing: any[]): any[] {
  return transactions.map((tx) => {
    const amountNum = Math.abs(Number(tx.amount) || 0);
    const isDuplicate = existing.some((e) => {
      const sameDate = (e.movementDate ?? e.competenceDate) === tx.purchaseDate;
      const sameAmount = Math.abs(Number(e.amount) - amountNum) < 0.02;
      const descA = String(e.description ?? "").toLowerCase().replace(/\W+/g, "").substring(0, 8);
      const descB = String(tx.description ?? "").toLowerCase().replace(/\W+/g, "").substring(0, 8);
      return sameDate && sameAmount && descA === descB;
    });
    return { ...tx, isDuplicate, selected: !isDuplicate };
  });
}

// ─── POST /imports/upload ─────────────────────────────────────────────────────
router.post("/imports/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    const { buffer, originalname, mimetype } = req.file;
    const userId = (req as any).user?.id;
    const ext = (originalname.toLowerCase().split(".").pop() ?? "").trim();

    log("UPLOAD", `File: ${originalname} (${mimetype}, ${buffer.length} bytes)`);

    let rawText = "";
    let usedStructural = false;
    let structuralTxs: any[] = [];
    let diagnostic: any = {};
    let detection: CardDetection = { cardName: null, bank: null, statementMonth: null };

    // ── PDF ───────────────────────────────────────────────────────────────────
    if (ext === "pdf" || mimetype === "application/pdf") {
      log("PDF", "Extracting via pdf-parse/lib (v1.x)");
      try {
        rawText = await extractPDFText(buffer);
        log("PDF", `Extracted ${rawText.length} chars`);
        detection = detectCardFromText(rawText);
        if (rawText.trim().length < 30) {
          return res.status(422).json({ error: "PDF protegido ou sem texto legível. Exporte como CSV no site do banco." });
        }
      } catch (pdfErr: any) {
        log("PDF", "Error:", pdfErr.message);
        return res.status(422).json({ error: `Erro ao ler PDF: ${pdfErr.message}` });
      }
    }

    // ── XLSX / XLS ────────────────────────────────────────────────────────────
    else if (ext === "xlsx" || ext === "xls" || mimetype.includes("spreadsheet") || mimetype.includes("excel")) {
      log("XLSX", "Extracting from Excel");
      try {
        rawText = await extractXLSXText(buffer);
        detection = detectCardFromText(rawText);
        const { transactions, diagnostic: d } = extractFromCSV(rawText);
        diagnostic = d;
        if (transactions.length > 0) { structuralTxs = transactions; usedStructural = true; }
      } catch (e: any) {
        return res.status(422).json({ error: `Erro ao ler planilha: ${e.message}` });
      }
    }

    // ── CSV ───────────────────────────────────────────────────────────────────
    else {
      rawText = buffer.toString("utf-8");
      log("CSV", `Decoded ${rawText.length} chars`);
      detection = detectCardFromText(rawText);
      const { transactions, diagnostic: d } = extractFromCSV(rawText);
      diagnostic = d;
      if (transactions.length > 0) { structuralTxs = transactions; usedStructural = true; }
      else log("CSV", "Structural parse returned 0 — will use AI fallback");
    }

    // ── Extract ───────────────────────────────────────────────────────────────
    let rawTransactions: any[];
    let parsingMethod: string;

    if (usedStructural && structuralTxs.length > 0) {
      rawTransactions = structuralTxs;
      parsingMethod = "structural";
    } else {
      if (!rawText || rawText.trim().length < 20) {
        return res.status(422).json({ error: "Não foi possível ler o conteúdo do arquivo.", diagnostic });
      }
      const result = await parseWithAI(rawText, originalname);
      rawTransactions = result.transactions;
      detection = result.detection;
      parsingMethod = "ai";
    }

    log("UPLOAD", `Method: ${parsingMethod}, found ${rawTransactions.length} transactions`);

    if (!rawTransactions.length) {
      return res.status(422).json({
        error: "Nenhum lançamento identificado. Verifique se o arquivo contém transações financeiras.",
        diagnostic: { ...diagnostic, parsingMethod, textSample: rawText.substring(0, 200) },
      });
    }

    // ── Duplicate detection ───────────────────────────────────────────────────
    const existing = await db
      .select({ movementDate: transactionsTable.movementDate, competenceDate: transactionsTable.competenceDate, amount: transactionsTable.amount, description: transactionsTable.description })
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, userId));

    const transactions = detectDuplicates(rawTransactions, existing);
    const dupeCount = transactions.filter((t) => t.isDuplicate).length;

    // ── Auto-match card from user's cards ─────────────────────────────────────
    let suggestedCardId: number | null = null;
    if (detection.cardName || detection.bank) {
      const userCards = await db.select().from(creditCardsTable).where(eq(creditCardsTable.userId, userId));
      const needle = (detection.cardName ?? detection.bank ?? "").toLowerCase();
      const matched = userCards.find((c) => {
        const haystack = `${c.nomeCartao} ${c.apelidoCartao ?? ""} ${c.banco}`.toLowerCase();
        return haystack.includes(needle) || needle.includes(c.banco.toLowerCase().substring(0, 4));
      });
      if (matched) { suggestedCardId = matched.id; log("DETECT", `Matched card ID ${matched.id}: ${matched.nomeCartao}`); }
    }

    res.json({
      fileName: originalname,
      fileType: mimetype,
      count: transactions.length,
      parsingMethod,
      suggestedCardId,
      suggestedCardName: detection.cardName,
      suggestedStatementMonth: detection.statementMonth ?? new Date().toISOString().slice(0, 7),
      diagnostic: { ...diagnostic, parsingMethod, transactionsFound: transactions.length, duplicatesFound: dupeCount },
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
    const { fileName, fileType, transactions, creditCardId, statementMonth } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: "Nenhum lançamento para importar" });
    }

    // statementMonth = "YYYY-MM" → competenceDate = "YYYY-MM-01"
    const competenceDate = statementMonth ? `${statementMonth}-01` : new Date().toISOString().split("T")[0];
    const cardId = creditCardId ? Number(creditCardId) : null;

    const rows = transactions.map((tx: any) => ({
      description: String(tx.description || "Lançamento importado"),
      amount: Number(tx.amount || 0).toFixed(2),
      type: tx.type === "income" ? ("income" as const) : ("expense" as const),
      status: "paid" as const,
      competenceDate,
      movementDate: String(tx.purchaseDate || tx.date || competenceDate),
      categoryId: tx.categoryId ? Number(tx.categoryId) : null,
      accountId: tx.accountId ? Number(tx.accountId) : null,
      creditCardId: cardId,
      paymentMethod: cardId ? "Crédito" : (tx.paymentMethod ?? null),
      creditType: tx.installmentTotal ? "parcelado" : null,
      currentInstallment: tx.installmentCurrent ? Number(tx.installmentCurrent) : null,
      totalInstallments: tx.installmentTotal ? Number(tx.installmentTotal) : null,
      notes: `Importado de: ${fileName}${tx.installmentCurrent ? ` (parcela ${tx.installmentCurrent}/${tx.installmentTotal})` : ""}`,
      userId,
    }));

    const inserted = await db.insert(transactionsTable).values(rows).returning({ id: transactionsTable.id });

    const [batch] = await db.insert(importBatchesTable).values({
      userId,
      fileName: String(fileName ?? "arquivo"),
      fileType: String(fileType ?? "unknown"),
      totalItems: transactions.length,
      importedItems: inserted.length,
      status: "completed",
    }).returning();

    log("CONFIRM", `Imported ${inserted.length} txs, batch ${batch.id}, card ${cardId}, month ${statementMonth}`);
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
    const batches = await db.select().from(importBatchesTable)
      .where(eq(importBatchesTable.userId, userId))
      .orderBy(sql`${importBatchesTable.createdAt} DESC`).limit(50);
    res.json(batches);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao listar importações" });
  }
});

export default router;
