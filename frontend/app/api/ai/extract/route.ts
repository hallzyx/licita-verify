import { NextResponse } from "next/server";
import { extractTextWithOpenAI, structureFieldsWithDeepSeek } from "@/lib/ai";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Archivo no encontrado. Enviá un archivo en el campo 'file'." },
        { status: 400 },
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no válido. Solo se aceptan PDF, JPG o PNG." },
        { status: 400 },
      );
    }

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `El archivo excede el máximo de 10 MB (${mb} MB).` },
        { status: 400 },
      );
    }

    // Check env vars
    if (!process.env.OPENAI_API_KEY_OCR) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY_OCR no configurada" },
        { status: 500 },
      );
    }
    if (!process.env.DEEPSEEK_API_KEY_LLM) {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY_LLM no configurada" },
        { status: 500 },
      );
    }

    // Convert file to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // Run AI pipeline (Step 1: OCR, Step 2: Structure)
    const rawText = await extractTextWithOpenAI(fileBuffer, file.type);

    if (!rawText) {
      return NextResponse.json(
        {
          error:
            "No se pudo extraer texto del documento. Probá con un archivo de mejor calidad.",
        },
        { status: 502 },
      );
    }

    const fields = await structureFieldsWithDeepSeek(rawText);

    return NextResponse.json({ fields, rawText }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido en el servicio de IA";

    // Detect timeout errors from OpenAI / DeepSeek
    if (
      message.includes("timeout") ||
      message.includes("TIMEOUT") ||
      message.includes("abort") ||
      message.includes("Abort")
    ) {
      return NextResponse.json(
        {
          error:
            "La extracción tardó demasiado. Probá con un documento más corto o de menor resolución.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: `Error en el servicio de IA: ${message}` },
      { status: 502 },
    );
  }
}
