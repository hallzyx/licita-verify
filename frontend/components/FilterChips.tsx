import type { ArkivFilters, AmbiguousQuery } from "@/lib/ai-search";
import { Button } from "@/components/ui/button";

// ─── Display labels for filter keys ───────────────────────────────────

const FILTER_LABELS: Record<string, string> = {
  rubro: "Rubro",
  organismo: "Organismo",
  jurisdiccion: "Jurisdicción",
  tipoProcedimiento: "Tipo",
  estado: "Estado",
  keyword: "Palabra clave",
  montoMin: "Monto mínimo",
  montoMax: "Monto máximo",
};

// ─── Types ────────────────────────────────────────────────────────────

type Chip = { label: string; key: string };

interface FilterChipsProps {
  filters: ArkivFilters;
}

interface AmbiguousChipsProps {
  ambiguous: AmbiguousQuery;
  onSuggestion?: (suggestion: string) => void;
}

/**
 * Displays a row of chips representing each active filter from the
 * interpreted NL query. Display-only in MVP — no remove action.
 */
export function FilterChips({ filters }: FilterChipsProps) {
  const chips: Chip[] = [];

  for (const [key, raw] of Object.entries(filters)) {
    if (!raw) continue;
    const label = FILTER_LABELS[key] || key;
    if (key === "montoMin" && typeof raw === "number") {
      chips.push({
        key,
        label: `${label}: ${new Intl.NumberFormat("es-AR").format(raw)}`,
      });
    } else if (key === "montoMax" && typeof raw === "number") {
      chips.push({
        key,
        label: `${label}: ${new Intl.NumberFormat("es-AR").format(raw)}`,
      });
    } else if (key === "keyword" && typeof raw === "string") {
      chips.push({ key, label: `${label}: ${raw}` });
    } else if (Array.isArray(raw) && raw.length > 0) {
      chips.push({ key, label: `${label}: ${raw.join(", ")}` });
    }
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Filtros activos">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

/**
 * If DeepSeek returned ambiguous, show clarification + suggestion buttons.
 */
export function AmbiguousChips({
  ambiguous,
  onSuggestion,
}: AmbiguousChipsProps) {
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <p className="text-sm font-medium text-yellow-800">
        {ambiguous.clarification}
      </p>
      {ambiguous.suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {ambiguous.suggestions.map((s, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => onSuggestion?.(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
