import OpenAI from "openai";
import {
  RUBROS_MACHINE,
  ESTADOS_MACHINE,
  TIPOS_PROCEDIMIENTO_MACHINE,
} from "@/lib/validacion";

// ─── Types ─────────────────────────────────────────────────────────────

export type ArkivFilters = {
  organismo?: string[];
  rubro?: string[];
  jurisdiccion?: string[];
  tipoProcedimiento?: string[];
  estado?: string[];
  keyword?: string;
  montoMin?: number;
  montoMax?: number;
};

export type AmbiguousQuery = {
  ambiguous: true;
  clarification: string;
  suggestions: string[];
};

export type SearchQuery = {
  ambiguous: false;
  filters: ArkivFilters;
};

export type ParseResult = SearchQuery | AmbiguousQuery;

// ─── parseSearchQuery ──────────────────────────────────────────────────

/**
 * Calls DeepSeek to translate a natural language query about public
 * procurement into structured Arkiv filters using machine values from
 * validacion.ts.
 */
export async function parseSearchQuery(nlQuery: string): Promise<ParseResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY_LLM;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY_LLM no configurada");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
    timeout: 15_000,
    maxRetries: 0,
  });

  const systemPrompt = [
    "Sos un asistente que traduce consultas en lenguaje natural sobre licitaciones públicas a filtros estructurados para Arkiv blockchain. Devolvé SOLO JSON sin markdown.",
    "",
    "Los valores de ENUM deben usar estos valores MACHINE exactos:",
    `- rubro: ${JSON.stringify(RUBROS_MACHINE)}`,
    `- estado: ${JSON.stringify(ESTADOS_MACHINE)}`,
    `- tipoProcedimiento: ${JSON.stringify(TIPOS_PROCEDIMIENTO_MACHINE)}`,
    "",
    "Campos posibles en la respuesta:",
    "- rubro: string (uno de los valores machine de rubro)",
    "- organismo: string (nombre del organismo, ej: 'Municipalidad de Salta')",
    "- jurisdiccion: string (provincia o jurisdicción)",
    "- tipoProcedimiento: string (uno de los valores machine de tipoProcedimiento)",
    "- estado: string (uno de los valores machine de estado)",
    "- keyword: string (palabra clave de búsqueda textual)",
    "- montoMin: number (monto mínimo en ARS, ej: 100000000 para 100 millones)",
    "- montoMax: number (monto máximo en ARS)",
    "",
    "Si la consulta es ambigua o no se puede interpretar, devolvé:",
    '{ "ambiguous": true, "clarification": "mensaje", "suggestions": ["opción 1", "opción 2"] }',
    "",
    "Ejemplos de mapeo:",
    '- "obras públicas" → rubro: "obra"',
    '- "adjudicada" → estado: "adjudicada"',
    '- "licitación pública" → tipoProcedimiento: "licitacion_publica"',
    '- "contratación directa" → tipoProcedimiento: "contratacion_directa"',
    '- "mayor a 100 millones" → montoMin: 100000000',
    '- "menor a 50000" → montoMax: 50000',
  ].join("\n");

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: nlQuery },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek no devolvió contenido");
  }

  try {
    const parsed = JSON.parse(content);

    if (parsed.ambiguous === true) {
      return {
        ambiguous: true,
        clarification:
          parsed.clarification ||
          "No pudimos interpretar tu consulta. Probá reformularla.",
        suggestions: parsed.suggestions || [],
      };
    }

    const filters: ArkivFilters = {};
    if (parsed.rubro) filters.rubro = [String(parsed.rubro)];
    if (parsed.organismo) filters.organismo = [String(parsed.organismo)];
    if (parsed.jurisdiccion)
      filters.jurisdiccion = [String(parsed.jurisdiccion)];
    if (parsed.tipoProcedimiento)
      filters.tipoProcedimiento = [String(parsed.tipoProcedimiento)];
    if (parsed.estado) filters.estado = [String(parsed.estado)];
    if (parsed.keyword) filters.keyword = String(parsed.keyword);
    if (parsed.montoMin != null) filters.montoMin = Number(parsed.montoMin);
    if (parsed.montoMax != null) filters.montoMax = Number(parsed.montoMax);

    return { ambiguous: false, filters };
  } catch {
    throw new Error("Error al parsear la respuesta de DeepSeek");
  }
}
