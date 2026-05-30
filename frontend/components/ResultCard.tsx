import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// ─── Machine → Display mapping ────────────────────────────────────────

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

const ESTADO_ICON: Record<string, string> = {
  Convocada: "campaign",
  "En evaluación": "pending_actions",
  Adjudicada: "check_circle",
  Desierta: "cancel",
  Cancelada: "cancel",
  "En ejecución": "pending_actions",
  Finalizada: "check_circle",
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
 * MD3-styled card showing key procurement data for one entity.
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
  const estadoIcon = ESTADO_ICON[estadoDisplay] || "info";

  return (
    <Link
      href={`/licitacion/${entityKey}`}
      className="ambient-shadow flex h-full flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-6 transition-transform duration-300 hover:-translate-y-1"
    >
      {/* Top row: estado badge + código */}
      <div className="mb-4 flex items-start justify-between">
        {estadoDisplay && estadoDisplay !== "-" ? (
          <span className="flex items-center gap-1 rounded-full bg-secondary-container px-3 py-1 font-label-sm text-label-sm text-on-secondary-container">
            <span className="material-symbols-outlined text-[14px]">{estadoIcon}</span>
            {estadoDisplay}
          </span>
        ) : tipoProcedimiento ? (
          <span className="rounded-full border border-outline-variant bg-surface-container-high px-3 py-1 font-label-sm text-label-sm text-primary">
            {tipoProcedimiento}
          </span>
        ) : null}
        {expediente && (
          <span className="font-label-sm text-label-sm text-on-surface-variant" title={`Código: ${expediente}`}>
            {expediente.length > 12 ? expediente.slice(0, 12) + "…" : expediente}
          </span>
        )}
      </div>

      {/* Objeto — title */}
      <h2 className="font-headline-md text-headline-md mb-2 line-clamp-2 text-primary">
        {objeto}
      </h2>

      {/* Description placeholder — organismo */}
      <p className="font-body-md text-body-md mb-6 flex-grow text-on-surface-variant">
        {organismo}
      </p>

      {/* Bottom section */}
      <div className="mt-auto border-t border-outline-variant pt-4">
        <div className="mb-4 flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-outline">account_balance</span>
          <span className="font-label-sm text-label-sm">{tipoProcedimiento || "Sin tipo"}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 font-label-sm text-label-sm">
            {presupuesto != null && (
              <span className="font-medium text-primary">{formatARS(presupuesto)}</span>
            )}
            {fecha && fecha !== "-" && (
              <span className="text-on-surface-variant">{formatDate(fecha)}</span>
            )}
          </div>
          <span className="flex items-center gap-1 font-label-sm text-label-sm text-primary transition-colors group-hover:text-surface-tint">
            Ver Detalle
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </div>
      </div>
    </Link>
  );
}