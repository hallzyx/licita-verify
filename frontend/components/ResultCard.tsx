import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// ─── Machine → Display mapping ───────────────────────────────────────

const ESTADO_DISPLAY: Record<string, string> = {
  convocada: "Convocada",
  evaluacion: "En evaluación",
  adjudicada: "Adjudicada",
  desierta: "Desierta",
  cancelada: "Cancelada",
  ejecucion: "En ejecución",
  finalizada: "Finalizada",
};

const estadoVariant: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  Convocada: "info",
  "En evaluación": "warning",
  Adjudicada: "success",
  Desierta: "danger",
  Cancelada: "danger",
  "En ejecución": "info",
  Finalizada: "success",
};

// ─── Helpers ──────────────────────────────────────────────────────────

function formatARS(amount: unknown): string {
  if (amount == null) return "-";
  const num = typeof amount === "string" ? Number(amount) : Number(amount);
  if (Number.isNaN(num)) return String(amount);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(value: string | number | undefined | null): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}

// ─── Types ────────────────────────────────────────────────────────────

export interface ResultCardEntity {
  entityKey: string;
  attributes: Record<string, string | number>;
  payload: Record<string, unknown> | null;
}

interface ResultCardProps {
  entity: ResultCardEntity;
}

/**
 * Compact card showing key procurement data for one entity.
 */
export function ResultCard({ entity }: ResultCardProps) {
  const { attributes: attrs, payload, entityKey } = entity;
  const merged = { ...attrs, ...payload };

  const objeto = String(merged.objeto || "-");
  const organismo = String(attrs.organismo || payload?.organismo || "-");
  const expediente = String(attrs.expediente || payload?.expediente || "");
  const tipoProcedimiento = String(
    attrs.tipoProcedimiento || payload?.tipoProcedimiento || "",
  );
  const estadoMachine = String(attrs.estado || payload?.estado || "");
  const estadoDisplay = ESTADO_DISPLAY[estadoMachine] || estadoMachine;
  const presupuesto = merged.presupuestoOficial;
  const fecha = String(payload?.fechaConvocatoria || attrs.fechaConvocatoria || "");

  return (
    <Link
      href={`/licitacion/${entityKey}`}
      className="block rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="px-5 py-4">
        {/* Top row: estado badge + tipo */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {estadoDisplay && estadoDisplay !== "-" && (
            <Badge variant={estadoVariant[estadoDisplay] || "default"}>
              {estadoDisplay}
            </Badge>
          )}
          {tipoProcedimiento && (
            <span className="text-xs text-gray-400">{tipoProcedimiento}</span>
          )}
        </div>

        {/* Objeto (bold, main title) */}
        <h3 className="mb-1 text-sm font-semibold leading-snug text-gray-900 line-clamp-2">
          {objeto}
        </h3>

        {/* Organismo + expediente */}
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>{organismo}</span>
          {expediente && <span className="font-mono">{expediente}</span>}
        </div>

        {/* Bottom row: monto + fecha + action */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-2">
          <div className="flex items-center gap-3 text-xs">
            {presupuesto != null && (
              <span className="font-medium text-gray-700">
                {formatARS(presupuesto)}
              </span>
            )}
            {fecha && fecha !== "-" && (
              <span className="text-gray-400">{formatDate(fecha)}</span>
            )}
          </div>
          <span className="text-xs font-medium text-blue-600 hover:text-blue-800">
            Ver detalle →
          </span>
        </div>
      </div>
    </Link>
  );
}
