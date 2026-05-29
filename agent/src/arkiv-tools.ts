/**
 * Arkiv query tools para el agente ai-sdk.
 * Se ejecutan dentro del loop generateText con maxSteps.
 */
import { tool, jsonSchema } from "ai";
import { createPublicClient, http } from "@arkiv-network/sdk";
import { braga } from "@arkiv-network/sdk/chains";
import { eq, gte, lte } from "@arkiv-network/sdk/query";

// ─── Client ────────────────────────────────────────────────────────────

function getClient() {
  return createPublicClient({ chain: braga, transport: http() });
}

// ─── Tool: searchLicitaciones ─────────────────────────────────────────

export const searchLicitaciones = tool({
  description:
    "Buscar licitaciones públicas en Arkiv por organismo, rubro, estado, tipo, monto y otros filtros. " +
    "Usar cuando el usuario pide buscar, listar, mostrar, encontrar licitaciones, obras, contrataciones.",
  inputSchema: jsonSchema({
    type: "object",
    properties: {
      organismo: { type: "string", description: "Nombre del organismo contratante" },
      rubro: { type: "string", description: "Rubro: obra, bienes, servicios, consultoria" },
      estado: { type: "string", description: "Estado: convocada, evaluacion, adjudicada, desierta, cancelada, ejecucion, finalizada" },
      tipoProcedimiento: { type: "string", description: "Tipo: licitacion_publica, licitacion_privada, contratacion_directa, concurso_ofertas, subasta" },
      jurisdiccion: { type: "string", description: "Provincia o jurisdiccion" },
      montoMin: { type: "number", description: "Monto minimo en ARS" },
      montoMax: { type: "number", description: "Monto maximo en ARS" },
      keyword: { type: "string", description: "Palabra clave adicional" },
      limite: { type: "number", description: "Maximo de resultados (max 20)" },
    },
    required: [],
  }),
  execute: async (params: Record<string, unknown>) => {
    const p = params as { organismo?: string; rubro?: string; estado?: string; tipoProcedimiento?: string; jurisdiccion?: string; montoMin?: number; montoMax?: number; keyword?: string; limite?: number };
    console.log(`[arkiv] search:`, JSON.stringify(p));

    const client = getClient();
    const query = client
      .buildQuery()
      .where(eq("project", "licita-verify-v1"))
      .where(eq("entityType", "pliego"))
      .withPayload(true)
      .withAttributes(true)
      .limit(Math.min(p.limite || 10, 20));

    if (p.rubro) query.where(eq("rubro", p.rubro));
    if (p.estado) query.where(eq("estado", p.estado));
    if (p.organismo) query.where(eq("organismo", p.organismo));
    if (p.jurisdiccion) query.where(eq("jurisdiccion", p.jurisdiccion));
    if (p.tipoProcedimiento) query.where(eq("tipoProcedimiento", p.tipoProcedimiento));
    if (p.montoMin != null) query.where(gte("presupuestoOficial", p.montoMin));
    if (p.montoMax != null) query.where(lte("presupuestoOficial", p.montoMax));

    const result = await query.fetch();

    const entities = result.entities.map((entity) => {
      let payload: Record<string, unknown> | null = null;
      try { payload = entity.toJson() as Record<string, unknown>; } catch { /* ignore */ }
      const attrs: Record<string, string | number> = {};
      for (const attr of entity.attributes) attrs[attr.key] = attr.value;
      return { entityKey: entity.key, attributes: attrs, payload };
    });

    console.log(`[arkiv] found ${entities.length} results`);
    return entities;
  },
});

// ─── Tool: getDetalle ─────────────────────────────────────────────────

export const getDetalle = tool({
  description:
    "Obtener el detalle completo de una licitación por su entityKey. " +
    "Usar cuando el usuario quiere ver más información de un resultado específico.",
  inputSchema: jsonSchema({
    type: "object",
    properties: {
      entityKey: { type: "string", description: "Entity key de la entidad en Arkiv (formato 0x...)" },
    },
    required: ["entityKey"],
  }),
  execute: async (params: Record<string, unknown>) => {
    const entityKey = params.entityKey as string;
    console.log(`[arkiv] detail: ${entityKey}`);
    try {
      const client = getClient();
      const entity = await client.getEntity(entityKey as `0x${string}`);
      let payload: Record<string, unknown> | null = null;
      try { payload = entity.toJson() as Record<string, unknown>; } catch { /* ignore */ }
      const attrs: Record<string, string | number> = {};
      for (const attr of entity.attributes) attrs[attr.key] = attr.value;
      return { entityKey: entity.key, attributes: attrs, payload };
    } catch (err) {
      console.error(`[arkiv] detail error:`, err);
      return null;
    }
  },
});
