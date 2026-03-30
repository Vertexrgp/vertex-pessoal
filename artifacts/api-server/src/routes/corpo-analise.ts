import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  performanceCorpoAnaliseTable,
  performanceBodyGoalTable,
  performanceBodyPhotosTable,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const objectStorageService = new ObjectStorageService();

const VALID_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ValidMediaType = typeof VALID_MEDIA_TYPES[number];

/* ─── Download photo as base64 ─────────────────────────────────────────── */
async function photoToBase64(photo: { objectPath: string | null; imageData: string | null }): Promise<{ base64: string; mediaType: ValidMediaType } | null> {
  try {
    if (photo.objectPath) {
      const objectFile = await objectStorageService.getObjectEntityFile(photo.objectPath);
      // Use file.download() to get buffer directly — more reliable than streaming
      const [buffer] = await objectFile.download();
      if (!buffer || buffer.length < 500) return null; // skip tiny/invalid images

      // Detect media type from file magic bytes
      let mediaType: ValidMediaType = "image/jpeg";
      if (buffer[0] === 0x89 && buffer[1] === 0x50) mediaType = "image/png";
      else if (buffer[0] === 0x47 && buffer[1] === 0x49) mediaType = "image/gif";
      else if (buffer[0] === 0x52 && buffer[1] === 0x49) mediaType = "image/webp";

      return { base64: buffer.toString("base64"), mediaType };
    }
    if (photo.imageData) {
      const match = photo.imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (match && VALID_MEDIA_TYPES.includes(match[1] as ValidMediaType)) {
        return { base64: match[2], mediaType: match[1] as ValidMediaType };
      }
    }
    return null;
  } catch { return null; }
}

/* ─── GET latest analysis ───────────────────────────────────────────────── */
router.get("/performance/corpo-analise", async (_req: Request, res: Response) => {
  try {
    const [row] = await db.select()
      .from(performanceCorpoAnaliseTable)
      .orderBy(desc(performanceCorpoAnaliseTable.createdAt))
      .limit(1);
    res.json(row ?? null);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar análise" });
  }
});

