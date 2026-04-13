// Destino: artifacts/api-server/src/routes/centro-comando.ts
//
// Rotas do Centro de Comando.
// Protegidas por requireAuth (montadas após authRouter no routes/index.ts).
//
// Endpoints:
//   POST   /api/centro-comando/sync        -> batch upsert { files: [{ key, category, content }] }
//   GET    /api/centro-comando/files       -> lista resumo (sem content) de todos
//   GET    /api/centro-comando/files/:key  -> pega 1 arquivo completo (key pode conter "/")
//   GET    /api/centro-comando/brain       -> atalho para fileKey="brain"
//   GET    /api/centro-comando/tasks       -> atalho para fileKey="tasks"
//   GET    /api/centro-comando/memory      -> todos os arquivos com category="memory"
//   GET    /api/centro-comando/activity    -> últimos 50 eventos de sync
//
// Segurança: um header opcional X-Sync-Secret é comparado com process.env.CENTRO_COMANDO_SYNC_SECRET.
// Se o secret não estiver definido, a rota aceita qualquer requisição autenticada.

import { Router } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { centroComandoFiles, centroComandoSyncLog } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

const DEFAULT_USER_ID = 1;

const ALLOWED_CATEGORIES = new Set(["brain", "tasks", "memory"]);

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function inferCategory(fileKey: string): string {
  if (fileKey === "brain") return "brain";
  if (fileKey === "tasks") return "tasks";
  if (fileKey.startsWith("memory/")) return "memory";
  return "memory";
}

function checkSyncSecret(req: any): boolean {
  const expected = process.env.CENTRO_COMANDO_SYNC_SECRET;
  if (!expected) return true; // sem secret configurado = aberto (só requireAuth protege)
  const provided = req.headers["x-sync-secret"];
  if (!provided) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ─── POST /centro-comando/sync ──────────────────────────────────────────────
router.post("/centro-comando/sync", async (req, res) => {
  try {
    if (!checkSyncSecret(req)) {
      return res.status(403).json({ error: "Invalid sync secret" });
    }

    const body = req.body as {
      files?: Array<{ key: string; category?: string; content: string }>;
      source?: string;
    };

    if (!Array.isArray(body?.files)) {
      return res.status(400).json({ error: "files (array) é obrigatório" });
    }

    const source = body.source || "mac";
    const results: Array<{ key: string; action: string; hash: string }> = [];

    for (const f of body.files) {
      if (!f?.key || typeof f.content !== "string") {
        continue;
      }
      const category = f.category && ALLOWED_CATEGORIES.has(f.category)
        ? f.category
        : inferCategory(f.key);
      const hash = sha256(f.content);
      const bytes = Buffer.byteLength(f.content, "utf8");

      // Busca existente (se o hash bate é no-op)
      const [existing] = await db
        .select()
        .from(centroComandoFiles)
        .where(and(
          eq(centroComandoFiles.userId, DEFAULT_USER_ID),
          eq(centroComandoFiles.fileKey, f.key),
        ));

      if (existing && existing.contentHash === hash) {
        await db.insert(centroComandoSyncLog).values({
          userId: DEFAULT_USER_ID,
          fileKey: f.key,
          action: "noop",
          bytesBefore: bytes,
          bytesAfter: bytes,
          source,
          message: "hash match",
        });
        results.push({ key: f.key, action: "noop", hash });
        continue;
      }

      if (existing) {
        await db
          .update(centroComandoFiles)
          .set({
            content: f.content,
            contentHash: hash,
            category,
            source,
            syncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(centroComandoFiles.id, existing.id));
      } else {
        await db.insert(centroComandoFiles).values({
          userId: DEFAULT_USER_ID,
          fileKey: f.key,
          category,
          content: f.content,
          contentHash: hash,
          source,
        });
      }

      await db.insert(centroComandoSyncLog).values({
        userId: DEFAULT_USER_ID,
        fileKey: f.key,
        action: "upsert",
        bytesBefore: existing ? Buffer.byteLength(existing.content, "utf8") : 0,
        bytesAfter: bytes,
        source,
      });

      results.push({ key: f.key, action: existing ? "updated" : "created", hash });
    }

    res.json({ ok: true, count: results.length, results });
  } catch (err: any) {
    console.error("centro-comando/sync error:", err?.message);
    res.status(500).json({ error: "Erro no sync" });
  }
});

// ─── GET /centro-comando/files (resumo) ─────────────────────────────────────
router.get("/centro-comando/files", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: centroComandoFiles.id,
        fileKey: centroComandoFiles.fileKey,
        category: centroComandoFiles.category,
        contentHash: centroComandoFiles.contentHash,
        source: centroComandoFiles.source,
        syncedAt: centroComandoFiles.syncedAt,
        updatedAt: centroComandoFiles.updatedAt,
        bytes: sql<number>`length(${centroComandoFiles.content})`.as("bytes"),
      })
      .from(centroComandoFiles)
      .where(eq(centroComandoFiles.userId, DEFAULT_USER_ID))
      .orderBy(desc(centroComandoFiles.updatedAt));
    res.json(rows);
  } catch (err: any) {
    console.error("centro-comando/files error:", err?.message);
    res.status(500).json({ error: "Erro ao listar arquivos" });
  }
});

