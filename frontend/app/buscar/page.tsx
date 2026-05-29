"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { ResultCard, type ResultCardEntity } from "@/components/ResultCard";
import { FilterChips, AmbiguousChips } from "@/components/FilterChips";
import { QueryTranslator } from "@/components/QueryTranslator";
import { Button } from "@/components/ui/button";
import type { ArkivFilters, AmbiguousQuery } from "@/lib/ai-search";

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

// ─── Inner component (needs Suspense for useSearchParams) ─────────────

function BuscarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  const [state, setState] = useState<PageState>({ status: "idle" });

  useEffect(() => {
    if (!q.trim()) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    async function search() {
      try {
        const res = await fetch("/api/ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q.trim() }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message =
            data.error || "No pudimos interpretar tu consulta. Probá reformularla.";
          if (!cancelled) setState({ status: "error", message });
          return;
        }

        const data = await res.json();

        // Handle ambiguous
        if (data.interpretation?.ambiguous) {
          if (!cancelled)
            setState({
              status: "ambiguous",
              ambiguous: data.interpretation,
              originalQuery: q.trim(),
            });
          return;
        }

        // Map results to entity shape
        const results: ResultCardEntity[] = (data.results || []).map(
          (r: Record<string, unknown>) => ({
            entityKey: r.entityKey as string,
            attributes: (r.attributes || {}) as Record<string, string | number>,
            payload: (r.payload || null) as Record<string, unknown> | null,
          }),
        );

        if (!cancelled)
          setState({
            status: "results",
            filters: data.arkivFilters || {},
            originalQuery: q.trim(),
            results,
          });
      } catch {
        if (!cancelled)
          setState({
            status: "error",
            message:
              "No pudimos interpretar tu consulta. Probá reformularla.",
          });
      }
    }

    search();
    return () => {
      cancelled = true;
    };
  }, [q]);

  function handleSuggestion(suggestion: string) {
    router.push(`/buscar?q=${encodeURIComponent(suggestion)}`);
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="text-xl font-bold text-gray-900"
          >
            LicitaVerify
          </Link>
          <Link
            href="/admin/login"
            className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Search bar */}
        <div className="mb-6">
          <SearchBar initialQuery={q} />
        </div>

        {/* States */}
        {state.status === "idle" && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-gray-500">
              Escribí una consulta para buscar
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
              onClick={() => window.location.reload()}
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
            <QueryTranslator
              originalQuery={state.originalQuery}
              filters={{}}
            />
          </div>
        )}

        {state.status === "results" && (
          <div className="space-y-6">
            {/* Filter chips */}
            <FilterChips filters={state.filters} />

            {/* Results list */}
            {state.results.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
                <p className="text-gray-500">
                  No se encontraron resultados
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Probá ampliar los filtros o reformular la consulta
                </p>
                {state.filters && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/")}
                    >
                      Nueva búsqueda
                    </Button>
                  </div>
                )}
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

            {/* Query translator */}
            <QueryTranslator
              originalQuery={state.originalQuery}
              filters={state.filters}
            />
          </div>
        )}

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
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
