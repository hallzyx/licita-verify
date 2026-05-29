/**
 * LicitaVerify Agent — Autonomous Telegram Bot con ai-sdk v6.
 *
 * Proceso standalone con long polling.
 * Usa ai-sdk generateText + tools para decidir autónomamente
 * si saludar, buscar en Arkiv, o pedir aclaración.
 *
 * Corre: npm run agent
 */
import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";
import { runAgent } from "./agent";
import { searchLicitaciones, getDetalle } from "./arkiv-tools";
import { buildResultsMessage, buildDetailMessage } from "./formatters";

// ─── Config ────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// ─── Handlers ──────────────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  const msg =
    "🤖 *Hola! Soy el agente de LicitaVerify*\n\n"
    + "Preguntame sobre licitaciones públicas registradas en Arkiv blockchain.\n\n"
    + "*Ejemplos:*\n"
    + "• \"Mostrame obras públicas en Salta\"\n"
    + "• \"Licitaciones mayores a 100 millones\"\n"
    + "• \"Qué contrataciones hay adjudicadas?\"\n\n"
    + "O simplemente decime hola y vamos conversando.";

  await ctx.reply(msg, { parse_mode: "Markdown" });
});

bot.command("reiniciar", async (ctx) => {
  await ctx.reply("✅ Conversación reiniciada.");
});

bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text.trim();
  if (text.startsWith("/")) return;

  try {
    await ctx.api.sendChatAction(chatId, "typing");
    console.log(`[user] "${text}"`);

    // ── ai-sdk agente autónomo ─────────────────────────────
    const result = await runAgent(text, {
      searchLicitaciones,
      getDetalle,
    });

    console.log(`[agent] response="${result.text.slice(0, 120)}..."`);

    // Si no hay tool calls, es respuesta conversacional directa
    if (!result.toolCalled) {
      await ctx.reply(result.text, { parse_mode: "Markdown" });
      return;
    }

    // Si llamó a searchLicitaciones y encontró resultados
    if (result.searchResults) {
      const { text: msgText, keyboard } = buildResultsMessage(
        result.searchResults,
        result.text,
      );
      await ctx.reply(msgText, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
      return;
    }

    // Otro caso (sin resultados, error, etc.)
    await ctx.reply(result.text, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("[bot] error:", err);
    await ctx.reply("Ups, ocurrió un error. Usá /reiniciar o intentá de nuevo.");
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
      const entity = await getDetalle.execute({ entityKey });
      const detail = buildDetailMessage(entity as any, entityKey);
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
    await ctx.api.editMessageText(chatId, msgId, "Usá /start para empezar de nuevo.");
    await ctx.answerCallbackQuery();
  } else {
    await ctx.answerCallbackQuery();
  }
});

bot.catch((err) => console.error("[bot] unhandled:", err));

// ─── Start ─────────────────────────────────────────────────────────────

console.log("🤖 LicitaVerify Agent (ai-sdk v6)");
console.log("   Cerebro: DeepSeek via @ai-sdk/openai");
console.log("   Datos:   Arkiv Braga testnet");
console.log("   Tools:   searchLicitaciones, getDetalle");
console.log("   Presioná Ctrl+C para detener");

bot.start().catch((err) => { console.error("Fatal:", err); process.exit(1); });
