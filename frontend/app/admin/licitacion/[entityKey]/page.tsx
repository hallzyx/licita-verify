import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPublicClient } from "@/lib/arkiv/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyValue } from "@/components/ui/CopyValue";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ entityKey: string }>;
  searchParams: Promise<{ published?: string }>;
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

const EXPLORER_BASE_URL = (process.env.ARKIV_EXPLORER_URL || "https://explorer.braga.arkiv.network") + '/entity';

function SummaryRow({
  label,
  value,
  isDate,
}: {
  label: string;
  value: unknown;
  isDate?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
      <dt className="min-w-48 text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">
        {isDate ? new Date(value as string | number).toLocaleString("es-AR") : String(value)}
      </dd>
    </div>
  );
}

export default async function LicitacionDetailPage({ params, searchParams }: RouteContext) {
  const session = await getSession();
  if (!session?.authenticated) {
    redirect("/admin/login");
  }

  const { entityKey } = await params;
  const { published } = await searchParams;
  const justPublished = published === "true";

  let payload: Record<string, unknown> | null = null;
  let attrs: Record<string, string | number> = {};
  let error: string | null = null;
  let entityData: {
    key: string;
    owner: string | undefined;
    creator: string | undefined;
    createdAtBlock: string | undefined;
  } | null = null;

  try {
    const publicClient = getPublicClient();
    const entity = await publicClient.getEntity(entityKey as `0x${string}`);
    entityData = {
      key: entity.key,
      owner: entity.owner,
      creator: entity.creator,
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
    error = e instanceof Error ? e.message : "Error al cargar la licitación";
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Card title="Error">
            <p className="text-red-600">{error}</p>
            <div className="mt-4">
              <Link
                href="/admin/dashboard"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                ← Volver al dashboard
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Payload (original strings) takes precedence over attrs (timestamps) for display fields
  const mergedData: Record<string, unknown> = { ...attrs, ...payload };

  const estado = typeof mergedData.estado === "string" ? mergedData.estado : null;
  const entityType = typeof mergedData.entityType === "string" ? mergedData.entityType : null;

  const fields: { label: string; value: unknown }[] = [
    { label: "Entity Key", value: entityData?.key },
    { label: "Creador", value: entityData?.creator },
    { label: "Número de expediente", value: mergedData.expediente },
    { label: "Organismo contratante", value: mergedData.organismo },
    { label: "Jurisdicción", value: mergedData.jurisdiccion },
    { label: "Tipo de procedimiento", value: mergedData.tipoProcedimiento },
    { label: "Rubro", value: mergedData.rubro },
    { label: "Objeto de contratación", value: mergedData.objeto },
    { label: "Fecha de convocatoria", value: mergedData.fechaConvocatoria },
    { label: "Fecha de apertura", value: mergedData.fechaApertura },
    { label: "Presupuesto oficial", value: mergedData.presupuestoOficial },
    { label: "Criterio de adjudicación", value: mergedData.criterioAdjudicacion },
    { label: "Estado", value: mergedData.estado },
    { label: "Event Type", value: mergedData.eventType },
    { label: "Fuente oficial URL", value: mergedData.fuenteUrl },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">LicitaVerify</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Volver al dashboard
          </Link>
        </div>

        {justPublished && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Badge variant="success">Publicada exitosamente</Badge>
              <span className="text-sm text-green-700">
                La licitación se registró en Arkiv.
              </span>
            </div>
          </div>
        )}

        {/* Payload summary card */}
        <Card title="Resumen de la licitación">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {estado && (
                <Badge variant={estadoVariant[estado] || "default"}>
                  {estado}
                </Badge>
              )}
              {entityType && (
                <Badge variant="default">{entityType}</Badge>
              )}
            </div>

            <dl className="divide-y divide-gray-100">
              <SummaryRow label="Expediente" value={mergedData.expediente} />
              <SummaryRow label="Organismo contratante" value={mergedData.organismo} />
              <SummaryRow label="Tipo de procedimiento" value={mergedData.tipoProcedimiento} />
              <SummaryRow label="Rubro" value={mergedData.rubro} />
              <SummaryRow label="Estado" value={mergedData.estado} />
              <SummaryRow label="Fecha de convocatoria" value={mergedData.fechaConvocatoria} isDate />
              <SummaryRow label="Fecha de apertura" value={mergedData.fechaApertura} isDate />
            </dl>

            {/* Explorer link */}
            <div className="rounded-lg bg-gray-50 p-3">
              <a
                href={`${EXPLORER_BASE_URL}/${entityKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {/* External link icon */}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Ver en Arkiv Explorer
              </a>
            </div>
          </div>
        </Card>

        {/* Full payload / attributes */}
        <Card title="Datos completos" className="mt-4">
          <dl className="divide-y divide-gray-100">
            {fields.filter((f) => f.value).map(
              (field) => (
                  <div key={field.label} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
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
                      ) : field.label === "Fecha de convocatoria" || field.label === "Fecha de apertura" ? (
                        new Date(field.value as string | number).toLocaleString("es-AR")
                      ) : field.label === "Entity Key" ? (
                        <CopyValue value={String(field.value)} />
                      ) : (
                        String(field.value)
                      )}
                    </dd>
                  </div>
                ),
            )}
          </dl>

          {entityData?.createdAtBlock && (
            <div className="mt-4 rounded-lg bg-gray-100 p-4">
              <p className="text-xs text-gray-500">
                <strong>Creado en bloque:</strong> {entityData.createdAtBlock}
              </p>
            </div>
          )}

          {/* Entity metadata */}
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs">
            {entityData?.key && (
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-500">Entity Key</span>
                <CopyValue value={entityData.key} />
              </div>
            )}
            {entityData?.creator && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="font-medium text-gray-500">Creator</span>
                <CopyValue value={entityData.creator} />
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
