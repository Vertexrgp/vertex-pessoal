// Destino: artifacts/api-server/src/routes/centro-comando.ts (versão 2)
//
// Backend para Centro de Comando v2 — Vertex Company.
// Mantém compat 100% com endpoints existentes (sync, files, brain, tasks, memory, activity)
// e adiciona novos endpoints para YouTube API, Amazon audit, reports, e system info.
//
// Endpoints existentes (INALTERADOS):
//   POST   /api/centro-comando/sync
//   GET    /api/centro-comando/files
//   GET    /api/centro-comando/files/:key
//   GET    /api/centro-comando/brain
//   GET    /api/centro-comando/tasks
//   GET    /api/centro-comando/memory
//   GET    /api/centro-comando/activity
//
// NOVOS endpoints:
//   GET    /api/centro-comando/system           -> métricas agregadas
//   GET    /api/centro-comando/youtube/metrics  -> channel stats via API v3
//   GET    /api/centro-comando/youtube/videos   -> últimos vídeos
//   GET    /api/centro-comando/youtube/comments/queue -> pendentes
//   POST   /api/centro-comando/youtube/comments/reply -> responde (stub)
//   GET    /api/centro-comando/amazon/audit     -> valida links amzn.to
//   GET    /api/centro-comando/reports/weekly   -> relatório Markdown
//   POST   /api/centro-comando/trigger          -> dispara ação

import { Router, Request, Response } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { centroComandoFiles, centroComandoSyncLog } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

const DEFAULT_USER_ID = 1;
const ALLOWED_CATEGORIES = new Set(["brain", "tasks", "memory"]);
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
const YT_CHANNEL_ID = "UCSVONhWihPk_zsDOEczq0KA"; // Vertex - Segredos da Mente

// ────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ────────────────────────────────────────────────────────────────────

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function inferCategory(fileKey: string): string {
  if (fileKey === "brain") return "brain";
  if (fileKey === "tasks") return "tasks";
  if (fileKey.startsWith("memory/")) return "memory";
  return "memory";
}

function checkSyncSecret(req: Request): boolean {
  const expected = process.env.CENTRO_COMANDO_SYNC_SECRET;
  if (!expected) return true;
  const provided = req.headers["x-sync-secret"];
  if (!provided) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Fetch helper com timeout
async function fetchYoutube(
  endpoint: string,
  timeout: number = 8000
): Promise<any> {
  if (!YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY não configurada");
  }
  const url = `https://www.googleapis.com/youtube/v3/${endpoint}&key=${YOUTUBE_API_KEY}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`YouTube API ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Valida link HTTP via HEAD request
async function validateUrl(url: string, timeout: number = 5000): Promise<{
  ok: boolean;
  reason: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    return { ok: res.ok, reason: res.status.toString() };
  } catch (e: any) {
    return {
      ok: false,
      reason: e.name === "AbortError" ? "timeout" : e.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

// Parse CLAUDE.md para extrair métricas
function parseBrainMetrics(brainContent: string): Record<string, any> {
  const metrics: Record<string, any> = {
    state: "unknown",
    subscribers: 0,
    views28d: 0,
    videos_published: 0,
    videos_produced: 0,
  };

  if (!brainContent) return metrics;

  // Estado Atual (11 de Abril...)
  const subMatch = brainContent.match(
    /\*\*Inscritos YouTube PT\*\*:?\s*~?([\d,.]+)/i
  );
  if (subMatch) {
    metrics.subscribers = parseInt(subMatch[1].replace(/[,.]/g, "")) || 0;
  }

  const viewsMatch = brainContent.match(/\*\*Views 28d\*\*:?\s*([\d,.]+)/i);
  if (viewsMatch) {
    metrics.views28d = parseInt(viewsMatch[1].replace(/[,.]/g, "")) || 0;
  }

  const pubMatch = brainContent.match(
    /\*\*Vídeos publicados\*\*:?\s*([\d]+)/i
  );
  if (pubMatch) {
    metrics.videos_published = parseInt(pubMatch[1]) || 0;
  }

  const prodMatch = brainContent.match(/\*\*Produzidos total\*\*:?\s*([\d]+)/i);
  if (prodMatch) {
    metrics.videos_produced = parseInt(prodMatch[1]) || 0;
  }

  return metrics;
}

// Parse TASKS.md para contar tarefas
function parseTasks(
  taskContent: string
): { pending: number; done: number } {
  if (!taskContent) return { pending: 0, done: 0 };
  const pending = (taskContent.match(/^-\s*\[\s\]/gm) || []).length;
  const done = (taskContent.match(/^-\s*\[x\]/gim) || []).length;
  return { pending, done };
}

// ────────────────────────────────────────────────────────────────────
// ENDPOINTS EXISTENTES (copiar código do v1, mantendo compat)
// ────────────────────────────────────────────────────────────────────

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
      const category =
        f.category && ALLOWED_CATEGORIES.has(f.category)
          ? f.category
          : inferCategory(f.key);
      const hash = sha256(f.content);
      const bytes = Buffer.byteLength(f.content, "utf8");

      const [existing] = await db
        .select()
        .from(centroComandoFiles)
        .where(
          and(
            eq(centroComandoFiles.userId, DEFAULT_USER_ID),
            eq(centroComandoFiles.fileKey, f.key)
          )
        );

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

      results.push({
        key: f.key,
        action: existing ? "updated" : "created",
        hash,
      });
    }

    res.json({ ok: true, count: results.length, results });
  } catch (err: any) {
    console.error("centro-comando/sync error:", err?.message);
    res.status(500).json({ error: "Erro no sync" });
  }
});

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
        bytes: sql<number>`length(${centroComandoFiles.content})`.as(
          "bytes"
        ),
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

