"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";

const EXAMPLE_QUERIES = [
  "Mostrame obras públicas en Salta",
  "Licitaciones mayores a 100 millones",
  "Contrataciones adjudicadas este mes",
  "Obras de plazas y veredas",
];

export default function HomePage() {
  const router = useRouter();

  function handleExampleClick(query: string) {
    router.push(`/buscar?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">LicitaVerify</h1>
          <Link
            href="/admin/login"
            className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Admin
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-2xl text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            Buscá licitaciones públicas verificables
          </h2>
          <p className="mb-8 text-sm text-gray-500">
            Consultá contrataciones públicas registradas en Arkiv usando
            lenguaje natural
          </p>

          {/* Search bar */}
          <div className="mb-8">
            <SearchBar large />
          </div>

          {/* Example queries */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-400">
              Probá con estas consultas:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_QUERIES.map((q) => (
                <Button
                  key={q}
                  variant="outline"
                  size="sm"
                  onClick={() => handleExampleClick(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-4 text-center">
        <Link
          href="/admin/login"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Admin
        </Link>
      </footer>
    </div>
  );
}
