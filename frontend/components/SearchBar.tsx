"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  /** Initial value to populate the input (for /buscar page) */
  initialQuery?: string;
  /** If true, renders a larger version for the home page */
  large?: boolean;
}

/**
 * Controlled search bar with an input and submit button.
 * On submit navigates to `/buscar?q={encoded query}`.
 */
export function SearchBar({ initialQuery = "", large = false }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/buscar?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscá licitaciones públicas verificables"
        className={large ? "text-lg py-3 px-4" : ""}
        aria-label="Buscar licitaciones"
      />
      <Button type="submit" size={large ? "lg" : "md"}>
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        Buscar
      </Button>
    </form>
  );
}
