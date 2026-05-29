"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChatBot } from "@/components/ChatBot";
import { RUBROS, ESTADOS, TIPOS_PROCEDIMIENTO } from "@/lib/validacion";

type Mode = "select" | "manual" | "ia";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("select");

  const [manualFilters, setManualFilters] = useState({
    rubro: "",
    estado: "",
    tipoProcedimiento: "",
    organismo: "",
    jurisdiccion: "",
    montoMin: "",
    montoMax: "",
  });

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

      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            Buscá licitaciones públicas verificables
          </h2>
          <p className="text-sm text-gray-500">
            Consultá contrataciones públicas registradas en Arkiv
          </p>
        </div>

        {/* ── Mode selector ────────────────────────────────── */}
        {mode === "select" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("manual")}
              className="group rounded-xl border-2 border-gray-200 bg-white p-8 text-center transition-all hover:border-blue-400 hover:shadow-md"
            >
              <div className="mb-3 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-2xl group-hover:bg-blue-50">
                  📋
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Búsqueda manual</h3>
              <p className="mt-1 text-sm text-gray-500">
                Filtros por rubro, estado, tipo, organismo y monto
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode("ia")}
              className="group rounded-xl border-2 border-gray-200 bg-white p-8 text-center transition-all hover:border-blue-400 hover:shadow-md"
            >
              <div className="mb-3 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-2xl group-hover:bg-blue-50">
                  🤖
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Preguntale a la IA</h3>
              <p className="mt-1 text-sm text-gray-500">
                Describí lo que buscás con tus propias palabras
              </p>
            </button>
          </div>
        )}

        {/* ── Búsqueda manual ───────────────────────────────── */}
        {mode === "manual" && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                📋 Búsqueda manual
              </h3>
              <button
                type="button"
                onClick={() => setMode("select")}
                className="text-xs text-gray-400 underline hover:text-gray-600"
              >
                Cambiar modo
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                label="Jurisdicción"
                placeholder="Ej: Salta"
                value={manualFilters.jurisdiccion}
                onChange={(e) => setFilter("jurisdiccion", e.target.value)}
              />
              <Input
                label="Monto mínimo ($)"
                type="number"
                placeholder="Ej: 1000000"
                value={manualFilters.montoMin}
                onChange={(e) => setFilter("montoMin", e.target.value)}
              />
              <Input
                label="Monto máximo ($)"
                type="number"
                placeholder="Ej: 50000000"
                value={manualFilters.montoMax}
                onChange={(e) => setFilter("montoMax", e.target.value)}
              />
            </div>

            <Button className="mt-6 w-full" onClick={handleManualSearch}>
              Buscar
            </Button>
          </div>
        )}

        {/* ── Chat IA ────────────────────────────────────────── */}
        {mode === "ia" && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                🤖 Preguntale a la IA
              </h3>
              <button
                type="button"
                onClick={() => setMode("select")}
                className="text-xs text-gray-400 underline hover:text-gray-600"
              >
                Cambiar modo
              </button>
            </div>
            <ChatBot />
          </div>
        )}
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
