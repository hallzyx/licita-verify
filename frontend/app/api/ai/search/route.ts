import { NextResponse } from "next/server";
import { getPublicClient, withRetry } from "@/lib/arkiv/client";
import { eq, gte, lte } from "@arkiv-network/sdk/query";
import { parseSearchQuery, type ArkivFilters } from "@/lib/ai-search";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = body.query || body.q;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Escribí una consulta para buscar" },
        { status: 400 },
      );
    }

    // Step 1: DeepSeek interprets the natural language query
    const interpretation = await parseSearchQuery(query.trim());

    // If ambiguous, return clarification — no Arkiv query needed
    if (interpretation.ambiguous) {
      return NextResponse.json({
        interpretation,
        arkivFilters: {},
        results: [],
      });
    }

    // Step 2: Build Arkiv query from the interpreted filters
    const filters = interpretation.filters;
    const publicClient = getPublicClient();

    const arkivQuery = publicClient
      .buildQuery()
      .where(eq("project", "licita-verify-v1"))
      .where(eq("entityType", "pliego"))
      .withPayload(true)
      .withAttributes(true)
      .limit(50);

    if (filters.rubro && filters.rubro.length > 0) {
      arkivQuery.where(eq("rubro", filters.rubro[0]));
    }
    if (filters.organismo && filters.organismo.length > 0) {
      arkivQuery.where(eq("organismo", filters.organismo[0]));
    }
    if (filters.jurisdiccion && filters.jurisdiccion.length > 0) {
      arkivQuery.where(eq("jurisdiccion", filters.jurisdiccion[0]));
    }
    if (filters.tipoProcedimiento && filters.tipoProcedimiento.length > 0) {
      arkivQuery.where(eq("tipoProcedimiento", filters.tipoProcedimiento[0]));
    }
    if (filters.estado && filters.estado.length > 0) {
      arkivQuery.where(eq("estado", filters.estado[0]));
    }
    if (filters.montoMin != null) {
      arkivQuery.where(gte("presupuestoOficial", filters.montoMin));
    }
    if (filters.montoMax != null) {
      arkivQuery.where(lte("presupuestoOficial", filters.montoMax));
    }
    // Note: keyword is omitted for MVP — Arkiv SDK does not support
    // free-text LIKE / CONTAINS on attributes.

    const result = await withRetry(() => arkivQuery.fetch());

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
      interpretation,
      arkivFilters: filters,
      results: entities,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al procesar la consulta";
    return NextResponse.json(
      {
        error:
          "No pudimos interpretar tu consulta. Probá reformularla.",
        detail: message,
      },
      { status: 502 },
    );
  }
}
