/**
 * LicitaVerify Autonomous Agent — Telegram Bot con IA.
 *
 * Proceso standalone con long polling (sin webhook, sin ngrok).
 * Usa DeepSeek como "cerebro" para decidir qué hacer con cada mensaje:
 * - Saludar / chit-chat
 * - Buscar licitaciones en Arkiv
 * - Pedir aclaración si es ambiguo
 *
 * Memoria por sesión: cada conversación tiene contexto efímero.
 * Corre con: npm run agent
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Bot, InlineKeyboard, type Context } from "grammy";
import OpenAI from "openai";
import { createPublicClient, http } from "@arkiv-network/sdk";
import { braga } from "@arkiv-network/sdk/chains";
import { eq, gte, lte } from "@arkiv-network/sdk/query";
import { parseSearchQuery } from "../lib/ai-search";
import type { ArkivFilters } from "../lib/ai-search";

// ─── Config ────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not set in .env.local");
  process.exit(1);
}

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY_LLM;
if (!DEEPSEEK_KEY) {
  console.error("❌ DEEPSEEK_API_KEY_LLM not set in .env.local");
  process.exit(1);
}

const EXPLORER_URL = (process.env.ARKIV_EXPLORER_URL || "https://explorer.braga.arkiv.network") + "/entity";

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: DEEPSEEK_KEY,
});

const bot = new Bot(BOT_TOKEN);

// ─── Memoria de sesión (efímera) ───────────────────────────────────────
// Se destruye al reiniciar el bot. Por chatId.

interface SessionMemory {
  history: { role: "user" | "assistant"; content: string }[];
  lastActivity: number;
}

const sessions = new Map<number, SessionMemory>();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min sin actividad → se pierde

function getSession(chatId: number): SessionMemory {
  let session = sessions.get(chatId);
  if (!session) {
    session = { history: [], lastActivity: Date.now() };
    sessions.set(chatId, session);
  }
  session.lastActivity = Date.now();
  return session;
}

function addToHistory(chatId: number, role: "user" | "assistant", content: string) {
  const session = getSession(chatId);
  session.history.push({ role, content });
  // Mantener últimos 20 mensajes máximo
  if (session.history.length > 20) {
    session.history = session.history.slice(-20);
  }
}

// Limpiar sesiones viejas cada 10 min
setInterval(() => {
  const now = Date.now();
  for (const [chatId, session] of sessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      sessions.delete(chatId);
    }
  }
}, 10 * 60 * 1000);

// ─── DeepSeek "cerebro" del agente ─────────────────────────────────────

const SYSTEM_PROMPT = `Sos un asistente de LicitaVerify, un sistema de transparencia de licitaciones públicas registradas en Arkiv blockchain.

Tu función es ayudar a los usuarios a consultar licitaciones públicas. Tenés estas capacidades:

1. SALUDAR: Si el usuario saluda (hola, buenos días, etc.), responded con un saludo amable y ofrecé ayuda.
2. CHIT_CHAT: Si es charla informal, responded de forma amable pero orientá a tu función de búsqueda.
3. BUSCAR: Si el usuario pregunta por licitaciones, contrataciones, obras, expedientes o similares, responded con "BUSCAR: <consulta>" y yo ejecutaré la búsqueda.
4. AYUDAR: Si el usuario pide ayuda o no sabés qué hacer, responded con "AYUDA".

IMPORTANTE: 
- No inventes resultados de búsqueda. Si no estás seguro de qué buscar, pedí aclaración.
- Respondé SIEMPRE en español argentino, amable y directo.
- Si el mensaje es una consulta de búsqueda, responded ÚNICAMENTE con "BUSCAR: " seguido de la consulta reformulada para búsqueda.
- Para cualquier otra cosa, responded naturalmente sin prefijo.`;

interface AgentDecision {
  action: "search" | "chat" | "help";
  searchQuery?: string;
  response?: string;
}

async function agentThink(chatId: number, userMessage: string): Promise<AgentDecision> {
  const session = getSession(chatId);
  const recentHistory = session.history.slice(-6);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...recentHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: userMessage },
  ];

  const res = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages,
    temperature: 0.3,
    max_tokens: 500,
  });

  const reply = res.choices[0]?.message?.content?.trim() || "";

  // Guardar en historial
  addToHistory(chatId, "user", userMessage);

  if (reply.startsWith("BUSCAR:")) {
    const query = reply.replace("BUSCAR:", "").trim();
    addToHistory(chatId, "assistant", `Buscando: ${query}`);
    return { action: "search", searchQuery: query || userMessage };
  }

  addToHistory(chatId, "assistant", reply);
  return { action: "chat", response: reply };
}

// ─── Arkiv Client ──────────────────────────────────────────────────────

function getPublicClient() {
  return createPublicClient({ chain: braga, transport: http() });
}

// ─── Helpers ───────────────────────────────────────────────────────────

const ESTADO_EMOJI: Record<string, string> = {
  convocada: "🔵", evaluacion: "🟡", adjudicada: "🟢",
  desierta: "🔴", cancelada: "⚫", ejecucion: "🟡", finalizada: "✅",
};

function formatARS(amount: unknown): string {
  if (amount == null) return "-";
  const num = Number(amount);
  if (Number.isNaN(num)) return String(amount);
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(num);
}

function formatDate(value: string | number | undefined | null): string {
  if (!value) return "";
  try { return new Date(value).toLocaleDateString("es-AR", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return String(value); }
}

// ─── Arkiv Search ──────────────────────────────────────────────────────

async function searchArkiv(filters: ArkivFilters) {
  const client = getPublicClient();
  const query = client
    .buildQuery()
    .where(eq("project", "licita-verify-v1"))
    .where(eq("entityType", "pliego"))
    .withPayload(true)
    .withAttributes(true)
    .limit(20);

  if (filters.rubro?.[0]) query.where(eq("rubro", filters.rubro[0]));
  if (filters.estado?.[0]) query.where(eq("estado", filters.estado[0]));
  if (filters.organismo?.[0]) query.where(eq("organismo", filters.organismo[0]));
  if (filters.jurisdiccion?.[0]) query.where(eq("jurisdiccion", filters.jurisdiccion[0]));
  if (filters.tipoProcedimiento?.[0]) query.where(eq("tipoProcedimiento", filters.tipoProcedimiento[0]));
  if (filters.montoMin != null) query.where(gte("presupuestoOficial", filters.montoMin));
  if (filters.montoMax != null) query.where(lte("presupuestoOficial", filters.montoMax));

  const result = await query.fetch();
  return result.entities.map((entity) => {
    let payload: Record<string, unknown> | null = null;
    try { payload = entity.toJson() as Record<string, unknown>; } catch { /* ignore */ }
    const attrs: Record<string, string | number> = {};
    for (const attr of entity.attributes) attrs[attr.key] = attr.value;
    return { entityKey: entity.key, attributes: attrs, payload };
  });
}

