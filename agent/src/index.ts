/**
 * LicitaVerify Agent — Autonomous Telegram Bot con ai-sdk v6.
 * Tools via @ai-sdk/mcp conectado al Arkiv MCP Server (Python).
 *
 * Corre: npm run agent
 */
import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";
import { runAgent } from "./agent";
import { getArkivTools as getTools, initMcp, closeMcp } from "./mcp-client";
import { buildDetailMessage } from "./formatters";

// ─── Config ────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// ─── Conversation memory ───────────────────────────────────────────────
// Store message history per chat so the agent remembers context.
const chatHistory = new Map<number, Array<{ role: "user" | "assistant"; content: string }>>();

// ─── Handlers ──────────────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  chatHistory.delete(ctx.chat.id);
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
  chatHistory.delete(ctx.chat.id);
  await ctx.reply("✅ Conversación reiniciada.");
});

bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text.trim();
  if (text.startsWith("/")) return;

  try {
    await ctx.api.sendChatAction(chatId, "typing");
    console.log(`[user] "${text}"`);

    // Build conversation history for context (last 3 exchanges = 6 messages)
    const history = chatHistory.get(chatId) || [];
    const contextMessages = history.slice(-6);

    // Obtener tools del MCP server (se cachean tras primera llamada)
    const tools = await getTools();

    // ── ai-sdk agente autónomo ─────────────────────────────
    const result = await runAgent(text, tools, contextMessages);

    // Store this exchange in memory
    history.push({ role: "user", content: text });
    history.push({ role: "assistant", content: result.text });
    chatHistory.set(chatId, history);

    // Extract entityKeys from the agent's response (Entity Key: 0x...)
    const entityKeys: string[] = [];
    const keyRegex = /Entity Key:\s*(0x[a-fA-F0-9]+)/g;
    let match;
    while ((match = keyRegex.exec(result.text)) !== null) {
      entityKeys.push(match[1]);
    }

    // If we found entity keys, add inline detail buttons
    if (entityKeys.length > 0) {
      const keyboard = new InlineKeyboard();
      if (entityKeys.length === 1) {
        keyboard.text("🔍 Ver detalle", `detail:${entityKeys[0]}`);
      } else {
        entityKeys.forEach((key, i) => {
          keyboard.text(`🔍 Ver #${i + 1}`, `detail:${key}`);
        });
      }
      keyboard.text("🔄 Nueva búsqueda", "back");

      await ctx.reply(result.text, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
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

// Init MCP eagerly before starting to listen
initMcp()
  .then(() => bot.start())
  .catch((err) => {
    console.error("❌ Error al iniciar MCP:", err.message);
    process.exit(1);
  });
