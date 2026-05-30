import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPublicClient, withRetry } from "@/lib/arkiv/client";
import { eq, gte, lte } from "@arkiv-network/sdk/query";
import {
  TIPOS_PROCEDIMIENTO,
  TIPOS_PROCEDIMIENTO_MACHINE,
  RUBROS,
  RUBROS_MACHINE,
  ESTADOS,
  ESTADOS_MACHINE,
} from "@/lib/validacion";

/**
 * Maps a display enum value to its corresponding machine value
 * by index lookup, or returns the original if no match.
 */
function toMachine(key: string, value: string): string {
  const maps: Record<string, { display: readonly string[]; machine: readonly string[] }> = {
    rubro: { display: RUBROS, machine: RUBROS_MACHINE },
    estado: { display: ESTADOS, machine: ESTADOS_MACHINE },
    tipoProcedimiento: { display: TIPOS_PROCEDIMIENTO, machine: TIPOS_PROCEDIMIENTO_MACHINE },
  };
  const map = maps[key];
  if (!map) return value;
  const idx = map.display.indexOf(value as typeof map.display[number]);
  return idx >= 0 && idx < map.machine.length ? map.machine[idx] : value;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

    const organismo = searchParams.get("organismo");
    const rubro = searchParams.get("rubro");
    const estado = searchParams.get("estado");
    const jurisdiccion = searchParams.get("jurisdiccion");
    const tipoProcedimiento = searchParams.get("tipoProcedimiento");
    const keyword = searchParams.get("keyword");
    const montoMin = searchParams.get("montoMin");
    const montoMax = searchParams.get("montoMax");

    const publicClient = getPublicClient();
    const query = publicClient
      .buildQuery()
      .where(eq("project", "licita-verify-v1"))
      .where(eq("entityType", "pliego"))
      .withPayload(true)
      .withAttributes(true)
      .limit(limit);

    if (cursor) {
      query.cursor(cursor);
    }

    // Apply optional filter params
    if (organismo) {
      query.where(eq("organismo", organismo));
    }
    if (rubro) {
      query.where(eq("rubro", toMachine("rubro", rubro)));
    }
    if (estado) {
      query.where(eq("estado", toMachine("estado", estado)));
    }
    if (jurisdiccion) {
      query.where(eq("jurisdiccion", jurisdiccion));
    }
    if (tipoProcedimiento) {
      query.where(eq("tipoProcedimiento", toMachine("tipoProcedimiento", tipoProcedimiento)));
    }
    if (montoMin) {
      query.where(gte("presupuestoOficial", Number(montoMin)));
    }
    if (montoMax) {
      query.where(lte("presupuestoOficial", Number(montoMax)));
    }
    // keyword omitted for MVP — see ai/search route for rationale

    const result = await withRetry(() => query.fetch());

    const entities = result.entities.map((entity) => {
      let payload = null;
      try {
        payload = entity.toJson();
      } catch {
        // payload not available
      }

      const attrs: Record<string, string | number> = {};
      for (const attr of entity.attributes) {
        attrs[attr.key] = attr.value;
      }

      return {
        entityKey: entity.key,
        owner: entity.owner,
        creator: entity.creator,
        createdAtBlock: entity.createdAtBlock?.toString(),
        attributes: attrs,
        payload,
      };
    });

    return NextResponse.json({
      entities,
      cursor: result.hasNextPage() ? result.cursor : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al consultar licitaciones";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