// ─── Formatters ────────────────────────────────────────────────────────

function buildResultsMessage(results: any[], filters: ArkivFilters): { text: string; keyboard: InlineKeyboard } {
  const MAX_SHOWN = 5;
  const showCount = Math.min(results.length, MAX_SHOWN);
  let text = `🔍 *Encontré ${results.length} resultado${results.length !== 1 ? "s" : ""}*\n\n`;

  for (let i = 0; i < showCount; i++) {
    const merged = { ...(results[i].attributes || {}), ...(results[i].payload || {}) };
    const emoji = ESTADO_EMOJI[String(merged.estado || "").toLowerCase()] || "❓";
    text += `${i + 1}. ${emoji} *${String(merged.objeto || "-").slice(0, 80)}*\n`;
    text += `   🏛 ${merged.organismo || "-"}`;
    if (merged.expediente) text += ` · \`${merged.expediente}\``;
    text += `\n   📊 ${merged.estado || "-"}`;
    const monto = formatARS(merged.presupuestoOficial);
    if (monto !== "-") text += ` · $${monto}`;
    const fecha = formatDate(merged.fechaConvocatoria);
    if (fecha) text += ` · ${fecha}`;
    text += "\n\n";
  }
  if (results.length > MAX_SHOWN) text += `*... y ${results.length - MAX_SHOWN} más*\n\n`;
  text += "Seleccioná un resultado para ver el detalle 👇";

  const keyboard = new InlineKeyboard();
  for (let i = 0; i < showCount; i++) {
    keyboard.text(`${i + 1}`, `detail:${results[i].entityKey}`).row();
  }
  return { text, keyboard };
}

function buildDetailMessage(entity: any, entityKey: string): string {
  const merged = { ...(entity.attributes || {}), ...(entity.payload || {}) };
  const lines: string[] = [];
  if (merged.objeto) lines.push(`📄 *${merged.objeto}*`);
  lines.push("");
  if (merged.organismo) lines.push(`🏛 *Organismo:* ${merged.organismo}`);
  if (merged.expediente) lines.push(`📋 *Expediente:* \`${merged.expediente}\``);
  if (merged.tipoProcedimiento) lines.push(`📌 *Tipo:* ${merged.tipoProcedimiento}`);
  if (merged.rubro) lines.push(`🏷 *Rubro:* ${merged.rubro}`);
  if (merged.estado) {
    const emoji = ESTADO_EMOJI[String(merged.estado).toLowerCase()] || "❓";
    lines.push(`📊 *Estado:* ${emoji} ${merged.estado}`);
  }
  const monto = formatARS(merged.presupuestoOficial);
  if (monto !== "-") lines.push(`💰 *Presupuesto:* $${monto}`);
  const fechaC = formatDate(merged.fechaConvocatoria);
  if (fechaC) lines.push(`📅 *Convocatoria:* ${fechaC}`);
  const fechaA = formatDate(merged.fechaApertura);
  if (fechaA) lines.push(`📅 *Apertura:* ${fechaA}`);
  if (merged.documentHash) lines.push(`🔒 *Hash:* \`${String(merged.documentHash).slice(0, 16)}...\``);
  lines.push("");
  lines.push(`🔗 [Ver en Arkiv](${EXPLORER_URL}/${entityKey})`);
  return lines.join("\n");
}

