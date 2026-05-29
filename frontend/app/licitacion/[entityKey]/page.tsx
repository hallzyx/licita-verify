import Link from "next/link";
import { getPublicClient } from "@/lib/arkiv/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyValue } from "@/components/ui/CopyValue";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────

type RouteContext = {
  params: Promise<{ entityKey: string }>;
};

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

const estadoVariant: Record<
  string,
  "success" | "warning" | "danger" | "info" | "default"
> = {
  Convocada: "info",
  "En evaluación": "warning",
  Adjudicada: "success",
  Desierta: "danger",
  Cancelada: "danger",
  "En ejecución": "info",
  Finalizada: "success",
};

// ─── Helpers ──────────────────────────────────────────────────────────

const EXPLORER_BASE_URL =
  (process.env.ARKIV_EXPLORER_URL ||
    "https://explorer.braga.arkiv.network") + "/entity";

function formatARS(amount: unknown): string {
  if (amount == null) return "-";
  const num = Number(amount);
  if (Number.isNaN(num)) return String(amount);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(num);
}

function SummaryRow({
  label,
  value,
  isDate,
}: {
  label: string;
  value: unknown;
  isDate?: boolean;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
      <dt className="min-w-48 text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">
        {isDate
          ? new Date(value as string | number).toLocaleString("es-AR")
          : String(value)}
      </dd>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────

export default async function PublicLicitacionDetailPage({
  params,
}: RouteContext) {
  const { entityKey } = await params;

  let payload: Record<string, unknown> | null = null;
  let attrs: Record<string, string | number> = {};
  let error: string | null = null;
  let entityData: {
    key: string;
    owner: string | undefined;
    creator: string | undefined;
    contentType: string | undefined;
    createdAtBlock: string | undefined;
  } | null = null;

  try {
    const publicClient = getPublicClient();
    const entity = await publicClient.getEntity(entityKey as `0x${string}`);

    entityData = {
      key: entity.key,
      owner: entity.owner,
      creator: entity.creator,
      contentType: entity.contentType,
      createdAtBlock: entity.createdAtBlock?.toString(),
    };

    try {
      payload = entity.toJson();
    } catch {
      // payload not available
    }

    for (const attr of entity.attributes) {
      attrs[attr.key] = attr.value;
    }
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Error al cargar la licitación";
    if (
      msg.toLowerCase().includes("not found") ||
      msg.toLowerCase().includes("no entity")
    ) {
      error = "not_found";
    } else {
      error = msg;
    }
  }

  // ── 404 state ───────────────────────────────────────────────────────

  if (error === "not_found") {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-xl font-bold text-gray-900">
              LicitaVerify
            </Link>
            <Link
              href="/admin/login"
              className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Admin
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">
          <Card title="No encontrada">
            <p className="text-gray-500">
              La licitación que buscás no existe o no está disponible.
            </p>
            <div className="mt-4">
              <Link
                href="/"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                ← Volver al inicio
              </Link>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // ── 502 / error state ──────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-xl font-bold text-gray-900">
              LicitaVerify
            </Link>
            <Link
              href="/admin/login"
              className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Admin
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">
          <Card title="Error">
            <p className="text-red-600">{error}</p>
            <div className="mt-4">
              <Link
                href="/"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                ← Volver al inicio
              </Link>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // ── Merge attributes + payload ──────────────────────────────────────

  const mergedData: Record<string, unknown> = { ...attrs, ...payload };

  const estadoMachine = String(mergedData.estado || "");
  const estadoDisplay = ESTADO_DISPLAY[estadoMachine] || estadoMachine;
  const documentHash = mergedData.documentHash
    ? String(mergedData.documentHash)
    : null;

  const fields: { label: string; value: unknown; isDate?: boolean }[] = [
    { label: "Expediente", value: mergedData.expediente },
    { label: "Organismo contratante", value: mergedData.organismo },
    { label: "Jurisdicción", value: mergedData.jurisdiccion },
    { label: "Tipo de procedimiento", value: mergedData.tipoProcedimiento },
    { label: "Rubro", value: mergedData.rubro },
    { label: "Estado", value: mergedData.estado },
    { label: "Objeto de contratación", value: mergedData.objeto },
    {
      label: "Fecha de convocatoria",
      value: mergedData.fechaConvocatoria,
      isDate: true,
    },
    {
      label: "Fecha de apertura",
      value: mergedData.fechaApertura,
      isDate: true,
    },
    { label: "Presupuesto oficial", value: formatARS(mergedData.presupuestoOficial) },
    { label: "Criterio de adjudicación", value: mergedData.criterioAdjudicacion },
    { label: "Proveedor adjudicado", value: mergedData.proveedorAdjudicado },
    { label: "Fuente oficial URL", value: mergedData.fuenteUrl },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            LicitaVerify
          </Link>
          <Link
            href="/admin/login"
            className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/buscar"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Volver a resultados
          </Link>
        </div>

        {/* Summary card */}
        <Card title="Licitación">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {estadoDisplay && (
                <Badge variant={estadoVariant[estadoDisplay] || "default"}>
                  {estadoDisplay}
                </Badge>
              )}
            </div>

            <dl className="divide-y divide-gray-100">
              <SummaryRow label="Expediente" value={mergedData.expediente} />
              <SummaryRow
                label="Organismo contratante"
                value={mergedData.organismo}
              />
              <SummaryRow
                label="Tipo de procedimiento"
                value={mergedData.tipoProcedimiento}
              />
              <SummaryRow label="Rubro" value={mergedData.rubro} />
              <SummaryRow label="Estado" value={mergedData.estado} />
              <SummaryRow
                label="Fecha de convocatoria"
                value={mergedData.fechaConvocatoria}
                isDate
              />
              <SummaryRow
                label="Fecha de apertura"
                value={mergedData.fechaApertura}
                isDate
              />
            </dl>

            {/* Explorer link */}
            <div className="rounded-lg bg-gray-50 p-3">
              <a
                href={`${EXPLORER_BASE_URL}/${entityKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
                Ver en Arkiv Explorer
              </a>
            </div>

            {/* Document hash */}
            {documentHash && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="mb-1 text-xs font-medium text-gray-500">
                  Hash del documento
                </p>
                <CopyValue value={documentHash} />
              </div>
            )}
          </div>
        </Card>

        {/* Full data */}
        <Card title="Datos completos" className="mt-4">
          <dl className="divide-y divide-gray-100">
            {fields
              .filter((f) => f.value != null && f.value !== "")
              .map((field) => (
                <div
                  key={field.label}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4"
                >
                  <dt className="min-w-48 text-sm font-medium text-gray-500">
                    {field.label}
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {field.label === "Fuente oficial URL" ? (
                      <a
                        href={String(field.value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {String(field.value)}
                      </a>
                    ) : (
                      String(field.value)
                    )}
                  </dd>
                </div>
              ))}
          </dl>
        </Card>

        {/* Entity metadata */}
        <Card title="Verificabilidad" className="mt-4">
          <div className="space-y-3">
            {entityData?.key && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-500">
                  Entity Key
                </span>
                <CopyValue value={entityData.key} />
              </div>
            )}
            {entityData?.createdAtBlock && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-500">
                  Creado en bloque
                </span>
                <span className="font-mono text-xs text-gray-700">
                  {entityData.createdAtBlock}
                </span>
              </div>
            )}
            {entityData?.creator && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-500">
                  Creator
                </span>
                <CopyValue value={entityData.creator} />
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
