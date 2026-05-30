"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RUBROS, ESTADOS, TIPOS_PROCEDIMIENTO } from "@/lib/validacion";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FilterValues {
  rubro: string;
  estado: string;
  tipoProcedimiento: string;
  organismo: string;
  jurisdiccion: string;
  montoMin: string;
  montoMax: string;
}

const emptyFilters: FilterValues = {
  rubro: "",
  estado: "",
  tipoProcedimiento: "",
  organismo: "",
  jurisdiccion: "",
  montoMin: "",
  montoMax: "",
};

export function FilterPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const [filters, setFilters] = useState<FilterValues>(() => ({
    rubro: searchParams.get("rubro") || "",
    estado: searchParams.get("estado") || "",
    tipoProcedimiento: searchParams.get("tipoProcedimiento") || "",
    organismo: searchParams.get("organismo") || "",
    jurisdiccion: searchParams.get("jurisdiccion") || "",
    montoMin: searchParams.get("montoMin") || "",
    montoMax: searchParams.get("montoMax") || "",
  }));

  function set(key: keyof FilterValues, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function apply() {
    const params = new URLSearchParams();

    // Preserve existing q (NLQ) if present
    const existingQ = searchParams.get("q");
    if (existingQ) params.set("q", existingQ);

    // Add non-empty filter values
    for (const [key, value] of Object.entries(filters)) {
      if (value.trim()) params.set(key, value.trim());
    }

    router.push(`/manual?${params.toString()}`);
  }

  function clear() {
    setFilters(emptyFilters);
    router.push("/manual");
  }

  const hasActiveFilters = Object.values(filters).some((v) => v.trim());

  return (
    <div>
      {/* Filter toggle header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 font-body-md text-body-md text-primary transition-colors hover:bg-surface-container-low"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined">tune</span>
          Filtros
          {hasActiveFilters && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary-container font-label-sm text-label-sm text-on-secondary-container">
              {Object.values(filters).filter((v) => v.trim()).length}
            </span>
          )}
        </span>
        <span className={`material-symbols-outlined transition-transform ${open ? "rotate-180" : ""}`}>
          expand_more
        </span>
      </button>

      {/* Expanded filter fields */}
      {open && (
        <div className="border-t border-outline-variant px-4 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Rubro"
              placeholder="Todos los rubros"
              options={RUBROS.map((r) => ({ value: r, label: r }))}
              value={filters.rubro}
              onChange={(e) => set("rubro", e.target.value)}
            />
            <Select
              label="Estado"
              placeholder="Todos los estados"
              options={ESTADOS.map((e) => ({ value: e, label: e }))}
              value={filters.estado}
              onChange={(e) => set("estado", e.target.value)}
            />
            <Select
              label="Tipo de procedimiento"
              placeholder="Todos los tipos"
              options={TIPOS_PROCEDIMIENTO.map((t) => ({ value: t, label: t }))}
              value={filters.tipoProcedimiento}
              onChange={(e) => set("tipoProcedimiento", e.target.value)}
            />
            <Input
              label="Organismo"
              placeholder="Ej: Municipalidad de Salta"
              value={filters.organismo}
              onChange={(e) => set("organismo", e.target.value)}
            />
            <Input
              label="Jurisdicción"
              placeholder="Ej: Salta"
              value={filters.jurisdiccion}
              onChange={(e) => set("jurisdiccion", e.target.value)}
            />
            <Input
              label="Monto mínimo ($)"
              type="number"
              placeholder="Ej: 1000000"
              value={filters.montoMin}
              onChange={(e) => set("montoMin", e.target.value)}
            />
            <Input
              label="Monto máximo ($)"
              type="number"
              placeholder="Ej: 50000000"
              value={filters.montoMax}
              onChange={(e) => set("montoMax", e.target.value)}
            />
          </div>

          <div className="mt-4 flex gap-3">
            <Button size="sm" onClick={apply}>
              Aplicar filtros
            </Button>
            <Button variant="outline" size="sm" onClick={clear}>
              Limpiar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}