/**
 * LicitaVerify Agent — Autonomous Telegram Bot con ai-sdk v6.
 * Tools via @ai-sdk/mcp conectado al Arkiv MCP Server (Python).
 *
 * Corre: npm run agent
 */
import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";
import { runAgent } from "./agent";
import { getArkivTools as getTools, closeMcp } from "./mcp-client";
import { buildDetailMessage } from "./formatters";

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

    // Obtener tools del MCP server (se cachean tras primera llamada)
    const tools = await getTools();

    // ── ai-sdk agente autónomo ─────────────────────────────
    const result = await runAgent(text, tools);

    console.log(`[agent] response="${result.text.slice(0, 120)}..."`);

    // Si no hay tool calls, es respuesta conversacional directa
    if (!result.toolCalled) {
      await ctx.reply(result.text, { parse_mode: "Markdown" });
      return;
    }

    // Si llamó a arkiv_search — el agente ya formateó los resultados
    if (result.searchResults) {
      await ctx.reply(result.text, { parse_mode: "Markdown" });
      return;
    }

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
      const tools = await getTools();
      const detailTool = tools["arkiv_get_entity"] as { execute: (args: Record<string, unknown>) => Promise<unknown> };
      const result = await detailTool.execute({ entity_key: entityKey });
      const detail = typeof result === "string" ? result : JSON.stringify(result, null, 2);
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

// ─── Start / Cleanup ───────────────────────────────────────────────────

process.on("SIGINT", async () => {
  console.log("\n🔌 Cerrando conexiones...");
  await closeMcp().catch(() => {});
  process.exit(0);
});

console.log("🤖 LicitaVerify Agent (ai-sdk v6 + @ai-sdk/mcp)");
console.log("   Cerebro: DeepSeek via @ai-sdk/openai");
console.log("   Datos:   Arkiv vía MCP (Python FastMCP)");
console.log(   "   Tools:   arkiv_search, arkiv_get_entity");
console.log("   Presioná Ctrl+C para detener");

bot.start().catch((err) => { console.error("Fatal:", err); process.exit(1); });