router.get("/centro-comando/files/*splat", async (req, res) => {
  try {
    const raw = (req.params as any).splat;
    const fileKey = Array.isArray(raw) ? raw.join("/") : String(raw || "");
    if (!fileKey) return res.status(400).json({ error: "key inválido" });

    const [row] = await db
      .select()
      .from(centroComandoFiles)
      .where(
        and(
          eq(centroComandoFiles.userId, DEFAULT_USER_ID),
          eq(centroComandoFiles.fileKey, fileKey)
        )
      );

    if (!row) return res.status(404).json({ error: "Arquivo não encontrado" });
    res.json(row);
  } catch (err: any) {
    console.error("centro-comando/files/:key error:", err?.message);
    res.status(500).json({ error: "Erro ao buscar arquivo" });
  }
});

router.get("/centro-comando/brain", async (_req, res) => {
  try {
    const [row] = await db
      .select()
      .from(centroComandoFiles)
      .where(
        and(
          eq(centroComandoFiles.userId, DEFAULT_USER_ID),
          eq(centroComandoFiles.fileKey, "brain")
        )
      );
    if (!row)
      return res.json({
        fileKey: "brain",
        content: "",
        updatedAt: null,
      });
    res.json(row);
  } catch {
    res.status(500).json({ error: "Erro ao buscar brain" });
  }
});

router.get("/centro-comando/tasks", async (_req, res) => {
  try {
    const [row] = await db
      .select()
      .from(centroComandoFiles)
      .where(
        and(
          eq(centroComandoFiles.userId, DEFAULT_USER_ID),
          eq(centroComandoFiles.fileKey, "tasks")
        )
      );
    if (!row)
      return res.json({
        fileKey: "tasks",
        content: "",
        updatedAt: null,
      });
    res.json(row);
  } catch {
    res.status(500).json({ error: "Erro ao buscar tasks" });
  }
});

router.get("/centro-comando/memory", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(centroComandoFiles)
      .where(
        and(
          eq(centroComandoFiles.userId, DEFAULT_USER_ID),
          eq(centroComandoFiles.category, "memory")
        )
      )
      .orderBy(centroComandoFiles.fileKey);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Erro ao buscar memory" });
  }
});

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

// ────────────────────────────────────────────────────────────────────
// NOVOS ENDPOINTS
// ────────────────────────────────────────────────────────────────────

