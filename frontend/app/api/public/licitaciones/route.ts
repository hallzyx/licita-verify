import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPublicClient } from "@/lib/arkiv/client";
import { eq, gte, lte } from "@arkiv-network/sdk/query";

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
      query.where(eq("rubro", rubro));
    }
    if (estado) {
      query.where(eq("estado", estado));
    }
    if (jurisdiccion) {
      query.where(eq("jurisdiccion", jurisdiccion));
    }
    if (tipoProcedimiento) {
      query.where(eq("tipoProcedimiento", tipoProcedimiento));
    }
    if (montoMin) {
      query.where(gte("presupuestoOficial", Number(montoMin)));
    }
    if (montoMax) {
      query.where(lte("presupuestoOficial", Number(montoMax)));
    }
    // keyword omitted for MVP — see ai/search route for rationale

    const result = await query.fetch();

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
