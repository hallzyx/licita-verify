"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { licitacionSchema, TIPOS_PROCEDIMIENTO, RUBROS, ESTADOS } from "@/lib/validacion";
import type { LicitacionFormValues } from "@/lib/validacion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/FileUpload";
import type { FileUploadResult } from "@/components/ui/FileUpload";

export default function NuevaLicitacionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fileUpload, setFileUpload] = useState<FileUploadResult>({
    file: null,
    hash: "",
    fileName: "",
  });
  const [success, setSuccess] = useState<{
    entityKey: string;
    txHash: string;
  } | null>(null);

  // @hookform/resolvers v5 + Zod v4 have a known type incompatibility.
  // The cast bridges the schema inference gap.
  const typedResolver = zodResolver(licitacionSchema) as unknown as Resolver<LicitacionFormValues>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LicitacionFormValues>({
    resolver: typedResolver,
    defaultValues: {
      expediente: "",
      organismo: "",
      jurisdiccion: "",
      tipoProcedimiento: undefined,
      rubro: undefined,
      objeto: "",
      fechaConvocatoria: "",
      fechaApertura: "",
      presupuestoOficial: undefined,
      criterioAdjudicacion: "",
      estado: undefined,
      fuenteUrl: "",
    },
  });

  async function onSubmit(data: LicitacionFormValues) {
    setIsSubmitting(true);
    setServerError(null);

    const body = {
      ...data,
      ...(fileUpload.hash ? { documentHash: fileUpload.hash } : {}),
      ...(fileUpload.fileName ? { documentName: fileUpload.fileName } : {}),
    };

    try {
      const res = await fetch("/api/arkiv/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error || "Error al publicar");
        return;
      }

      setSuccess({
        entityKey: json.entityKey,
        txHash: json.txHash,
      });
    } catch {
      setServerError("Error de conexión con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Navigate to detail page with published=true banner on success
  useEffect(() => {
    if (success) {
      router.push(`/admin/licitacion/${success.entityKey}?published=true`);
    }
  }, [success, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">LicitaVerify</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/admin/dashboard")}>
            ← Volver al dashboard
          </Button>
        </div>

        <Card title="Nueva licitación">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <Input
              label="Número de expediente"
              placeholder="Ej: EX-2024-001"
              error={errors.expediente?.message}
              {...register("expediente")}
            />

            <Input
              label="Organismo contratante"
              placeholder="Ej: Ministerio de Obras Públicas"
              error={errors.organismo?.message}
              {...register("organismo")}
            />

            <Input
              label="Jurisdicción"
              placeholder="Ej: Nacional"
              error={errors.jurisdiccion?.message}
              {...register("jurisdiccion")}
            />

            <Select
              label="Tipo de procedimiento"
              placeholder="Seleccioná un tipo"
              options={TIPOS_PROCEDIMIENTO.map((t) => ({ value: t, label: t }))}
              error={errors.tipoProcedimiento?.message}
              {...register("tipoProcedimiento")}
            />

            <Select
              label="Rubro"
              placeholder="Seleccioná un rubro"
              options={RUBROS.map((r) => ({ value: r, label: r }))}
              error={errors.rubro?.message}
              {...register("rubro")}
            />

            <Textarea
              label="Objeto de contratación"
              placeholder="Describí el objeto de la contratación..."
              error={errors.objeto?.message}
              {...register("objeto")}
            />

            <Input
              label="Fecha de convocatoria"
              type="date"
              error={errors.fechaConvocatoria?.message}
              {...register("fechaConvocatoria")}
            />

            <Input
              label="Fecha/hora de apertura"
              type="datetime-local"
              error={errors.fechaApertura?.message}
              {...register("fechaApertura")}
            />

            <Input
              label="Presupuesto oficial (opcional)"
              type="number"
              placeholder="Ej: 1500000"
              error={errors.presupuestoOficial?.message}
              {...register("presupuestoOficial")}
            />

            <Input
              label="Criterio de adjudicación (opcional)"
              placeholder="Ej: Mejor relación precio-calidad"
              error={errors.criterioAdjudicacion?.message}
              {...register("criterioAdjudicacion")}
            />

            <FileUpload
              label="Pliego / Documento (PDF, máx. 10 MB)"
              onChange={setFileUpload}
            />

            {fileUpload.hash && (
              <input type="hidden" name="documentHash" value={fileUpload.hash} />
            )}
            {fileUpload.fileName && (
              <input type="hidden" name="documentName" value={fileUpload.fileName} />
            )}

            <Select
              label="Estado"
              placeholder="Seleccioná un estado"
              options={ESTADOS.map((e) => ({ value: e, label: e }))}
              error={errors.estado?.message}
              {...register("estado")}
            />

            <Input
              label="Fuente oficial URL (opcional)"
              type="url"
              placeholder="https://..."
              error={errors.fuenteUrl?.message}
              {...register("fuenteUrl")}
            />

            {serverError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {serverError}
              </p>
            )}

            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Publicar en Arkiv
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