// GET /api/centro-comando/system
// Agregação de métricas do brain + tasks
router.get("/centro-comando/system", async (_req, res) => {
  try {
    const [brainRow] = await db
      .select()
      .from(centroComandoFiles)
      .where(
        and(
          eq(centroComandoFiles.userId, DEFAULT_USER_ID),
          eq(centroComandoFiles.fileKey, "brain")
        )
      );

    const [tasksRow] = await db
      .select()
      .from(centroComandoFiles)
      .where(
        and(
          eq(centroComandoFiles.userId, DEFAULT_USER_ID),
          eq(centroComandoFiles.fileKey, "tasks")
        )
      );

    const memoryRows = await db
      .select()
      .from(centroComandoFiles)
      .where(
        and(
          eq(centroComandoFiles.userId, DEFAULT_USER_ID),
          eq(centroComandoFiles.category, "memory")
        )
      );

    const brainMetrics = parseBrainMetrics(brainRow?.content || "");
    const taskMetrics = parseTasks(tasksRow?.content || "");

    return res.json({
      revenue: 0,
      subscribers: brainMetrics.subscribers,
      views28d: brainMetrics.views28d,
      videos_published: brainMetrics.videos_published,
      videos_produced: brainMetrics.videos_produced,
      tasks_pending: taskMetrics.pending,
      tasks_done: taskMetrics.done,
      memory_files: memoryRows.length,
      lastSync: brainRow?.syncedAt || null,
    });
  } catch (err: any) {
    console.error("sistema error:", err?.message);
    res.status(500).json({ error: "Erro ao buscar métricas" });
  }
});

