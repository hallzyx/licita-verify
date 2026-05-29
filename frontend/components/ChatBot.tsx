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
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white">
      {/* Chat messages */}
      <div className="flex max-h-96 flex-col gap-4 overflow-y-auto px-5 py-4">
        {messages.map((msg, i) => {
          if (msg.role === "bot" || msg.role === "error") {
            return (
              <div key={i} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm">
                  🤖
                </div>
                <div>
                  <p className={`text-sm ${msg.role === "error" ? "text-red-600" : "text-gray-700"}`}>
                    {msg.text}
                  </p>
                </div>
              </div>
            );
          }

          if (msg.role === "user") {
            return (
              <div key={i} className="flex justify-end gap-3">
                <div className="rounded-xl bg-blue-600 px-4 py-2">
                  <p className="text-sm text-white">{msg.text}</p>
                </div>
              </div>
            );
          }

          if (msg.role === "results") {
            const count = msg.results.length;
            return (
              <div key={i} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm">
                  🤖
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="text-sm text-gray-700">
                    Encontré <strong>{count} resultado{count !== 1 ? "s" : ""}</strong>:
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
              <div key={i} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm">
                  🤖
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">{msg.ambiguous.clarification}</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.ambiguous.suggestions.map((s, j) => (
                      <button
                        key={j}
                        type="button"
                        onClick={() => handleSuggestion(s)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-700"
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
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm">
              🤖
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "0.2s" }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend(input);
            }}
            placeholder="Escribí tu consulta..."
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => handleSend(input)}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            Enviar
          </button>
        </div>

        {/* Example queries as chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSend(q)}
              disabled={loading}
              className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
