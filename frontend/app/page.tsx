import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">LicitaVerify</h1>
          <Link
            href="/admin/login"
            className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            Admin
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-2xl text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            Buscá licitaciones públicas verificables
          </h2>
          <p className="mb-10 text-sm text-gray-500">
            Consultá contrataciones públicas registradas en Arkiv
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            <Link
              href="/manual"
              className="group rounded-xl border-2 border-gray-200 bg-white p-8 text-center transition-all hover:border-blue-400 hover:shadow-md"
            >
              <div className="mb-3 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-2xl group-hover:bg-blue-50">
                  📋
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Búsqueda manual</h3>
              <p className="mt-1 text-sm text-gray-500">
                Filtros por rubro, estado, tipo, organismo y monto
              </p>
            </Link>

            <Link
              href="/chat"
              className="group rounded-xl border-2 border-gray-200 bg-white p-8 text-center transition-all hover:border-blue-400 hover:shadow-md"
            >
              <div className="mb-3 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-2xl group-hover:bg-blue-50">
                  🤖
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Preguntale a la IA</h3>
              <p className="mt-1 text-sm text-gray-500">
                Describí lo que buscás con tus propias palabras
              </p>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-4 text-center">
        <Link
          href="/admin/login"
          className="text-xs text-gray-400 transition-colors hover:text-gray-600"
        >
          Admin
        </Link>
      </footer>
    </div>
  );
}