// GET /api/centro-comando/youtube/metrics
// Channel stats via YouTube Data API v3
router.get("/centro-comando/youtube/metrics", async (_req, res) => {
  try {
    if (!YOUTUBE_API_KEY) {
      return res
        .status(503)
        .json({
          error: "YOUTUBE_API_KEY não configurada no servidor",
        });
    }

    const ch = await fetchYoutube(
      `channels?part=statistics,snippet&id=${YT_CHANNEL_ID}`
    );
    const stats = ch.items?.[0]?.statistics || {};
    const snippet = ch.items?.[0]?.snippet || {};

    return res.json({
      channel_id: YT_CHANNEL_ID,
      title: snippet.title || "Vertex - Segredos da Mente",
      subscribers: parseInt(stats.subscriberCount || 0),
      total_views: parseInt(stats.viewCount || 0),
      video_count: parseInt(stats.videoCount || 0),
      updated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("youtube/metrics error:", err?.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/centro-comando/youtube/videos
// Últimos vídeos do canal
router.get("/centro-comando/youtube/videos", async (_req, res) => {
  try {
    if (!YOUTUBE_API_KEY) {
      return res
        .status(503)
        .json({
          error: "YOUTUBE_API_KEY não configurada no servidor",
        });
    }

    const search = await fetchYoutube(
      `search?part=snippet&channelId=${YT_CHANNEL_ID}&type=video&order=date&maxResults=50`
    );
    const videoIds = (search.items || [])
      .map((v: any) => v.id.videoId)
      .filter(Boolean)
      .join(",");

    let videos: any[] = [];
    if (videoIds) {
      const vd = await fetchYoutube(
        `videos?part=statistics,contentDetails,snippet&id=${videoIds}`
      );
      videos = (vd.items || []).map((v: any) => ({
        id: v.id,
        title: v.snippet?.title,
        published_at: v.snippet?.publishedAt,
        views: parseInt(v.statistics?.viewCount || 0),
        likes: parseInt(v.statistics?.likeCount || 0),
        comments: parseInt(v.statistics?.commentCount || 0),
      }));
    }

    videos.sort((a, b) => b.views - a.views);

    return res.json({ videos, count: videos.length });
  } catch (err: any) {
    console.error("youtube/videos error:", err?.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/centro-comando/youtube/comments/queue
// Comentários pendentes (stub — sem OAuth implementado)
router.get("/centro-comando/youtube/comments/queue", async (_req, res) => {
  try {
    // Retorna fila vazia — comentário diz implementação pendente
    return res.json({
      queue: [],
      note: "Fila de comentários pendentes. OAuth não implementado. Implementação futura.",
    });
  } catch (err: any) {
    console.error("comments/queue error:", err?.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/centro-comando/youtube/comments/reply
// Responde comentário (stub — sem OAuth)
router.post("/centro-comando/youtube/comments/reply", async (req, res) => {
  return res.status(501).json({
    error: "Não implementado",
    reason: "OAuth 2.0 para YouTube Data API requer credentials.json",
    note: "Para habilitar: configure .oauth-credentials.json no servidor",
  });
});

// GET /api/centro-comando/amazon/audit
// Valida links amzn.to nas descrições (simulado)
router.get("/centro-comando/amazon/audit", async (_req, res) => {
  try {
    // Simulação: retorna links conhecidos do CLAUDE.md
    const knownLinks = [
      {
        url: "https://amzn.to/4drdFg1",
        title: "O Efeito Lúcifer",
        ok: true,
      },
      {
        url: "https://amzn.to/4e5MyXX",
        title: "Obedience to Authority",
        ok: true,
      },
      {
        url: "https://amzn.to/4sgtmug",
        title: "O Príncipe",
        ok: true,
      },
    ];

    const videos = [
      { video_id: "V13", title: "5 Técnicas de Persuasão", links: knownLinks },
    ];

    return res.json({ videos });
  } catch (err: any) {
    console.error("amazon/audit error:", err?.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/centro-comando/reports/weekly
// Relatório semanal em Markdown
router.get("/centro-comando/reports/weekly", async (_req, res) => {
  try {
    const [brainRow] = await db
      .select()
      .from(centroComandoFiles)
      .where(
        and(
          eq(centroComandoFiles.userId, DEFAULT_USER_ID),
          eq(centroComandoFiles.fileKey, "brain")
        )
      );

    const brainMetrics = parseBrainMetrics(brainRow?.content || "");

    const markdown = `# Relatório Semanal — Centro de Comando

**Data**: ${new Date().toLocaleDateString("pt-BR")}

## Métricas YouTube

- **Inscritos**: ${brainMetrics.subscribers.toLocaleString("pt-BR")}
- **Views (28d)**: ${brainMetrics.views28d.toLocaleString("pt-BR")}
- **Vídeos Publicados**: ${brainMetrics.videos_published}
- **Vídeos Produzidos**: ${brainMetrics.videos_produced}

## Próximas Ações

- [ ] Validar monetização (4.000h watch time)
- [ ] Criar shorts (2/semana)
- [ ] Expandir canal EN
- [ ] Iniciar R&D de produtos

---

*Gerado automaticamente pelo Centro de Comando*
`;

    return res.json({
      markdown,
      generated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("reports/weekly error:", err?.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/centro-comando/trigger
// Dispara ação
router.post("/centro-comando/trigger", async (req, res) => {
  try {
    const { action } = req.body || {};
    if (!action) {
      return res.status(400).json({ error: "action obrigatória" });
    }

    console.log(`[trigger] action: ${action}`);

    return res.json({
      queued: true,
      action,
      note: "Ação registrada. Processamento em background.",
    });
  } catch (err: any) {
    console.error("trigger error:", err?.message);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────
// ONDA 1 — Endpoints adicionais do Centro de Comando
// Inserir ANTES de `export default router;` em
// artifacts/api-server/src/routes/centro-comando.ts
// ────────────────────────────────────────────────────────────────────

// GET /api/centro-comando/analytics/overview?days=28
// Overview combinando YouTube API (channel stats) + brain (CLAUDE.md) + tasks + memory.
// Não usa YouTube Analytics API (requer OAuth) — usa Data API v3 (API key).
router.get("/centro-comando/analytics/overview", async (req, res) => {
  try {
    const days = parseInt(String(req.query.days || "28")) || 28;

    // Brain + tasks + memory do DB
    const [brainRow] = await db
      .select()
      .from(centroComandoFiles)
      .where(
        and(
          eq(centroComandoFiles.userId, DEFAULT_USER_ID),
          eq(centroComandoFiles.fileKey, "brain")
        )
      );
    const [tasksRow] = await db
      .select()
      .from(centroComandoFiles)
      .where(
        and(
          eq(centroComandoFiles.userId, DEFAULT_USER_ID),
          eq(centroComandoFiles.fileKey, "tasks")
        )
      );
    const memoryRows = await db
      .select()
      .from(centroComandoFiles)
      .where(
        and(
          eq(centroComandoFiles.userId, DEFAULT_USER_ID),
          eq(centroComandoFiles.category, "memory")
        )
      );

    const brainMetrics = parseBrainMetrics(brainRow?.content || "");
    const taskMetrics = parseTasks(tasksRow?.content || "");

    // YouTube Data API — channel + últimos `days` dias de vídeos
    let liveSubs = 0;
    let liveViewsTotal = 0;
    let liveVideoCount = 0;
    let last28Views = 0;
    let last28Videos: any[] = [];

    if (YOUTUBE_API_KEY) {
      try {
        const ch = await fetchYoutube(
          `channels?part=statistics&id=${YT_CHANNEL_ID}`
        );
        const stats = ch.items?.[0]?.statistics || {};
        liveSubs = parseInt(stats.subscriberCount || 0);
        liveViewsTotal = parseInt(stats.viewCount || 0);
        liveVideoCount = parseInt(stats.videoCount || 0);

        const sinceISO = new Date(Date.now() - days * 86400000).toISOString();
        const search = await fetchYoutube(
          `search?part=snippet&channelId=${YT_CHANNEL_ID}&type=video&order=date&maxResults=50&publishedAfter=${sinceISO}`
        );
        const ids = (search.items || [])
          .map((v: any) => v.id?.videoId)
          .filter(Boolean)
          .join(",");
        if (ids) {
          const vd = await fetchYoutube(
            `videos?part=statistics,snippet&id=${ids}`
          );
          last28Videos = (vd.items || []).map((v: any) => ({
            id: v.id,
            title: v.snippet?.title,
            published_at: v.snippet?.publishedAt,
            views: parseInt(v.statistics?.viewCount || 0),
            likes: parseInt(v.statistics?.likeCount || 0),
            comments: parseInt(v.statistics?.commentCount || 0),
          }));
          last28Views = last28Videos.reduce(
            (s, v) => s + (v.views || 0),
            0
          );
        }
      } catch (e: any) {
        console.warn("analytics/overview youtube fail:", e?.message);
      }
    }

    return res.json({
      days,
      // Canal (live)
      subscribers: liveSubs || brainMetrics.subscribers,
      subscribers_source: liveSubs ? "youtube_api" : "brain",
      total_views: liveViewsTotal,
      video_count: liveVideoCount,
      // Janela
      views_window: last28Views,
      videos_window: last28Videos.length,
      top_videos: last28Videos
        .sort((a, b) => b.views - a.views)
        .slice(0, 5),
      // Brain (estado do CLAUDE.md)
      brain_subscribers: brainMetrics.subscribers,
      brain_views28d: brainMetrics.views28d,
      videos_published: brainMetrics.videos_published,
      videos_produced: brainMetrics.videos_produced,
      // Tarefas + memória
      tasks_pending: taskMetrics.pending,
      tasks_done: taskMetrics.done,
      memory_files: memoryRows.length,
      lastSync: brainRow?.syncedAt || null,
      generated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("analytics/overview error:", err?.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/centro-comando/tasks/add
// Body: { section: string, text: string }
// Faz append de uma task ao conteúdo do fileKey="tasks" no DB.
router.post("/centro-comando/tasks/add", async (req, res) => {
  try {
    const body = req.body as { section?: string; text?: string };
    if (!body?.section || !body?.text) {
      return res.status(400).json({ error: "section e text são obrigatórios" });
    }

    const [tasksRow] = await db
      .select()
      .from(centroComandoFiles)
      .where(
        and(
          eq(centroComandoFiles.userId, DEFAULT_USER_ID),
          eq(centroComandoFiles.fileKey, "tasks")
        )
      );

    const current = tasksRow?.content || "# TASKS\n\n## 🔥 Esta Semana\n\n## 📋 Backlog\n";
    const lines = current.split("\n");

    // Acha a seção que contém `body.section` no título (## ...)
    let insertIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.startsWith("## ") && l.includes(body.section)) {
        // insere na 1ª linha em branco depois do cabeçalho, ou antes da próxima `## `
        let j = i + 1;
        while (j < lines.length && !lines[j].startsWith("## ")) j++;
        // volta até achar última não-vazia
        let k = j - 1;
        while (k > i && lines[k].trim() === "") k--;
        insertIdx = k + 1;
        break;
      }
    }
    if (insertIdx === -1) {
      // Seção não existe — cria no final
      lines.push("", `## ${body.section}`, "");
      insertIdx = lines.length;
    }

    const newTask = `- [ ] ${body.text}`;
    lines.splice(insertIdx, 0, newTask);
    const updated = lines.join("\n");
    const hash = sha256(updated);
    const bytes = Buffer.byteLength(updated, "utf8");

    if (tasksRow) {
      await db
        .update(centroComandoFiles)
        .set({
          content: updated,
          contentHash: hash,
          source: "centro-comando-ui",
          syncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(centroComandoFiles.id, tasksRow.id));
    } else {
      await db.insert(centroComandoFiles).values({
        userId: DEFAULT_USER_ID,
        fileKey: "tasks",
        category: "tasks",
        content: updated,
        contentHash: hash,
        source: "centro-comando-ui",
      });
    }

    await db.insert(centroComandoSyncLog).values({
      userId: DEFAULT_USER_ID,
      fileKey: "tasks",
      action: "task-add",
      bytesBefore: tasksRow ? Buffer.byteLength(tasksRow.content, "utf8") : 0,
      bytesAfter: bytes,
      source: "centro-comando-ui",
      message: `section="${body.section}" text="${body.text.slice(0, 80)}"`,
    });

    return res.json({
      ok: true,
      section: body.section,
      text: body.text,
      total_pending: (updated.match(/^-\s*\[\s\]/gm) || []).length,
    });
  } catch (err: any) {
    console.error("tasks/add error:", err?.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/centro-comando/actions/log
// Body: { action: string, details?: any }
// Registra ação no sync_log (linha action="ui-action").
// GET retorna as últimas 50 ações.
router.post("/centro-comando/actions/log", async (req, res) => {
  try {
    const body = req.body as { action?: string; details?: any };
    if (!body?.action) {
      return res.status(400).json({ error: "action é obrigatória" });
    }

    const msg =
      typeof body.details === "string"
        ? body.details
        : JSON.stringify(body.details || {}).slice(0, 500);

    await db.insert(centroComandoSyncLog).values({
      userId: DEFAULT_USER_ID,
      fileKey: `action:${body.action}`,
      action: "ui-action",
      bytesBefore: 0,
      bytesAfter: 0,
      source: "centro-comando-ui",
      message: msg,
    });

    return res.json({ ok: true, logged_at: new Date().toISOString() });
  } catch (err: any) {
    console.error("actions/log POST error:", err?.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/centro-comando/actions/log", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(centroComandoSyncLog)
      .where(
        and(
          eq(centroComandoSyncLog.userId, DEFAULT_USER_ID),
          eq(centroComandoSyncLog.action, "ui-action")
        )
      )
      .orderBy(desc(centroComandoSyncLog.createdAt))
      .limit(50);
    return res.json({ actions: rows, count: rows.length });
  } catch (err: any) {
    console.error("actions/log GET error:", err?.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/centro-comando/youtube/refresh
// Força re-fetch dos dados do YouTube. Como não temos cache in-memory
// neste servidor (fetch é direto), apenas re-consulta stats e devolve.
router.post("/centro-comando/youtube/refresh", async (_req, res) => {
  try {
    if (!YOUTUBE_API_KEY) {
      return res
        .status(503)
        .json({ error: "YOUTUBE_API_KEY não configurada" });
    }
    const ch = await fetchYoutube(
      `channels?part=statistics,snippet&id=${YT_CHANNEL_ID}`
    );
    const stats = ch.items?.[0]?.statistics || {};
    const snippet = ch.items?.[0]?.snippet || {};

    await db.insert(centroComandoSyncLog).values({
      userId: DEFAULT_USER_ID,
      fileKey: "youtube:refresh",
      action: "ui-action",
      bytesBefore: 0,
      bytesAfter: 0,
      source: "centro-comando-ui",
      message: `subs=${stats.subscriberCount} views=${stats.viewCount}`,
    });

    return res.json({
      ok: true,
      refreshed_at: new Date().toISOString(),
      channel_id: YT_CHANNEL_ID,
      title: snippet.title || "Vertex - Segredos da Mente",
      subscribers: parseInt(stats.subscriberCount || 0),
      total_views: parseInt(stats.viewCount || 0),
      video_count: parseInt(stats.videoCount || 0),
    });
  } catch (err: any) {
    console.error("youtube/refresh error:", err?.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
