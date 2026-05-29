"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RUBROS, ESTADOS, TIPOS_PROCEDIMIENTO } from "@/lib/validacion";

const EXAMPLE_QUERIES = [
  "Mostrame obras públicas en Salta",
  "Licitaciones mayores a 100 millones",
  "Contrataciones adjudicadas este mes",
  "Obras de plazas y veredas",
];

export default function HomePage() {
  const router = useRouter();
  const [manualFilters, setManualFilters] = useState({
    rubro: "",
    estado: "",
    tipoProcedimiento: "",
    organismo: "",
    jurisdiccion: "",
    montoMin: "",
    montoMax: "",
  });

  function handleExampleClick(query: string) {
    router.push(`/buscar?q=${encodeURIComponent(query)}`);
  }

  function handleManualSearch() {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(manualFilters)) {
      if (value.trim()) params.set(key, value.trim());
    }
    router.push(`/buscar?${params.toString()}`);
  }

  function setFilter(key: string, value: string) {
    setManualFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">LicitaVerify</h1>
          <Link
            href="/admin/login"
            className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            Admin
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            Buscá licitaciones públicas verificables
          </h2>
          <p className="text-sm text-gray-500">
            Consultá contrataciones públicas registradas en Arkiv
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* ── Búsqueda manual ────────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              Búsqueda manual
            </h3>

            <div className="space-y-3">
              <Select
                label="Rubro"
                placeholder="Todos los rubros"
                options={RUBROS.map((r) => ({ value: r, label: r }))}
                value={manualFilters.rubro}
                onChange={(e) => setFilter("rubro", e.target.value)}
              />
              <Select
                label="Estado"
                placeholder="Todos los estados"
                options={ESTADOS.map((e) => ({ value: e, label: e }))}
                value={manualFilters.estado}
                onChange={(e) => setFilter("estado", e.target.value)}
              />
              <Select
                label="Tipo de procedimiento"
                placeholder="Todos los tipos"
                options={TIPOS_PROCEDIMIENTO.map((t) => ({ value: t, label: t }))}
                value={manualFilters.tipoProcedimiento}
                onChange={(e) => setFilter("tipoProcedimiento", e.target.value)}
              />
              <Input
                label="Organismo"
                placeholder="Ej: Municipalidad de Salta"
                value={manualFilters.organismo}
                onChange={(e) => setFilter("organismo", e.target.value)}
              />
              <Input
                label="Monto mínimo ($)"
                type="number"
                placeholder="Ej: 1000000"
                value={manualFilters.montoMin}
                onChange={(e) => setFilter("montoMin", e.target.value)}
              />
            </div>

            <Button className="mt-4 w-full" onClick={handleManualSearch}>
              Buscar
            </Button>
          </div>

          {/* ── Preguntale a la IA ─────────────────────────────── */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Preguntale a la IA
            </h3>

            <p className="mb-4 text-xs text-gray-400">
              Describí lo que buscás con tus propias palabras
            </p>

            <SearchBar large />

            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-400">
                Ejemplos:
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    onClick={() => handleExampleClick(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-4 text-center">
        <Link
          href="/admin/login"
          className="text-xs text-gray-400 transition-colors hover:text-gray-600"
        >
          Admin
        </Link>
      </footer>
    </div>
  );
}
