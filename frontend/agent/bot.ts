/**
 * LicitaVerify Telegram Bot — Autonomous NLQ Search Agent.
 *
 * Proceso standalone con long polling (sin webhook, sin ngrok).
 * Corre con: npm run agent
 *
 * Usa grammy para el bot y el mismo stack que la web app:
 * - DeepSeek (parseSearchQuery) para interpretar lenguaje natural
 * - Arkiv PublicClient para consultar datos on-chain
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Bot, InlineKeyboard } from "grammy";
import { createPublicClient, http } from "@arkiv-network/sdk";
import { braga } from "@arkiv-network/sdk/chains";
import { eq, gte, lte } from "@arkiv-network/sdk/query";
import { parseSearchQuery } from "../lib/ai-search";
import type { ArkivFilters } from "../lib/ai-search";

// ─── Config ────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

const EXPLORER_URL = process.env.ARKIV_EXPLORER_URL
  ? process.env.ARKIV_EXPLORER_URL + "/entity"
  : "https://explorer.braga.arkiv.network/entity";

const bot = new Bot(BOT_TOKEN);

// ─── Arkiv Client (directo, sin HTTP) ─────────────────────────────────

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
    for (const attr of entity.attributes) {
      attrs[attr.key] = attr.value;
    }

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

  if (results.length > MAX_SHOWN) {
    text += `*... y ${results.length - MAX_SHOWN} más*\n\n`;
  }

  text += "Seleccioná un resultado para ver el detalle 👇";

  const keyboard = new InlineKeyboard();
  // Mostrar hasta 5 botones
  for (let i = 0; i < showCount; i++) {
    const label = String(results[i].payload?.objeto || results[i].attributes?.objeto || "-").slice(0, 35);
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
  await ctx.reply(
    "🤖 *Hola! Soy el bot de LicitaVerify*\n\n"
    + "Preguntame sobre licitaciones públicas registradas en Arkiv.\n\n"
    + "*Ejemplos:*\n"
    + "• \"Mostrame obras públicas en Salta\"\n"
    + "• \"Licitaciones mayores a 100 millones\"\n"
    + "• \"Contrataciones adjudicadas\"\n\n"
    + "O usá `/buscar <consulta>` para buscar directamente.",
    { parse_mode: "Markdown" },
  );
});

bot.command("buscar", async (ctx) => {
  const query = ctx.match?.trim();
  if (!query) {
    await ctx.reply("Escribí tu consulta después de /buscar. Ej: `/buscar obras públicas en Salta`", {
      parse_mode: "Markdown",
    });
    return;
  }
  await handleQuery(ctx, query);
});

// Mensajes de texto sin comando
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();
  if (text.startsWith("/")) return; // comandos ya manejados arriba
  await handleQuery(ctx, text);
});

// Callback queries (inline buttons)
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
      for (const attr of entity.attributes) {
        attrs[attr.key] = attr.value;
      }

      const detail = buildDetailMessage(
        { attributes: attrs, payload },
        entityKey,
      );

      const keyboard = new InlineKeyboard().text("← Volver", "back");

      await ctx.api.editMessageText(chatId, msgId, detail, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
      await ctx.answerCallbackQuery();
    } catch {
      await ctx.answerCallbackQuery({ text: "Error al obtener detalle" });
    }
  } else if (data === "back") {
    await ctx.api.editMessageText(chatId!, msgId!, "Usá /buscar para hacer una nueva consulta.");
    await ctx.answerCallbackQuery();
  } else {
    await ctx.answerCallbackQuery();
  }
});

// ─── Query handler ─────────────────────────────────────────────────────

async function handleQuery(ctx: any, query: string) {
  const statusMsg = await ctx.reply("🔍 Buscando...");

  try {
    // DeepSeek interpreta la consulta
    const parsed = await parseSearchQuery(query);

    if (parsed.ambiguous) {
      const suggestions = parsed.suggestions.map((s: string) => `• "${s}"`).join("\n");
      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id,
        `🤔 *No entendí bien*\n\n${parsed.clarification}\n\nSugerencias:\n${suggestions}`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    // Buscar en Arkiv directo (sin HTTP)
    const results = await searchArkiv(parsed.filters);

    if (results.length === 0) {
      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id,
        "No encontré resultados. Probá ampliar la búsqueda.",
      );
      return;
    }

    const { text, keyboard } = buildResultsMessage(results, parsed.filters);

    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, text, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error("[bot] search error:", err);
    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id,
      "Ocurrió un error al buscar. Intentalo de nuevo.",
    );
  }
}

// ─── Start ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🤖 LicitaVerify Telegram Agent starting...");
  console.log("   NLP: DeepSeek (via parseSearchQuery)");
  console.log("   Arkiv: Braga testnet");
  console.log("   Press Ctrl+C to stop");
  await bot.start();
}

main().catch((err) => { console.error("Failed:", err); process.exit(1); });
