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
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          Filtros
          {hasActiveFilters && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
              {Object.values(filters).filter((v) => v.trim()).length}
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-4">
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
