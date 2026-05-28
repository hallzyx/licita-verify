import { jsonToPayload, ExpirationTime } from "@arkiv-network/sdk/utils";
import { PROJECT_ATTRIBUTE } from "./client";

// ─── Types ──────────────────────────────────────────────────────────

export type LicitacionData = {
  expediente: string;
  organismo: string;
  jurisdiccion: string;
  tipoProcedimiento: string;
  rubro: string;
  objeto: string;
  fechaConvocatoria: string; // ISO date
  fechaApertura: string; // ISO datetime
  presupuestoOficial?: number;
  criterioAdjudicacion?: string;
  estado: string;
  fuenteUrl?: string;
  documentHash?: string;
  documentName?: string;
};

export type LicitacionEventType =
  | "pliego.published"
  | "ofertas.opened"
  | "evaluacion.issued"
  | "adjudicacion.published"
  | "contrato.perfected"
  | "ampliacion.approved";

// ─── Builders ───────────────────────────────────────────────────────

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/**
 * Build the createEntity params for publishing a pliego on Arkiv.
 */
export function buildPliegoEntity(data: LicitacionData) {
  const payload = jsonToPayload({
    eventType: "pliego.published" as const,
    ...data,
  });

  const attributes: import("@arkiv-network/sdk").Attribute[] = [
    PROJECT_ATTRIBUTE,
    { key: "entityType", value: "pliego" },
    { key: "eventType", value: "pliego.published" },
    { key: "expediente", value: data.expediente },
    { key: "organismo", value: data.organismo },
    { key: "jurisdiccion", value: data.jurisdiccion },
    { key: "tipoProcedimiento", value: data.tipoProcedimiento },
    { key: "rubro", value: data.rubro },
    { key: "estado", value: data.estado },
  ];

  // Numeric attributes for range queries
  if (data.presupuestoOficial) {
    attributes.push({
      key: "presupuestoOficial",
      value: data.presupuestoOficial,
    });
  }

  const fechaConvocatoriaTs = new Date(data.fechaConvocatoria).getTime();
  if (!isNaN(fechaConvocatoriaTs)) {
    attributes.push({
      key: "fechaConvocatoria",
      value: fechaConvocatoriaTs,
    });
  }

  return {
    payload,
    contentType: "application/json" as const,
    attributes,
    expiresIn: ExpirationTime.fromSeconds(ONE_YEAR_SECONDS),
  };
}
