/**
 * Formateo de resultados para Telegram.
 */
import { InlineKeyboard } from "grammy";

// ─── Estados → emoji ───────────────────────────────────────────────────

const ESTADO_EMOJI: Record<string, string> = {
  convocada: "🔵", evaluacion: "🟡", adjudicada: "🟢",
  desierta: "🔴", cancelada: "⚫", ejecucion: "🟡", finalizada: "✅",
};

function getEmoji(estado: string | undefined): string {
  return ESTADO_EMOJI[estado?.toLowerCase() || ""] || "❓";
}

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

// ─── Results message ───────────────────────────────────────────────────

export function buildResultsMessage(
  results: any[],
  agentIntro: string,
): { text: string; keyboard: InlineKeyboard } {
  const MAX_SHOWN = 5;
  const showCount = Math.min(results.length, MAX_SHOWN);

  let text = `${agentIntro}\n\n`;
  text += `📋 *${results.length} resultado${results.length !== 1 ? "s" : ""}*:\n\n`;

  for (let i = 0; i < showCount; i++) {
    const merged = { ...(results[i].attributes || {}), ...(results[i].payload || {}) };
    const emoji = getEmoji(String(merged.estado));
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
  for (let i = 0; i < showCount; i++) {
    keyboard.text(`${i + 1}`, `detail:${results[i].entityKey}`).row();
  }

  return { text, keyboard };
}

// ─── Detail message ────────────────────────────────────────────────────

export function buildDetailMessage(entity: any, entityKey: string): string {
  const merged = { ...(entity.attributes || {}), ...(entity.payload || {}) };
  const explorerUrl = (process.env.ARKIV_EXPLORER_URL || "https://explorer.braga.arkiv.network") + "/entity";

  const lines: string[] = [];
  if (merged.objeto) lines.push(`📄 *${merged.objeto}*`);
  lines.push("");
  if (merged.organismo) lines.push(`🏛 *Organismo:* ${merged.organismo}`);
  if (merged.expediente) lines.push(`📋 *Expediente:* \`${merged.expediente}\``);
  if (merged.tipoProcedimiento) lines.push(`📌 *Tipo:* ${merged.tipoProcedimiento}`);
  if (merged.rubro) lines.push(`🏷 *Rubro:* ${merged.rubro}`);
  if (merged.estado) {
    lines.push(`📊 *Estado:* ${getEmoji(String(merged.estado))} ${merged.estado}`);
  }
  const monto = formatARS(merged.presupuestoOficial);
  if (monto !== "-") lines.push(`💰 *Presupuesto:* $${monto}`);
  const fechaC = formatDate(merged.fechaConvocatoria);
  if (fechaC) lines.push(`📅 *Convocatoria:* ${fechaC}`);
  const fechaA = formatDate(merged.fechaApertura);
  if (fechaA) lines.push(`📅 *Apertura:* ${fechaA}`);
  if (merged.documentHash) lines.push(`🔒 *Hash:* \`${String(merged.documentHash).slice(0, 16)}...\``);
  lines.push("");
  lines.push(`🔗 [Ver en Arkiv](${explorerUrl}/${entityKey})`);

  return lines.join("\n");
}
