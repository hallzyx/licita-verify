"use client";

import { useState, useRef, useEffect } from "react";
import { ResultCard, type ResultCardEntity } from "@/components/ResultCard";
import { FilterChips } from "@/components/FilterChips";
import { QueryTranslator } from "@/components/QueryTranslator";
import type { ArkivFilters, AmbiguousQuery } from "@/lib/ai-search";

// ─── Types ────────────────────────────────────────────────────────────

type ChatMessage =
  | { role: "bot"; text: string }
  | { role: "user"; text: string }
  | {
      role: "results";
      results: ResultCardEntity[];
      filters: ArkivFilters;
      originalQuery: string;
    }
  | {
      role: "ambiguous";
      ambiguous: AmbiguousQuery;
      originalQuery: string;
    }
  | { role: "error"; text: string };

// ─── ChatBot ──────────────────────────────────────────────────────────

const EXAMPLE_QUERIES = [
  "Mostrame obras públicas en Salta",
  "Licitaciones mayores a 100 millones",
  "Contrataciones adjudicadas este mes",
  "Obras de plazas y veredas",
];

export function ChatBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Hola! Decime qué licitaciones estás buscando y te ayudo a encontrarlas.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(query: string) {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          { role: "error", text: data.error || "No pude interpretar tu consulta. Probá reformularla." },
        ]);
        return;
      }

      const data = await res.json();

      if (data.interpretation?.ambiguous) {
        setMessages((prev) => [
          ...prev,
          { role: "ambiguous", ambiguous: data.interpretation, originalQuery: trimmed },
        ]);
        return;
      }

      const results: ResultCardEntity[] = (data.results || []).map(
        (r: Record<string, unknown>) => ({
          entityKey: r.entityKey as string,
          attributes: (r.attributes || {}) as Record<string, string | number>,
          payload: (r.payload || null) as Record<string, unknown> | null,
        }),
      );

      if (results.length === 0) {
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: "No encontré resultados para esa consulta. Probá ampliar la búsqueda." },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "results",
          results,
          filters: data.arkivFilters || {},
          originalQuery: trimmed,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "error", text: "Hubo un error al buscar. Intentalo de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestion(suggestion: string) {
    handleSend(suggestion);
  }

  return (
    <div className="ambient-shadow flex h-[716px] min-h-[600px] flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      {/* ── Chat History ──────────────────────────────────────── */}
      <div className="hide-scrollbar flex flex-1 flex-col gap-8 overflow-y-auto p-6 md:p-8 scroll-smooth">
        {messages.map((msg, i) => {
          if (msg.role === "bot" || msg.role === "error") {
            return (
              <div key={i} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container">
                  <span className="material-symbols-outlined text-primary">robot_2</span>
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface-container-low p-4 font-body-md text-on-surface">
                  {msg.role === "error" ? (
                    <p className="text-on-error-container">{msg.text}</p>
                  ) : (
                    <p>{msg.text}</p>
                  )}
                </div>
              </div>
            );
          }

          if (msg.role === "user") {
            return (
              <div key={i} className="flex items-start gap-4 justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary p-4 font-body-md text-on-primary shadow-sm">
                  {msg.text}
                </div>
              </div>
            );
          }

          if (msg.role === "results") {
            const count = msg.results.length;
            return (
              <div key={i} className="flex w-full max-w-[85%] flex-col gap-3 items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container">
                  <span className="material-symbols-outlined text-primary">robot_2</span>
                </div>
                <div className="flex flex-col gap-3 w-full">
                  <p className="font-body-md text-on-surface">
                    Encontré <span className="font-bold">{count} resultado{count !== 1 ? "s" : ""}</span>:
                  </p>
                  <FilterChips filters={msg.filters} />
                  <div className="space-y-2">
                    {msg.results.map((entity) => (
                      <ResultCard key={entity.entityKey} entity={entity} />
                    ))}
                  </div>
                  <QueryTranslator
                    originalQuery={msg.originalQuery}
                    filters={msg.filters}
                  />
                </div>
              </div>
            );
          }

          if (msg.role === "ambiguous") {
            return (
              <div key={i} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container">
                  <span className="material-symbols-outlined text-primary">robot_2</span>
                </div>
                <div className="space-y-2">
                  <p className="font-body-md text-on-surface">{msg.ambiguous.clarification}</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.ambiguous.suggestions.map((s, j) => (
                      <button
                        key={j}
                        type="button"
                        onClick={() => handleSuggestion(s)}
                        className="rounded-full border border-outline-variant px-3 py-1.5 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}

        {loading && (
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container">
              <span className="material-symbols-outlined animate-pulse text-primary">robot_2</span>
            </div>
            <div className="flex h-[56px] items-center gap-1 rounded-2xl rounded-tl-sm bg-surface-container-low p-4">
              <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant [animation-delay:200ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-on-surface-variant [animation-delay:400ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Area ─────────────────────────────────────────── */}
      <div className="z-10 border-t border-outline-variant bg-surface-container-lowest p-4 md:p-6">
        <form
          className="relative flex items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí tu consulta..."
            disabled={loading}
            className="w-full rounded-lg border border-outline-variant bg-surface-bright px-4 py-3 font-body-md text-on-surface transition-all placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-fixed px-6 font-label-sm text-on-primary-fixed transition-colors hover:bg-primary-fixed-dim disabled:opacity-50"
          >
            <span>Enviar</span>
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </form>

        {/* Quick Prompts */}
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSend(q)}
              disabled={loading}
              className="whitespace-nowrap rounded-full border border-outline-variant px-3 py-1.5 font-label-sm text-[12px] text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}