// ─── Handlers ──────────────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  const chatId = ctx.chat.id;
  sessions.delete(chatId); // reset session

  const msg =
    "🤖 *Hola! Soy el agente de LicitaVerify*\n\n"
    + "Preguntame sobre licitaciones públicas registradas en Arkiv blockchain.\n\n"
    + "*Ejemplos:*\n"
    + "• \"Mostrame obras públicas en Salta\"\n"
    + "• \"Licitaciones mayores a 100 millones\"\n"
    + "• \"Qué contrataciones hay adjudicadas?\"\n\n"
    + "O simplemente decime \"hola\" y vamos conversando 😊";

  addToHistory(chatId, "assistant", msg);
  await ctx.reply(msg, { parse_mode: "Markdown" });
});

bot.command("reiniciar", async (ctx) => {
  sessions.delete(ctx.chat.id);
  await ctx.reply("✅ Conversación reiniciada. Decime cómo querés buscar.");
});

// Mensajes de texto
bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text.trim();

  if (text.startsWith("/")) return; // comandos ya manejados

  try {
    await ctx.api.sendChatAction(chatId, "typing");

    // DeepSeek decide qué hacer
    const decision = await agentThink(chatId, text);

    if (decision.action === "chat" && decision.response) {
      await ctx.reply(decision.response, { parse_mode: "Markdown" });
      return;
    }

    if (decision.action === "search") {
      const query = decision.searchQuery || text;
      await ctx.api.sendChatAction(chatId, "typing");

      const parsed = await parseSearchQuery(query);

      if (parsed.ambiguous) {
        await ctx.reply(
          `🤔 *No entendí bien*\n\n${parsed.clarification}\n\nSugerencias:\n${parsed.suggestions.map((s: string) => `• "${s}"`).join("\n")}`,
          { parse_mode: "Markdown" },
        );
        return;
      }

      const results = await searchArkiv(parsed.filters);

      if (results.length === 0) {
        await ctx.reply("No encontré resultados. Probá con otros filtros o decime más detalles.");
        return;
      }

      const { text: resultText, keyboard } = buildResultsMessage(results, parsed.filters);
      await ctx.reply(resultText, { parse_mode: "Markdown", reply_markup: keyboard });
      return;
    }

    await ctx.reply("No entendí. Decime qué licitaciones querés buscar o usá /start.");
  } catch (err) {
    console.error("[bot] error:", err);
    await ctx.reply("Ups, ocurrió un error. Decime de nuevo o usá /reiniciar.");
  }
});

// ─── Callback queries (inline buttons) ────────────────────────────────

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const chatId = ctx.callbackQuery.message?.chat.id;
  const msgId = ctx.callbackQuery.message?.message_id;

  if (data.startsWith("detail:") && chatId && msgId) {
    const entityKey = data.slice(7);
    try {
      const client = getPublicClient();
      const entity = await client.getEntity(entityKey as `0x${string}`);
      let payload: Record<string, unknown> | null = null;
      try { payload = entity.toJson() as Record<string, unknown>; } catch { /* ignore */ }
      const attrs: Record<string, string | number> = {};
      for (const attr of entity.attributes) attrs[attr.key] = attr.value;

      const detail = buildDetailMessage({ attributes: attrs, payload }, entityKey);
      const keyboard = new InlineKeyboard().text("← Volver", "back");

      await ctx.api.editMessageText(chatId, msgId, detail, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
      await ctx.answerCallbackQuery();
    } catch {
      await ctx.answerCallbackQuery({ text: "Error al obtener detalle" });
    }
  } else if (data === "back" && chatId && msgId) {
    await ctx.api.editMessageText(chatId, msgId, "Usá /reiniciar para empezar de nuevo.");
    await ctx.answerCallbackQuery();
  } else {
    await ctx.answerCallbackQuery();
  }
});

// ─── Error handling ────────────────────────────────────────────────────

bot.catch((err) => {
  console.error("[bot] unhandled error:", err);
});

// ─── Start ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🤖 LicitaVerify Autonomous Agent");
  console.log("   Cerebro: DeepSeek (deepseek-chat)");
  console.log("   Datos:   Arkiv (Braga testnet)");
  console.log("   Sesiones: efímeras (30min timeout)");
  console.log("   Comandos: /start, /reiniciar");
  console.log("   Presioná Ctrl+C para detener");
  await bot.start();
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
