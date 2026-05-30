import Link from "next/link";
import { getPublicClient, withRetry } from "@/lib/arkiv/client";
import { Badge } from "@/components/ui/badge";
import { CopyValue } from "@/components/ui/CopyValue";
import { CopyButton } from "@/components/ui/CopyButton";

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

function formatDate(value: unknown): string {
  if (value == null || value === "") return "";
  const d = new Date(value as string | number);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Data Row Component ───────────────────────────────────────────────

function DataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container/50 transition-colors">
      <th className="w-1/3 p-4 align-top font-label-sm text-label-sm uppercase text-on-surface-variant">
        {label}
      </th>
      <td className="p-4 font-body-md text-body-md text-on-surface">
        {children}
      </td>
    </tr>
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
    const entity = await withRetry(() =>
      publicClient.getEntity(entityKey as `0x${string}`),
    );

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
      <div className="flex min-h-screen flex-col bg-background text-on-background">
        <nav className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface-container-lowest">
          <div className="container flex h-16 items-center justify-between px-4 md:px-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="material-symbols-outlined icon-fill text-2xl text-primary" aria-hidden="true">
                verified_user
              </span>
              <span className="font-headline-md text-headline-md font-bold text-primary">
                LicitaVerify
              </span>
            </Link>
            <Link
              href="/admin/login"
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors"
            >
              Admin
            </Link>
          </div>
        </nav>
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16">
          <span className="material-symbols-outlined mb-4 text-5xl text-on-surface-variant">search_off</span>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-2">
            No encontrada
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 text-center">
            La licitación que buscás no existe o no está disponible.
          </p>
          <Link
            href="/manual"
            className="flex items-center gap-2 rounded bg-primary px-6 py-3 font-label-sm text-label-sm text-on-primary hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
            Buscar licitaciones
          </Link>
        </main>
      </div>
    );
  }

  // ── 502 / error state ──────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-on-background">
        <nav className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface-container-lowest">
          <div className="container flex h-16 items-center justify-between px-4 md:px-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="material-symbols-outlined icon-fill text-2xl text-primary" aria-hidden="true">
                verified_user
              </span>
              <span className="font-headline-md text-headline-md font-bold text-primary">
                LicitaVerify
              </span>
            </Link>
          </div>
        </nav>
        <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16">
          <span className="material-symbols-outlined mb-4 text-5xl text-error">error</span>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-2">
            Error al cargar
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 max-w-md text-center">
            {error}
          </p>
          <Link
            href="/manual"
            className="flex items-center gap-2 rounded bg-primary px-6 py-3 font-label-sm text-label-sm text-on-primary hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Volver a búsqueda
          </Link>
        </main>
      </div>
    );
  }

  // ── Merge attributes + payload ──────────────────────────────────────

  const mergedData: Record<string, unknown> = { ...attrs, ...payload };

  const estadoMachine = String(mergedData.estado || "");
  const estadoDisplay = ESTADO_DISPLAY[estadoMachine] || estadoMachine;
  const objeto = mergedData.objeto
    ? String(mergedData.objeto)
    : `Licitación: ${mergedData.expediente || entityKey}`;

  // Primary fields shown in the table
  type FieldDef = { label: string; value: string; badge?: boolean; isDate?: boolean; isUrl?: boolean };
  const primaryFields: FieldDef[] = [
    { label: "Expediente", value: String(mergedData.expediente ?? "") },
    { label: "Organismo contratante", value: String(mergedData.organismo ?? "") },
    { label: "Jurisdicción", value: String(mergedData.jurisdiccion ?? "") },
    { label: "Tipo de procedimiento", value: String(mergedData.tipoProcedimiento ?? "") },
    { label: "Rubro", value: String(mergedData.rubro ?? "") },
    { label: "Estado", value: estadoDisplay, badge: true },
    {
      label: "Fecha de convocatoria",
      value: mergedData.fechaConvocatoria ? formatDate(mergedData.fechaConvocatoria) : "",
      isDate: true,
    },
    {
      label: "Fecha de apertura",
      value: mergedData.fechaApertura ? formatDate(mergedData.fechaApertura) : "",
      isDate: true,
    },
    {
      label: "Presupuesto oficial",
      value: mergedData.presupuestoOficial ? formatARS(mergedData.presupuestoOficial) : "",
    },
    { label: "Criterio de adjudicación", value: String(mergedData.criterioAdjudicacion ?? "") },
    { label: "Proveedor adjudicado", value: String(mergedData.proveedorAdjudicado ?? "") },
    {
      label: "Fuente oficial URL",
      value: String(mergedData.fuenteUrl ?? ""),
      isUrl: true,
    },
  ].filter((f) => f.value !== "");

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background font-body-md text-body-md">
      {/* ── TopNavBar ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface-container-lowest">
        <div className="container flex h-16 items-center justify-between px-4 md:px-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="material-symbols-outlined icon-fill text-2xl text-primary" aria-hidden="true">
                verified_user
              </span>
              <span className="font-headline-md text-headline-md font-bold text-primary">
                LicitaVerify
              </span>
            </Link>
            <nav className="hidden items-center gap-6 md:flex">
              <Link
                href="/"
                className="font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary"
              >
                Inicio
              </Link>
              <Link
                href="/manual"
                className="font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary"
              >
                Búsqueda
              </Link>
              <Link
                href="/chat"
                className="font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary"
              >
                Chat IA
              </Link>
              <a
                href="#transparencia"
                className="font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary"
              >
                Transparencia
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/login"
              className="hidden items-center justify-center gap-2 rounded-full bg-primary px-6 py-2 font-label-sm text-label-sm text-on-primary hover:opacity-90 transition-opacity md:flex"
            >
              Acceder
            </Link>
            <button className="text-primary md:hidden" aria-label="Menú">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Content ────────────────────────────────────────── */}
      <main className="container mx-auto flex flex-1 flex-col gap-12 px-4 py-12 md:px-16">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
          <Link
            href="/manual"
            className="flex items-center gap-1 transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Volver a resultados
          </Link>
        </div>

        {/* Title & Status */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <h1 className="max-w-4xl font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-primary">
            {objeto}
          </h1>
          <div className="flex-shrink-0 pt-2">
            {estadoDisplay && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-high px-3 py-1.5 font-label-sm text-label-sm text-primary">
                <span className="h-2 w-2 rounded-full bg-secondary" />
                {estadoDisplay}
              </span>
            )}
          </div>
        </div>

        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Data Table (8 cols) */}
          <div className="flex flex-col gap-8 lg:col-span-8">
            {/* Data Card */}
            <div className="ambient-shadow overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              <div className="border-b border-outline-variant bg-surface-container-low p-6">
                <h2 className="font-headline-md text-headline-md text-primary">
                  Detalles del Expediente
                </h2>
              </div>
              <div className="p-0">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    {primaryFields.map((field) => (
                      <DataRow key={field.label} label={field.label}>
                        {field.badge ? (
                          <Badge variant={estadoVariant[estadoDisplay] || "default"}>
                            {field.value}
                          </Badge>
                        ) : field.isUrl ? (
                          <a
                            href={field.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline hover:opacity-80 transition-opacity"
                          >
                            {field.value}
                          </a>
                        ) : (
                          field.value
                        )}
                      </DataRow>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Verification & Actions (4 cols) */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            {/* Verificabilidad Card */}
            <div className="ambient-shadow rounded-xl border-b border-r border-t border-outline-variant border-l-4 border-l-secondary bg-surface-container-lowest p-6">
              <div className="mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[28px]">verified_user</span>
                <h3 className="font-headline-md text-headline-md text-primary">
                  Verificabilidad
                </h3>
              </div>
              <p className="mb-6 font-label-sm text-label-sm leading-relaxed text-on-surface-variant">
                Este registro está anclado criptográficamente. Los datos mostrados coinciden exactamente con la fuente original inmutable.
              </p>

              <div className="flex flex-col gap-4">
                {/* Entity Key */}
                {entityData?.key ? (
                  <div className="flex flex-col gap-1 rounded bg-surface-container p-3">
                    <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">
                      Entity Key
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="max-w-[85%] truncate font-mono font-body-md text-body-md text-primary">
                        {entityData.key.length > 14
                          ? `${entityData.key.slice(0, 6)}...${entityData.key.slice(-4)}`
                          : entityData.key}
                      </span>
                      <CopyButton value={entityData.key} />
                    </div>
                  </div>
                ) : null}

                {/* Creado en bloque */}
                {entityData?.createdAtBlock ? (
                  <div className="flex flex-col gap-1 rounded bg-surface-container p-3">
                    <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">
                      Creado en bloque
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-body-md text-body-md text-primary">
                        #{entityData.createdAtBlock}
                      </span>
                      <a
                        href={`${EXPLORER_BASE_URL}/${entityKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-on-surface-variant transition-colors hover:text-primary"
                        title="Ver bloque"
                      >
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      </a>
                    </div>
                  </div>
                ) : null}

                {/* Creator */}
                {entityData?.creator ? (
                  <div className="flex flex-col gap-1 rounded bg-surface-container p-3">
                    <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">
                      Creator
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="max-w-[85%] truncate font-mono font-body-md text-body-md text-primary">
                        {entityData.creator.length > 14
                          ? `${entityData.creator.slice(0, 6)}...${entityData.creator.slice(-4)}`
                          : entityData.creator}
                      </span>
                      <CopyButton value={entityData.creator} />
                    </div>
                  </div>
                ) : null}

                {/* Document Hash */}
                {mergedData.documentHash != null && String(mergedData.documentHash) !== "" ? (
                  <div className="flex flex-col gap-1 rounded bg-surface-container p-3">
                    <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">
                      Document Hash
                    </span>
                    <CopyValue value={String(mergedData.documentHash)} />
                  </div>
                ) : null}
              </div>

              {/* Explorer Link */}
              <div className="mt-8">
                <a
                  href={`${EXPLORER_BASE_URL}/${entityKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded bg-primary px-4 py-3 font-label-sm text-label-sm text-on-primary shadow-sm transition-colors hover:bg-primary-container"
                >
                  <span className="material-symbols-outlined text-[18px]">explore</span>
                  Ver en Arkiv Explorer
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-outline-variant bg-surface-container">
        <div className="container flex flex-col items-center justify-between gap-6 px-4 py-12 md:flex-row md:px-16 md:text-left">
          <p className="font-body-md text-body-md text-center text-on-surface-variant md:text-left">
            © {new Date().getFullYear()} LicitaVerify. Portal de Transparencia Ciudadana.
          </p>
          <nav className="flex flex-wrap justify-center gap-6">
            <a href="#" className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary hover:underline">Privacidad</a>
            <a href="#" className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary hover:underline">Términos</a>
            <a href="#" className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary hover:underline">Contacto</a>
            <a href="#" className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary hover:underline">Ayuda</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}