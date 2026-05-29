import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN no configurado" }, { status: 500 });
    }

    const update = await request.json();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const explorerUrl = process.env.ARKIV_EXPLORER_URL || "https://explorer.braga.arkiv.network/entity";

    // ── Handle callback_query (inline button click) ──────────
    if (update.callback_query) {
      const cb = update.callback_query;
      const data: string = cb.data || "";
      const chatId = cb.message?.chat?.id;
      const msgId = cb.message?.message_id;

      if (data.startsWith("detail:") && chatId && msgId) {
        const entityKey = data.slice(7);
        try {
          const res = await fetch(`${baseUrl}/api/public/licitacion/${entityKey}`);
          if (!res.ok) throw new Error("Not found");
          const entity = await res.json();

          const merged = {
            ...(entity.attributes || {}),
            ...(entity.payload || {}),
          };

          const detail = buildDetailMessage(merged, entityKey, explorerUrl);
          await editMessageText(token, chatId, msgId, detail, [
            [{ text: "← Volver al listado", callback_data: "back" }],
          ]);
          await answerCallbackQuery(token, cb.id);
        } catch {
          await answerCallbackQuery(token, cb.id, "Error al obtener detalle");
        }
      } else if (data === "back" && chatId && msgId) {
        await editMessageText(token, chatId, msgId,
          "Usá /buscar seguido de tu consulta.\nEj: /buscar obras públicas en Salta",
        );
        await answerCallbackQuery(token, cb.id);
      } else {
        await answerCallbackQuery(token, cb.id);
      }

      return NextResponse.json({ ok: true });
    }

    // ── Handle messages ──────────────────────────────────────
    const msg = update.message;
    if (!msg?.text) return NextResponse.json({ ok: true });

    const text = msg.text.trim();
    const chatId = msg.chat.id;

    if (text === "/start") {
      await sendMessage(token, chatId,
        "🤖 *Hola! Soy el bot de LicitaVerify*\n\n"
        + "Preguntame sobre licitaciones públicas registradas en Arkiv.\n\n"
        + "*Ejemplos:*\n"
        + "• \"Mostrame obras públicas en Salta\"\n"
        + "• \"Licitaciones mayores a 100 millones\"\n"
        + "• \"Contrataciones adjudicadas\"\n\n"
        + "O usá `/buscar <consulta>` para buscar.",
      );
      return NextResponse.json({ ok: true });
    }

    const query = text.startsWith("/buscar ") ? text.slice(8).trim() : null;

    if (text.startsWith("/")) {
      if (!query) {
        await sendMessage(token, chatId, "Escribí tu consulta después de /buscar. Ej: `/buscar obras públicas en Salta`");
        return NextResponse.json({ ok: true });
      }
    }

    const searchQuery = query || text;

    // Show typing indicator
    await fetch(`${TG_API}${token}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    });

    // Call AI search
    const searchRes = await fetch(`${baseUrl}/api/ai/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: searchQuery }),
    });

    if (!searchRes.ok) {
      await sendMessage(token, chatId, "No pude interpretar tu consulta. Probá reformularla.");
      return NextResponse.json({ ok: true });
    }

    const data = await searchRes.json();

    if (data.interpretation?.ambiguous) {
      const suggestions = data.interpretation.suggestions.map((s: string) => `• "${s}"`).join("\n");
      await sendMessage(token, chatId,
        `🤔 *No entendí bien*\n\n${data.interpretation.clarification}\n\nSugerencias:\n${suggestions}`,
      );
      return NextResponse.json({ ok: true });
    }

    const results: any[] = data.results || [];
    if (results.length === 0) {
      await sendMessage(token, chatId, "No encontré resultados. Probá ampliar la búsqueda.");
      return NextResponse.json({ ok: true });
    }

    const message = buildResultsMessage(results);
    const keyboard = results.slice(0, 5).map((r: any) => [
      { text: `🔍 ${String(r.payload?.objeto || r.attributes?.objeto || "-").slice(0, 40)}`, callback_data: `detail:${r.entityKey}` },
    ]);
    keyboard.push([{ text: "❌ Cerrar", callback_data: "close" }]);

    await sendMessageWithKeyboard(token, chatId, message, keyboard);
    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("[telegram-webhook]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─── Telegram API helpers ─────────────────────────────────────────────

const TG_API = "https://api.telegram.org/bot";

async function sendMessage(token: string, chatId: number, text: string) {
  await fetch(`${TG_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

async function sendMessageWithKeyboard(token: string, chatId: number, text: string, keyboard: any[][]) {
  await fetch(`${TG_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId, text, parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    }),
  });
}

async function editMessageText(token: string, chatId: number, msgId: number, text: string, keyboard?: any[][]) {
  const body: Record<string, any> = {
    chat_id: chatId, message_id: msgId, text, parse_mode: "Markdown",
  };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  await fetch(`${TG_API}${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function answerCallbackQuery(token: string, callbackQueryId: string, text?: string) {
  await fetch(`${TG_API}${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: text || "✓" }),
  });
}

// ─── Formatters ───────────────────────────────────────────────────────

const ESTADO_EMOJI: Record<string, string> = {
  convocada: "🔵", evaluacion: "🟡", adjudicada: "🟢",
  desierta: "🔴", cancelada: "⚫", ejecucion: "🟡", finalizada: "✅",
};

function formatARS(amount: unknown): string {
  if (amount == null) return "-";
  const num = typeof amount === "string" ? Number(amount) : Number(amount);
  if (Number.isNaN(num)) return String(amount);
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(num);
}

function formatDate(value: string | number | undefined | null): string {
  if (!value) return "";
  try { return new Date(value).toLocaleDateString("es-AR", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return String(value); }
}

function buildResultsMessage(results: any[]): string {
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

  text += "Seleccioná un resultado abajo para ver el detalle 👇";
  return text;
}

function buildDetailMessage(merged: Record<string, any>, entityKey: string, explorerUrl: string): string {
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
  const fecha = formatDate(merged.fechaConvocatoria);
  if (fecha) lines.push(`📅 *Convocatoria:* ${fecha}`);
  if (merged.documentHash) lines.push(`🔒 *Hash:* \`${String(merged.documentHash).slice(0, 16)}...\``);
  lines.push("");
  lines.push(`🔗 [Ver en Arkiv](${explorerUrl}/${entityKey})`);

  return lines.join("\n");
}
