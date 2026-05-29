"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { ResultCard, type ResultCardEntity } from "@/components/ResultCard";
import { FilterChips, AmbiguousChips } from "@/components/FilterChips";
import { QueryTranslator } from "@/components/QueryTranslator";
import { FilterPanel } from "@/components/FilterPanel";
import { Button } from "@/components/ui/button";
import type { ArkivFilters, AmbiguousQuery } from "@/lib/ai-search";
import { RUBROS, ESTADOS, TIPOS_PROCEDIMIENTO } from "@/lib/validacion";

// ─── Types ────────────────────────────────────────────────────────────

type PageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ambiguous"; ambiguous: AmbiguousQuery; originalQuery: string }
  | {
      status: "results";
      filters: ArkivFilters;
      originalQuery: string;
      results: ResultCardEntity[];
    };

// ─── Display lookup (machine → display) ───────────────────────────────

const DISPLAY_VALUES: Record<string, readonly string[]> = {
  rubro: RUBROS as unknown as string[],
  estado: ESTADOS as unknown as string[],
  tipoProcedimiento: TIPOS_PROCEDIMIENTO as unknown as string[],
};

// ─── Inner component (needs Suspense for useSearchParams) ─────────────

function BuscarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  const [state, setState] = useState<PageState>({ status: "idle" });
  const fetchedRef = useRef("");

  // Build a key that includes both NLQ and filter params to detect changes
  const filterParamKeys = ["rubro", "estado", "tipoProcedimiento", "organismo", "jurisdiccion", "montoMin", "montoMax"];
  const filterKey = filterParamKeys
    .map((k) => `${k}=${searchParams.get(k) || ""}`)
    .join("&");
  const queryKey = q ? `q=${q}` : "";
  const fetchKey = queryKey || filterKey;

  const doSearch = useCallback(async () => {
    if (!fetchKey) {
      setState({ status: "idle" });
      return;
    }

    fetchedRef.current = fetchKey;
    setState({ status: "loading" });

    // ── Mode 1: NLQ search (q param present) ──────────────────────
    if (q.trim()) {
      try {
        const res = await fetch("/api/ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q.trim() }),
        });

        if (fetchedRef.current !== fetchKey) return;

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = data.error || "No pudimos interpretar tu consulta. Probá reformularla.";
          setState({ status: "error", message });
          return;
        }

        const data = await res.json();

        if (fetchedRef.current !== fetchKey) return;

        // Handle ambiguous
        if (data.interpretation?.ambiguous) {
          setState({
            status: "ambiguous",
            ambiguous: data.interpretation,
            originalQuery: q.trim(),
          });
          return;
        }

        // Map results
        const results: ResultCardEntity[] = (data.results || []).map(
          (r: Record<string, unknown>) => ({
            entityKey: r.entityKey as string,
            attributes: (r.attributes || {}) as Record<string, string | number>,
            payload: (r.payload || null) as Record<string, unknown> | null,
          }),
        );

        setState({
          status: "results",
          filters: data.arkivFilters || {},
          originalQuery: q.trim(),
          results,
        });
      } catch {
        if (fetchedRef.current !== fetchKey) return;
        setState({
          status: "error",
          message: "No pudimos interpretar tu consulta. Probá reformularla.",
        });
      }
      return;
    }

    // ── Mode 2: Traditional filter search (no q) ──────────────────
    try {
      const params = new URLSearchParams();
      for (const key of filterParamKeys) {
        const val = searchParams.get(key);
        if (val) params.set(key, val);
      }

      const res = await fetch(`/api/public/licitaciones?${params.toString()}`);
      if (fetchedRef.current !== fetchKey) return;

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState({ status: "error", message: data.error || "Error al buscar en Arkiv" });
        return;
      }

      const data = await res.json();
      if (fetchedRef.current !== fetchKey) return;

      const results: ResultCardEntity[] = (data.entities || []).map(
        (r: Record<string, unknown>) => ({
          entityKey: r.entityKey as string,
          attributes: (r.attributes || {}) as Record<string, string | number>,
          payload: (r.payload || null) as Record<string, unknown> | null,
        }),
      );

      // Build filters object for display from URL params
      const filters: ArkivFilters = {};
      for (const key of filterParamKeys) {
        const val = searchParams.get(key);
        if (!val) continue;

        if (key === "montoMin" || key === "montoMax") {
          (filters as Record<string, unknown>)[key] = Number(val);
        } else {
          (filters as Record<string, unknown>)[key] = [val];
        }
      }

      setState({
        status: "results",
        filters,
        originalQuery: "",
        results,
      });
    } catch {
      if (fetchedRef.current !== fetchKey) return;
      setState({
        status: "error",
        message: "Error al conectar con el servidor. Intente más tarde.",
      });
    }
  }, [fetchKey, q, searchParams]);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  function handleSuggestion(suggestion: string) {
    router.push(`/buscar?q=${encodeURIComponent(suggestion)}`);
  }

  const hasFilterParams = filterParamKeys.some((k) => searchParams.get(k));

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
        {/* Search bar */}
        <div className="mb-4">
          <SearchBar initialQuery={q} />
        </div>

        {/* Filter panel */}
        <div className="mb-6">
          <FilterPanel />
        </div>

        {/* States */}
        {state.status === "idle" && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-gray-500">
              Escribí una consulta o usá los filtros para buscar licitaciones
            </p>
          </div>
        )}

        {state.status === "loading" && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-gray-200 bg-white p-5"
              >
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
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => doSearch()}
            >
              Reintentar
            </Button>
          </div>
        )}

        {state.status === "ambiguous" && (
          <div className="space-y-6">
            <AmbiguousChips
              ambiguous={state.ambiguous}
              onSuggestion={handleSuggestion}
            />
            <QueryTranslator originalQuery={state.originalQuery} filters={{}} />
          </div>
        )}

        {state.status === "results" && (
          <div className="space-y-6">
            {/* Filter chips */}
            {Object.keys(state.filters).length > 0 && (
              <FilterChips filters={state.filters} />
            )}

            {/* Results or empty state */}
            {state.results.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
                <p className="text-gray-500">No se encontraron resultados</p>
                <p className="mt-2 text-xs text-gray-400">
                  Probá ampliar los filtros o reformular la consulta
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => router.push("/")}>
                    Nueva búsqueda
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400">
                  {state.results.length} resultado
                  {state.results.length !== 1 ? "s" : ""}
                </p>
                {state.results.map((entity) => (
                  <ResultCard key={entity.entityKey} entity={entity} />
                ))}
              </div>
            )}

            {/* Query translator (only for NLQ) */}
            {state.originalQuery && (
              <QueryTranslator
                originalQuery={state.originalQuery}
                filters={state.filters}
              />
            )}
          </div>
        )}

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            ← Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}

// ─── Page wrapper with Suspense ───────────────────────────────────────

export default function BuscarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        </div>
      }
    >
      <BuscarContent />
    </Suspense>
  );
}
