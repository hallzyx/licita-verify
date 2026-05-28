import { z } from "zod";

export const TIPOS_PROCEDIMIENTO = [
  "Licitación pública",
  "Licitación privada",
  "Contratación directa",
  "Concurso de precios",
  "Subasta",
] as const;

export const RUBROS = [
  "Obra pública",
  "Bienes",
  "Servicios",
  "Consultoría",
  "Salud",
  "Educación",
  "Tecnología",
] as const;

export const ESTADOS = [
  "Convocada",
  "En evaluación",
  "Adjudicada",
  "Desierta",
  "Cancelada",
  "En ejecución",
  "Finalizada",
] as const;

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const licitacionSchema = z.object({
  expediente: z
    .string()
    .min(1, "El número de expediente es obligatorio")
    .max(100),
  organismo: z
    .string()
    .min(1, "El organismo contratante es obligatorio")
    .max(200),
  jurisdiccion: z
    .string()
    .min(1, "La jurisdicción es obligatoria")
    .max(100),
  tipoProcedimiento: z.enum(TIPOS_PROCEDIMIENTO, {
    message: "Seleccioná un tipo de procedimiento",
  }),
  rubro: z.enum(RUBROS, {
    message: "Seleccioná un rubro",
  }),
  objeto: z
    .string()
    .min(10, "El objeto debe tener al menos 10 caracteres")
    .max(2000),
  fechaConvocatoria: z
    .string()
    .min(1, "La fecha de convocatoria es obligatoria")
    .refine(
      (val) => {
        const d = new Date(val);
        if (isNaN(d.getTime())) return false;
        return d.getTime() <= Date.now() + ONE_YEAR_MS;
      },
      { message: "La fecha de convocatoria no puede ser más de un año en el futuro" },
    ),
  fechaApertura: z
    .string()
    .min(1, "La fecha de apertura es obligatoria"),
  presupuestoOficial: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().positive("Debe ser un monto positivo").optional(),
  ),
  criterioAdjudicacion: z.string().max(500).optional(),
  estado: z.enum(ESTADOS, {
    message: "Seleccioná un estado",
  }),
  fuenteUrl: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
  // Passthrough fields (not validated, just passed through for Arkiv payload)
  documentHash: z.string().optional(),
  documentName: z.string().optional(),
}).refine(
  (data) => {
    if (!data.fechaConvocatoria || !data.fechaApertura) return true;
    const convocatoria = new Date(data.fechaConvocatoria).getTime();
    const apertura = new Date(data.fechaApertura).getTime();
    if (isNaN(convocatoria) || isNaN(apertura)) return true;
    return apertura > convocatoria;
  },
  {
    message: "La fecha de apertura debe ser posterior a la fecha de convocatoria",
    path: ["fechaApertura"],
  },
);

// ─── Machine values (for Arkiv on-chain storage) ────────────────────

export const TIPOS_PROCEDIMIENTO_MACHINE = [
  "licitacion_publica",
  "licitacion_privada",
  "contratacion_directa",
  "concurso_ofertas",
  "subasta",
] as const;

export const RUBROS_MACHINE = [
  "obra",
  "bienes",
  "servicios",
  "consultoria",
] as const;

export const ESTADOS_MACHINE = [
  "convocada",
  "evaluacion",
  "adjudicada",
  "desierta",
  "cancelada",
  "ejecucion",
  "finalizada",
] as const;

// ─── Display → Machine mapping ──────────────────────────────────────

/**
 * Maps form display values to machine values for Arkiv on-chain storage.
 * Uses index-based lookup since both arrays are in the same order.
 * Fields without a machine equivalent (extra rubros) keep the display value.
 */
export function toMachineValues(data: LicitacionFormValues) {
  const tipoIdx = TIPOS_PROCEDIMIENTO.indexOf(data.tipoProcedimiento);
  const rubroIdx = RUBROS.indexOf(data.rubro);
  const estadoIdx = ESTADOS.indexOf(data.estado);

  return {
    ...data,
    tipoProcedimiento:
      tipoIdx >= 0
        ? TIPOS_PROCEDIMIENTO_MACHINE[tipoIdx]
        : data.tipoProcedimiento,
    rubro:
      rubroIdx >= 0 && rubroIdx < RUBROS_MACHINE.length
        ? RUBROS_MACHINE[rubroIdx]
        : data.rubro,
    estado:
      estadoIdx >= 0
        ? ESTADOS_MACHINE[estadoIdx]
        : data.estado,
  };
}

export type LicitacionFormValues = z.infer<typeof licitacionSchema>;
