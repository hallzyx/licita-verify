"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableRow, TableCell } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface EntityItem {
  entityKey: string;
  attributes: Record<string, string | number>;
  payload: Record<string, unknown> | null;
}

interface DashboardClientProps {
  entities: EntityItem[];
  error: string | null;
}

const estadoVariant: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  Convocada: "info",
  "En evaluación": "warning",
  Adjudicada: "success",
  Desierta: "danger",
  Cancelada: "danger",
  "En ejecución": "info",
  Finalizada: "success",
};

export function DashboardClient({ entities, error }: DashboardClientProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // Sort by fechaConvocatoria descending (newest first)
  const sortedEntities = [...entities].sort((a, b) => {
    const aPayload = a.payload || {};
    const bPayload = b.payload || {};
    const aFecha = String(aPayload.fechaConvocatoria || a.attributes.fechaConvocatoria || "");
    const bFecha = String(bPayload.fechaConvocatoria || b.attributes.fechaConvocatoria || "");
    return bFecha.localeCompare(aFecha);
  });

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
    } catch {
      // ignore
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">LicitaVerify</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleLogout} isLoading={loggingOut}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Licitaciones
            {entities.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({entities.length})
              </span>
            )}
          </h2>
          <Button onClick={() => router.push("/admin/dashboard/nueva")}>
            + Nueva licitación
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <p className="text-sm text-red-700">{error}</p>
          </Card>
        )}

        {entities.length === 0 && !error && (
          <Card>
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-gray-500">No hay licitaciones publicadas todavía.</p>
              <Button onClick={() => router.push("/admin/dashboard/nueva")}>
                Publicar primera licitación
              </Button>
            </div>
          </Card>
        )}

        {entities.length > 0 && (
          <Table
            headers={["Expediente", "Organismo", "Tipo", "Rubro", "Estado", "Fecha apertura", ""]}
          >
            {sortedEntities.map((entity) => {
              const attrs = entity.attributes;
              const payload = entity.payload;
              const estado = String(attrs.estado || payload?.estado || "");
              const expediente = String(attrs.expediente || payload?.expediente || "-");
              const organismo = String(attrs.organismo || payload?.organismo || "-");
              const tipo = String(attrs.tipoProcedimiento || payload?.tipoProcedimiento || "-");
              const rubro = String(attrs.rubro || payload?.rubro || "-");
              const fechaApertura = String(payload?.fechaApertura || "");

              return (
                <TableRow
                  key={entity.entityKey}
                  href={`/admin/licitacion/${entity.entityKey}`}
                >
                  <TableCell className="font-medium">{expediente}</TableCell>
                  <TableCell>{organismo}</TableCell>
                  <TableCell>{tipo}</TableCell>
                  <TableCell>{rubro}</TableCell>
                  <TableCell>
                    <Badge variant={estadoVariant[estado] || "default"}>
                      {estado}
                    </Badge>
                  </TableCell>
                  <TableCell>{fechaApertura ? new Date(fechaApertura).toLocaleDateString("es-AR") : "-"}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-xs text-gray-400">Ver detalle →</span>
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        )}
      </main>
    </div>
  );
}
