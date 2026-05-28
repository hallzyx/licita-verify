import OpenAI from "openai";

// ─── Types ─────────────────────────────────────────────────────────────

export interface AiFieldResult {
  value: string | number | null;
  confidence: "alta" | "media" | "baja";
}

export interface AiExtractResponse {
  fields: Record<string, AiFieldResult>;
  rawText: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ─── Step 1: OCR via GPT-4o Vision ─────────────────────────────────────

export async function extractTextWithOpenAI(
  fileBuffer: Uint8Array,
  mimeType: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY_OCR;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_OCR no configurada");
  }

  const client = new OpenAI({ apiKey, timeout: 25_000, maxRetries: 0 });
  const base64 = uint8ArrayToBase64(fileBuffer);
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extraé TODO el texto legible de este documento. Incluí números, fechas, montos, nombres de organismos y cualquier detalle administrativo. No interpretes, solo transcribí.",
          },
          {
            type: "image_url",
            image_url: { url: dataUrl, detail: "high" },
          },
        ],
      },
    ],
    max_tokens: 4096,
  });

  return response.choices[0]?.message?.content ?? "";
}

// ─── Step 2: Structure via DeepSeek Chat ───────────────────────────────

export async function structureFieldsWithDeepSeek(
  text: string,
): Promise<Record<string, AiFieldResult>> {
  const apiKey = process.env.DEEPSEEK_API_KEY_LLM;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY_LLM no configurada");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
    timeout: 25_000,
    maxRetries: 0,
  });

  const systemPrompt = [
    "Eres un asistente que extrae datos estructurados de licitaciones públicas argentinas.",
    "",
    "Devuelve un objeto JSON con estos campos exactos (todos opcionales, pueden ser null si no se encuentran):",
    "",
    "- expediente: string (ej: \"EX-2024-001\")",
    '- organismo: string (ej: "Ministerio de Obras Públicas")',
    '- jurisdiccion: string (ej: "Nacional")',
    '- tipoProcedimiento: string | null (uno de: "Licitación pública", "Licitación privada", "Contratación directa", "Concurso de precios", "Subasta")',
    '- rubro: string | null (uno de: "Obra pública", "Bienes", "Servicios", "Consultoría", "Salud", "Educación", "Tecnología")',
    "- objeto: string (descripción del objeto de contratación)",
    "- fechaConvocatoria: string (fecha en formato ISO: YYYY-MM-DD)",
    "- fechaApertura: string (fecha/hora en formato ISO)",
    "- presupuestoOficial: number | null (monto en números, sin formato)",
    "- criterioAdjudicacion: string | null",
    '- estado: string | null (uno de: "Convocada", "En evaluación", "Adjudicada", "Desierta", "Cancelada", "En ejecución", "Finalizada")',
    "- fuenteUrl: string | null",
    "",
    "Cada campo debe incluir:",
    '- "value": el valor extraído o null si no se encuentra',
    '- "confidence": "alta" si el valor está claramente presente, "media" si está inferido con ambigüedad, "baja" si es una suposición o no se encontró',
    "",
    "Ejemplo de respuesta:",
    "{",
    '  "fields": {',
    '    "expediente": { "value": "EX-2024-00123", "confidence": "alta" },',
    '    "organismo": { "value": "Ministerio de Obras Públicas", "confidence": "alta" }',
    "  }",
    "}",
  ].join("\n");

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek no devolvió contenido");
  }

  try {
    const parsed = JSON.parse(content);
    return parsed.fields ?? {};
  } catch {
    throw new Error("Error al parsear la respuesta de DeepSeek");
  }
}
