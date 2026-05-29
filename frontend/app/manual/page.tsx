"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ResultCard, type ResultCardEntity } from "@/components/ResultCard";
import { FilterPanel } from "@/components/FilterPanel";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────

type PageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "results"; results: ResultCardEntity[]; total: number };

// ─── Inner component ──────────────────────────────────────────────────

function ManualContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filterParamKeys = [
    "rubro", "estado", "tipoProcedimiento",
    "organismo", "jurisdiccion", "montoMin", "montoMax",
  ];

  const [state, setState] = useState<PageState>({ status: "idle" });
  const fetchedRef = useRef("");

  const queryKey = filterParamKeys
    .map((k) => `${k}=${searchParams.get(k) || ""}`)
    .join("&");

  const doSearch = useCallback(async () => {
    if (!queryKey) {
      setState({ status: "idle" });
      return;
    }

    fetchedRef.current = queryKey;
    setState({ status: "loading" });

    try {
      const params = new URLSearchParams();
      for (const key of filterParamKeys) {
        const val = searchParams.get(key);
        if (val) params.set(key, val);
      }

      const res = await fetch(`/api/public/licitaciones?${params.toString()}`);
      if (fetchedRef.current !== queryKey) return;

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState({ status: "error", message: data.error || "Error al buscar en Arkiv" });
        return;
      }

      const data = await res.json();
      if (fetchedRef.current !== queryKey) return;

      const results: ResultCardEntity[] = (data.entities || []).map(
        (r: Record<string, unknown>) => ({
          entityKey: r.entityKey as string,
          attributes: (r.attributes || {}) as Record<string, string | number>,
          payload: (r.payload || null) as Record<string, unknown> | null,
        }),
      );

      setState({ status: "results", results, total: results.length });
    } catch {
      if (fetchedRef.current !== queryKey) return;
      setState({ status: "error", message: "Error al conectar con el servidor." });
    }
  }, [queryKey, searchParams]);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  const hasAnyFilter = filterParamKeys.some((k) => searchParams.get(k));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            LicitaVerify
          </Link>
          <Link
            href="/admin/login"
            className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6">
          <FilterPanel />
        </div>

        {state.status === "idle" && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-gray-500">
              Seleccioná filtros y presioná "Aplicar filtros" para buscar
            </p>
          </div>
        )}

        {state.status === "loading" && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-3 h-4 w-24 rounded bg-gray-200" />
                <div className="mb-2 h-5 w-3/4 rounded bg-gray-200" />
                <div className="mb-2 h-4 w-1/2 rounded bg-gray-200" />
                <div className="h-4 w-1/3 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        )}

        {state.status === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">{state.message}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => doSearch()}>
              Reintentar
            </Button>
          </div>
        )}

        {state.status === "results" && (
          <>
            {state.results.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
                <p className="text-gray-500">No se encontraron resultados</p>
                <p className="mt-2 text-xs text-gray-400">
                  Probá ampliar los filtros
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400">
                  {state.total} resultado{state.total !== 1 ? "s" : ""}
                </p>
                {state.results.map((entity) => (
                  <ResultCard key={entity.entityKey} entity={entity} />
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-600">
            ← Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────

export default function ManualPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        </div>
      }
    >
      <ManualContent />
    </Suspense>
  );
}
