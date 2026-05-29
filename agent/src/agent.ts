/**
 * Agent core — ai-sdk generateText con tool calling.
 *
 * El agente recibe un mensaje del usuario, decide autónomamente
 * si llamar a herramientas (buscar en Arkiv) o responder como charla.
 *
 * ai-sdk con maxSteps > 1 permite el loop: pensar → actuar → observar → responder.
 */
import { generateText, stepCountIs } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";

// ─── LLM config ───────────────────────────────────────────────────────

const deepseekApiKey = process.env.DEEPSEEK_API_KEY_LLM;
if (!deepseekApiKey) {
  console.error("❌ DEEPSEEK_API_KEY_LLM not set");
  process.exit(1);
}

const deepseek = createDeepSeek({
  apiKey: deepseekApiKey,
});

// ─── System prompt ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un asistente amable de LicitaVerify para consultar licitaciones públicas en Arkiv blockchain.

CAPACIDADES:
- Saludar y conversar naturalmente cuando el usuario saluda o charla.
- Buscar licitaciones con searchLicitaciones cuando el usuario pregunta por datos.
- Responder sin herramientas si es charla o saludo.

REGLAS:
- En español argentino, directo y sin florituras.
- Si el usuario saluda, saludá amablemente y ofrecé ayuda.
- Si pregunta por licitaciones/obras/contrataciones, usá searchLicitaciones.
- Si no encontrás resultados, decilo claramente y sugerí alternativas.
- Cuando llames a searchLicitaciones, devolvé los resultados formateados amigablemente.
- Si el usuario pregunta específicamente por el detalle de un resultado, usá getDetalle si tenés el entityKey.
- NO inventes datos. Si no hay resultados, decilo.`;

// ─── Run agent ─────────────────────────────────────────────────────────

export interface AgentResult {
  /** Texto de respuesta del modelo */
  text: string;
  /** Si llamó a alguna herramienta */
  toolCalled: boolean;
  /** Resultados de búsqueda si searchLicitaciones fue llamado */
  searchResults?: any[];
}

export async function runAgent(
  userMessage: string,
  tools: Record<string, ReturnType<typeof tool>>,
): Promise<AgentResult> {
  const result = await generateText({
    model: deepseek("deepseek-chat"),
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    tools,
    stopWhen: stepCountIs(5),
    temperature: 0.4,
  });

  const toolCalls = result.steps?.flatMap((s) => s.toolCalls) || [];
  const searchResults = extractToolResults(result.steps, "searchLicitaciones");

  return {
    text: result.text,
    toolCalled: toolCalls.length > 0,
    searchResults,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────

function extractToolResults(steps: any[], toolName: string): any[] | undefined {
  for (const step of steps || []) {
    // Check step.toolResults (ai-sdk v6 pattern)
    for (const r of step.toolResults || []) {
      if (r.toolName === toolName || r.toolCallId?.startsWith(toolName)) {
        const res = r.result;
        if (Array.isArray(res)) return res;
        if (res?.results) return res.results;
        if (res?.entities) return res.entities;
      }
    }
    // Fallback: check step.toolCalls (ai-sdk v4 pattern)
    for (const call of step.toolCalls || []) {
      if (call.toolName === toolName && call.result) {
        const res = call.result;
        if (Array.isArray(res)) return res;
        if (res?.results) return res.results;
        if (res?.entities) return res.entities;
      }
    }
  }
  return undefined;
}