/* ─── POST trigger analysis ─────────────────────────────────────────────── */
router.post("/performance/corpo-analise", async (req: Request, res: Response) => {
  try {
    // 1. Fetch goal
    const [goal] = await db.select().from(performanceBodyGoalTable).limit(1);

    // 2. Fetch all photos
    const photos = await db.select().from(performanceBodyPhotosTable).orderBy(performanceBodyPhotosTable.createdAt);

    const frentePhoto = photos.find(p => p.tipo === "atual_frente") ?? null;
    const ladoPhoto = photos.find(p => p.tipo === "atual_lado") ?? null;
    const costasPhoto = photos.find(p => p.tipo === "atual_costas") ?? null;
    const refPhotos = photos.filter(p => p.tipo === "objetivo");

    // 3. Create pending record
    const [analise] = await db.insert(performanceCorpoAnaliseTable).values({
      goalId: goal?.id ?? null,
      status: "pending",
    }).returning();

    // 4. Download and encode photos
    const [frenteB64, ladoB64, costasB64, ...refB64s] = await Promise.all([
      frentePhoto ? photoToBase64(frentePhoto) : null,
      ladoPhoto ? photoToBase64(ladoPhoto) : null,
      costasPhoto ? photoToBase64(costasPhoto) : null,
      ...refPhotos.map(p => photoToBase64(p)),
    ]);

    const hasCurrentPhotos = frenteB64 || ladoB64 || costasB64;
    const hasRefPhotos = refB64s.some(Boolean);

    // 5. Build the image content blocks
    const contentBlocks: any[] = [];

    if (hasCurrentPhotos) {
      contentBlocks.push({ type: "text", text: "=== FOTOS DO FÍSICO ATUAL ===" });
      if (frenteB64) contentBlocks.push({ type: "text", text: "Frente:" }, { type: "image", source: { type: "base64", media_type: frenteB64.mediaType, data: frenteB64.base64 } });
      if (ladoB64) contentBlocks.push({ type: "text", text: "Lado:" }, { type: "image", source: { type: "base64", media_type: ladoB64.mediaType, data: ladoB64.base64 } });
      if (costasB64) contentBlocks.push({ type: "text", text: "Costas:" }, { type: "image", source: { type: "base64", media_type: costasB64.mediaType, data: costasB64.base64 } });
    }

    if (hasRefPhotos) {
      contentBlocks.push({ type: "text", text: "=== FOTOS DO FÍSICO DESEJADO / REFERÊNCIA ===" });
      for (const ref of refB64s) {
        if (ref) contentBlocks.push({ type: "image", source: { type: "base64", media_type: ref.mediaType, data: ref.base64 } });
      }
    }

    // 6. Build numeric context
    const dadosNumericos = goal ? `
Dados numéricos do usuário:
- Peso atual: ${goal.pesoAtual ?? "não informado"} kg
- % Gordura atual: ${goal.bfAtual ?? "não informado"}%
- Peso alvo: ${goal.pesoAlvo ?? "não informado"} kg
- % Gordura alvo: ${goal.bfAlvo ?? "não informado"}%
- Prazo: ${goal.prazo ?? "não informado"}
` : "Dados numéricos não disponíveis.";

    const fotoStatus = [
      !hasCurrentPhotos ? "Fotos do físico atual: NÃO FORNECIDAS — baseie a análise apenas nos dados numéricos." : "Fotos do físico atual: FORNECIDAS",
      !hasRefPhotos ? "Fotos de referência: NÃO FORNECIDAS — omita a seção corpoDesejado ou preencha com base nos dados alvo." : "Fotos de referência: FORNECIDAS",
    ].join("\n");

    contentBlocks.push({
      type: "text",
      text: `${dadosNumericos}\n${fotoStatus}

Você é um assistente especializado em análise visual corporal e estratégia física.
Analise as fotos e os dados numéricos fornecidos e gere um diagnóstico completo no seguinte formato JSON (responda APENAS com o JSON, sem texto adicional):

{
  "corpoAtual": {
    "resumo": "resumo descritivo geral do físico atual (2-3 frases)",
    "pontoFortes": ["ponto forte 1", "ponto forte 2"],
    "proporcao": "descrição da proporção geral",
    "postura": "descrição da postura aparente",
    "gruposDestaques": ["grupos musculares mais desenvolvidos"],
    "acumuloGordura": "descrição de onde há maior acúmulo de gordura"
  },
  "corpoDesejado": {
    "resumo": "resumo do físico desejado (2-3 frases)",
    "silhueta": "descrição da silhueta buscada",
    "gruposDestacados": ["grupos musculares mais destacados no objetivo"],
    "definicao": "nível aparente de definição desejado",
    "caracteristicas": ["características mais marcantes do objetivo"]
  },
  "comparacao": {
    "diferencasPrincipais": ["diferença 1", "diferença 2", "diferença 3"],
    "precisaEvolucao": ["grupo/área 1 que precisa evoluir", "grupo/área 2"],
    "jaRelativamenteBom": ["grupo/área 1 que já está razoável"]
  },
  "prioridades": [
    { "rank": 1, "grupo": "Nome do grupo muscular", "descricao": "por que é prioridade e o que trabalhar" },
    { "rank": 2, "grupo": "Nome do grupo muscular", "descricao": "por que é prioridade e o que trabalhar" },
    { "rank": 3, "grupo": "Nome do grupo muscular", "descricao": "por que é prioridade e o que trabalhar" },
    { "rank": 4, "grupo": "Nome do grupo muscular", "descricao": "por que é prioridade e o que trabalhar" },
    { "rank": 5, "grupo": "Nome do grupo muscular", "descricao": "por que é prioridade e o que trabalhar" }
  ],
  "estrategia": {
    "tipo": "cutting | bulking | recomposicao | ganho_controlado | reducao_massa",
    "titulo": "Nome comercial da estratégia (ex: Recomposição Corporal Focada)",
    "explicacao": "Explicação simples de 3-4 frases do porquê dessa estratégia"
  },
  "treino": {
    "frequenciaSemanal": 5,
    "divisao": [
      { "dia": "Segunda", "foco": "Nome do foco", "musculos": ["músculo 1", "músculo 2"] },
      { "dia": "Terça", "foco": "Nome do foco", "musculos": ["músculo 1"] },
      { "dia": "Quarta", "foco": "Nome do foco", "musculos": ["músculo 1", "músculo 2"] },
      { "dia": "Quinta", "foco": "Nome do foco", "musculos": ["músculo 1"] },
      { "dia": "Sexta", "foco": "Nome do foco", "musculos": ["músculo 1", "músculo 2"] }
    ],
    "destaquesVolume": ["grupo muscular com mais volume/frequência e porquê", "outro destaque"]
  },
  "observacoes": [
    "Observação ou alerta importante 1",
    "Observação ou alerta importante 2",
    "Esta análise é um guia visual e não substitui avaliação médica ou de profissional de educação física"
  ]
}`,
    });

    // 7. Call Claude with vision
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: contentBlocks }],
    });

    const text = message.content.find((b: any) => b.type === "text")?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Resposta inválida da IA");

    const result = JSON.parse(jsonMatch[0]);

    // 8. Update record with results
    const [updated] = await db.update(performanceCorpoAnaliseTable)
      .set({
        status: "done",
        corpoAtual: result.corpoAtual ?? null,
        corpoDesejado: result.corpoDesejado ?? null,
        comparacao: result.comparacao ?? null,
        prioridades: result.prioridades ?? null,
        estrategia: result.estrategia ?? null,
        treino: result.treino ?? null,
        observacoes: result.observacoes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(performanceCorpoAnaliseTable.id, analise.id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    const msg = err?.message ?? "Erro desconhecido";
    // Try to mark as error in DB if possible
    try {
      await db.insert(performanceCorpoAnaliseTable).values({
        status: "error",
        erro: msg,
      });
    } catch {}
    res.status(500).json({ error: "Falha na análise: " + msg });
  }
});

export default router;