// ─── GET /centro-comando/files/* (key pode conter "/") ──────────────────────
router.get("/centro-comando/files/*", async (req, res) => {
  try {
    // O wildcard vira req.params[0] — ex: "memory/content-youtube"
    const fileKey = (req.params as any)[0] as string;
    if (!fileKey) return res.status(400).json({ error: "key inválido" });

    const [row] = await db
      .select()
      .from(centroComandoFiles)
      .where(and(
        eq(centroComandoFiles.userId, DEFAULT_USER_ID),
        eq(centroComandoFiles.fileKey, fileKey),
      ));

    if (!row) return res.status(404).json({ error: "Arquivo não encontrado" });
    res.json(row);
  } catch (err: any) {
    console.error("centro-comando/files/:key error:", err?.message);
    res.status(500).json({ error: "Erro ao buscar arquivo" });
  }
});

// ─── GET /centro-comando/brain ──────────────────────────────────────────────
router.get("/centro-comando/brain", async (_req, res) => {
  try {
    const [row] = await db
      .select()
      .from(centroComandoFiles)
      .where(and(
        eq(centroComandoFiles.userId, DEFAULT_USER_ID),
        eq(centroComandoFiles.fileKey, "brain"),
      ));
    if (!row) return res.json({ fileKey: "brain", content: "", updatedAt: null });
    res.json(row);
  } catch {
    res.status(500).json({ error: "Erro ao buscar brain" });
  }
});

// ─── GET /centro-comando/tasks ──────────────────────────────────────────────
router.get("/centro-comando/tasks", async (_req, res) => {
  try {
    const [row] = await db
      .select()
      .from(centroComandoFiles)
      .where(and(
        eq(centroComandoFiles.userId, DEFAULT_USER_ID),
        eq(centroComandoFiles.fileKey, "tasks"),
      ));
    if (!row) return res.json({ fileKey: "tasks", content: "", updatedAt: null });
    res.json(row);
  } catch {
    res.status(500).json({ error: "Erro ao buscar tasks" });
  }
});

// ─── GET /centro-comando/memory ─────────────────────────────────────────────
router.get("/centro-comando/memory", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(centroComandoFiles)
      .where(and(
        eq(centroComandoFiles.userId, DEFAULT_USER_ID),
        eq(centroComandoFiles.category, "memory"),
      ))
      .orderBy(centroComandoFiles.fileKey);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Erro ao buscar memory" });
  }
});

// ─── GET /centro-comando/activity ───────────────────────────────────────────
router.get("/centro-comando/activity", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(centroComandoSyncLog)
      .where(eq(centroComandoSyncLog.userId, DEFAULT_USER_ID))
      .orderBy(desc(centroComandoSyncLog.createdAt))
      .limit(50);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Erro ao buscar activity" });
  }
});

export default router;
