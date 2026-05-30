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

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      {/* ── TopNavBar ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface-container-lowest">
        <div className="container flex h-16 items-center justify-between px-4 md:px-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined icon-fill text-3xl text-primary" aria-hidden="true">
              verified_user
            </span>
            <span className="font-headline-md text-headline-md font-bold text-primary">
              LicitaVerify
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link href="/" className="font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary">
              Inicio
            </Link>
            <Link href="/manual" className="border-b-2 border-primary pb-1 font-bold font-body-md text-body-md text-primary">
              Búsqueda
            </Link>
            <Link href="/chat" className="font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary">
              Chat IA
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/login"
              className="hidden items-center gap-2 rounded-full bg-primary px-6 py-2 font-label-sm text-label-sm text-on-primary transition-opacity hover:opacity-90 md:flex"
            >
              Acceder
            </Link>
            <button className="text-on-surface-variant md:hidden" aria-label="Menú">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Content ────────────────────────────────────────── */}
      <main className="container flex-grow px-4 py-12 md:px-16">
        {/* Header & Description */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-display-lg font-display-lg mb-4 text-primary">
            Transparencia a tu alcance
          </h1>
          <p className="text-body-lg font-body-lg max-w-3xl text-on-surface-variant">
            Explora las licitaciones públicas de forma sencilla. Filtrá por estado, rubro, organismo y más para encontrar la información que necesitás.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="ambient-shadow mb-12 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <FilterPanel />
        </div>

        {/* Content states */}
        {state.status === "idle" && (
          <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest py-16 text-center">
            <span className="material-symbols-outlined mb-4 text-5xl text-outline">filter_list</span>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Seleccioná filtros y presioná &quot;Aplicar filtros&quot; para buscar
            </p>
          </div>
        )}

        {state.status === "loading" && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="ambient-shadow animate-pulse rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
                <div className="mb-4 h-4 w-24 rounded bg-surface-container-high" />
                <div className="mb-2 h-5 w-3/4 rounded bg-surface-container-high" />
                <div className="mb-2 h-4 w-1/2 rounded bg-surface-container-high" />
                <div className="h-4 w-1/3 rounded bg-surface-container-high" />
              </div>
            ))}
          </div>
        )}

        {state.status === "error" && (
          <div className="rounded-xl border border-red-200 bg-error-container p-6">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-on-error-container">error</span>
              <div>
                <p className="font-body-md text-body-md text-on-error-container">{state.message}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => doSearch()}>
                  Reintentar
                </Button>
              </div>
            </div>
          </div>
        )}

        {state.status === "results" && (
          <>
            {state.results.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest py-16 text-center">
                <span className="material-symbols-outlined mb-4 text-5xl text-outline">search_off</span>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  No se encontraron resultados
                </p>
                <p className="mt-2 font-label-sm text-label-sm text-outline">
                  Probá ampliar los filtros
                </p>
              </div>
            ) : (
              <>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {state.total} resultado{state.total !== 1 ? "s" : ""}
                </p>
                <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {state.results.map((entity) => (
                    <ResultCard key={entity.entityKey} entity={entity} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-outline-variant bg-surface-container">
        <div className="container flex flex-col items-center justify-between gap-6 px-4 py-12 md:flex-row md:px-16 md:text-left">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined icon-fill text-2xl text-primary" aria-hidden="true">verified_user</span>
              <span className="font-headline-md text-headline-md font-bold text-primary">LicitaVerify</span>
            </div>
            <div className="font-body-md text-body-md text-on-surface-variant">
              © {new Date().getFullYear()} LicitaVerify. Portal de Transparencia Ciudadana.
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <a href="#" className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary hover:underline">Privacidad</a>
            <a href="#" className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary hover:underline">Términos</a>
            <a href="#" className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary hover:underline">Contacto</a>
            <a href="#" className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary hover:underline">Ayuda</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────

export default function ManualPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-container-high border-t-primary" />
        </div>
      }
    >
      <ManualContent />
    </Suspense>
  );
}