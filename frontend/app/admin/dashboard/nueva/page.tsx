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
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { AiExtractModal, type AiExtractResult } from "@/components/AiExtractModal";


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
  const [showModal, setShowModal] = useState(false);
  const [aiFields, setAiFields] = useState<Record<string, "alta" | "media" | "baja"> | null>(null);

  // @hookform/resolvers v5 + Zod v4 have a known type incompatibility.
  // The cast bridges the schema inference gap.
  const typedResolver = zodResolver(licitacionSchema) as unknown as Resolver<LicitacionFormValues>;

  const {
    register,
    handleSubmit,
    setValue,
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

  // ── AI field mapping ──────────────────────────────────────────────────

  const AI_FIELD_MAP: Record<string, keyof LicitacionFormValues> = {
    expediente: "expediente",
    organismo: "organismo",
    jurisdiccion: "jurisdiccion",
    tipoProcedimiento: "tipoProcedimiento",
    rubro: "rubro",
    objeto: "objeto",
    fechaConvocatoria: "fechaConvocatoria",
    fechaApertura: "fechaApertura",
    presupuestoOficial: "presupuestoOficial",
    criterioAdjudicacion: "criterioAdjudicacion",
    estado: "estado",
    fuenteUrl: "fuenteUrl",
  };

  function handleAiComplete(result: AiExtractResult) {
    // Pre-fill form fields
    const mapped: Record<string, "alta" | "media" | "baja"> = {};
    for (const [key, field] of Object.entries(result.fields)) {
      const formKey = AI_FIELD_MAP[key];
      if (formKey && field.value !== null && field.value !== undefined && field.value !== "") {
        setValue(formKey, field.value as LicitacionFormValues[keyof LicitacionFormValues], {
          shouldValidate: true,
        });
        mapped[key] = field.confidence;
      }
    }
    setAiFields(mapped);

    // Also fill the FileUpload slot with the scanned document
    setFileUpload({
      file: result.file,
      hash: result.hash,
      fileName: result.fileName,
    });

    setShowModal(false);
  }

  // ── Submit ─────────────────────────────────────────────────────────────

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

  // ── Helpers ────────────────────────────────────────────────────────────

  function renderLabelWithBadge(
    htmlFor: string,
    label: string,
    fieldKey: string,
  ) {
    const confidence = aiFields?.[fieldKey] as "alta" | "media" | "baja" | undefined;
    return (
      <div className="flex items-center gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        {confidence && <ConfidenceBadge confidence={confidence} />}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

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

        <Card
          title="Nueva licitación"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowModal(true)}
            >
              🤖 Auto-llenado IA
            </Button>
          }
        >
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {/* ── Fields with AI badge support ──────────────────── */}

            <div className="flex flex-col gap-1">
              {renderLabelWithBadge("expediente", "Número de expediente", "expediente")}
              <Input
                id="expediente"
                placeholder="Ej: EX-2024-001"
                error={errors.expediente?.message}
                {...register("expediente")}
              />
            </div>

            <div className="flex flex-col gap-1">
              {renderLabelWithBadge("organismo", "Organismo contratante", "organismo")}
              <Input
                id="organismo"
                placeholder="Ej: Ministerio de Obras Públicas"
                error={errors.organismo?.message}
                {...register("organismo")}
              />
            </div>

            <div className="flex flex-col gap-1">
              {renderLabelWithBadge("jurisdiccion", "Jurisdicción", "jurisdiccion")}
              <Input
                id="jurisdiccion"
                placeholder="Ej: Nacional"
                error={errors.jurisdiccion?.message}
                {...register("jurisdiccion")}
              />
            </div>

            <div className="flex flex-col gap-1">
              {renderLabelWithBadge("tipo-procedimiento", "Tipo de procedimiento", "tipoProcedimiento")}
              <Select
                id="tipo-procedimiento"
                placeholder="Seleccioná un tipo"
                options={TIPOS_PROCEDIMIENTO.map((t) => ({ value: t, label: t }))}
                error={errors.tipoProcedimiento?.message}
                {...register("tipoProcedimiento")}
              />
            </div>

            <div className="flex flex-col gap-1">
              {renderLabelWithBadge("rubro", "Rubro", "rubro")}
              <Select
                id="rubro"
                placeholder="Seleccioná un rubro"
                options={RUBROS.map((r) => ({ value: r, label: r }))}
                error={errors.rubro?.message}
                {...register("rubro")}
              />
            </div>

            <div className="flex flex-col gap-1">
              {renderLabelWithBadge("objeto", "Objeto de contratación", "objeto")}
              <Textarea
                id="objeto"
                placeholder="Describí el objeto de la contratación..."
                error={errors.objeto?.message}
                {...register("objeto")}
              />
            </div>

            <div className="flex flex-col gap-1">
              {renderLabelWithBadge("fecha-convocatoria", "Fecha de convocatoria", "fechaConvocatoria")}
              <Input
                id="fecha-convocatoria"
                type="date"
                error={errors.fechaConvocatoria?.message}
                {...register("fechaConvocatoria")}
              />
            </div>

            <div className="flex flex-col gap-1">
              {renderLabelWithBadge("fecha-apertura", "Fecha/hora de apertura", "fechaApertura")}
              <Input
                id="fecha-apertura"
                type="datetime-local"
                error={errors.fechaApertura?.message}
                {...register("fechaApertura")}
              />
            </div>

            <div className="flex flex-col gap-1">
              {renderLabelWithBadge("presupuesto-oficial", "Presupuesto oficial (opcional)", "presupuestoOficial")}
              <Input
                id="presupuesto-oficial"
                type="number"
                placeholder="Ej: 1500000"
                error={errors.presupuestoOficial?.message}
                {...register("presupuestoOficial")}
              />
            </div>

            {/* No AI badge for criterioAdjudicacion */}
            <Input
              label="Criterio de adjudicación (opcional)"
              placeholder="Ej: Mejor relación precio-calidad"
              error={errors.criterioAdjudicacion?.message}
              {...register("criterioAdjudicacion")}
            />

            <FileUpload
              label="Pliego / Documento (PDF, JPG o PNG, máx. 10 MB)"
              value={fileUpload}
              onChange={setFileUpload}
            />

            {fileUpload.hash && (
              <input type="hidden" name="documentHash" value={fileUpload.hash} />
            )}
            {fileUpload.fileName && (
              <input type="hidden" name="documentName" value={fileUpload.fileName} />
            )}

            <div className="flex flex-col gap-1">
              {renderLabelWithBadge("estado", "Estado", "estado")}
              <Select
                id="estado"
                placeholder="Seleccioná un estado"
                options={ESTADOS.map((e) => ({ value: e, label: e }))}
                error={errors.estado?.message}
                {...register("estado")}
              />
            </div>

            {/* No AI badge for fuenteUrl */}
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

      {/* ── AI Extraction Modal ─────────────────────────────────── */}
      {showModal && (
        <AiExtractModal
          onComplete={handleAiComplete}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
