"use client";

import { useState } from "react";
import type { ArkivFilters } from "@/lib/ai-search";

interface QueryTranslatorProps {
  /** The original NL query the user typed */
  originalQuery: string;
  /** The structured ArkivFilters that were extracted */
  filters: ArkivFilters;
}

/**
 * Collapsible panel showing the original NL query and the structured
 * Arkiv filters it produced.
 */
export function QueryTranslator({
  originalQuery,
  filters,
}: QueryTranslatorProps) {
  const [open, setOpen] = useState(false);

  const hasFilters = Object.values(filters).some(
    (v) => v != null && (Array.isArray(v) ? v.length > 0 : true),
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        <span>
          {open ? "Ocultar consulta ejecutada" : "Ver consulta ejecutada"}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3">
          {/* Original NL query */}
          <div>
            <p className="mb-1 text-xs font-medium text-gray-400">
              Consulta original
            </p>
            <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700 italic">
              &ldquo;{originalQuery}&rdquo;
            </p>
          </div>

          {/* Structured filters */}
          {hasFilters && (
            <div>
              <p className="mb-1 text-xs font-medium text-gray-400">
                Filtros estructurados
              </p>
              <div className="rounded-md bg-gray-50 px-3 py-2">
                <pre className="overflow-x-auto text-xs text-gray-600 whitespace-pre-wrap">
                  {formatFilters(filters)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatFilters(filters: ArkivFilters): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(filters)) {
    if (value == null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "string" && !value) continue;

    if (key === "montoMin") {
      lines.push(`presupuestoOficial >= ${Number(value).toLocaleString("es-AR")}`);
    } else if (key === "montoMax") {
      lines.push(`presupuestoOficial <= ${Number(value).toLocaleString("es-AR")}`);
    } else if (key === "keyword") {
      lines.push(`texto contiene "${value}"`);
    } else if (Array.isArray(value)) {
      lines.push(`${key} = ${value.join(", ")}`);
    }
  }
  return lines.join("\n");
}
