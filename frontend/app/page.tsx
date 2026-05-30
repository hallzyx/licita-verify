import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background font-body-md">
      {/* ── TopNavBar ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface-container-lowest">
        <div className="container flex h-16 items-center justify-between px-4 md:px-16">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined icon-fill text-3xl text-primary"
              aria-hidden="true"
            >
              verified_user
            </span>
            <span className="font-headline-md text-headline-md font-bold text-primary">
              LicitaVerify
            </span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="/"
              className="border-b-2 border-primary pb-1 font-bold uppercase text-label-sm text-primary transition-colors duration-200"
            >
              Inicio
            </Link>
            <Link
              href="/manual"
              className="font-label-sm uppercase text-on-surface-variant transition-colors duration-200 hover:text-primary"
            >
              Búsqueda
            </Link>
            <Link
              href="/chat"
              className="font-label-sm uppercase text-on-surface-variant transition-colors duration-200 hover:text-primary"
            >
              Chat IA
            </Link>
            <a
              href="#transparencia"
              className="font-label-sm uppercase text-on-surface-variant transition-colors duration-200 hover:text-primary"
            >
              Transparencia
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/login"
              className="hidden items-center gap-2 text-primary transition-colors duration-200 hover:text-primary-fixed md:flex"
            >
              <span className="material-symbols-outlined">person</span>
              <span className="font-label-sm font-bold uppercase">Acceder</span>
            </Link>
            {/* Mobile menu button — placeholder for future drawer */}
            <button className="text-primary md:hidden" aria-label="Menú">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="container flex flex-col items-center gap-12 px-4 py-16 md:flex-row md:items-center md:px-16 md:py-24 md:text-left">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <h1 className="text-display-lg font-display-lg text-primary">
              Tu aliado en la transparencia de compras públicas
            </h1>
            <p className="text-body-lg font-body-lg max-w-2xl text-on-surface-variant">
              Una plataforma confiable para la verificación y seguimiento de
              procesos de contratación con un registro auditable. Accede a datos
              claros y toma decisiones informadas.
            </p>
            <div className="flex flex-col gap-4 pt-4 sm:flex-row">
              <Link
                href="/manual"
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-label-sm font-bold uppercase text-on-primary transition-all active:scale-90 hover:opacity-90 scale-95"
              >
                <span className="material-symbols-outlined">search</span>
                Explorar licitaciones
              </Link>
              <Link
                href="/chat"
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-surface-container-high px-6 font-label-sm font-bold uppercase text-primary transition-all active:scale-90 hover:bg-surface-variant scale-95"
              >
                <span className="material-symbols-outlined">smart_toy</span>
                Habla con el Auditor IA
              </Link>
            </div>
          </div>

          <div className="flex w-full flex-1 justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Ilustración de ciudadanos analizando datos de contratación pública en un entorno transparente y moderno."
              className="ambient-shadow aspect-video w-full max-w-md rounded-xl object-cover md:aspect-square"
              src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80"
            />
          </div>
        </section>

        {/* ── Herramientas de Auditoría ────────────────────────── */}
        <section className="bg-surface-container-low py-16">
          <div className="container px-4 md:px-16">
            <h2 className="font-headline-md text-headline-md mb-12 text-center text-primary">
              Herramientas de Auditoría
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Búsqueda Manual */}
              <Link
                href="/manual"
                className="ambient-shadow flex flex-col items-start gap-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-8 transition-transform duration-300 hover:-translate-y-1 md:flex-row"
              >
                <div className="shrink-0 rounded-full bg-surface-variant p-4 text-primary">
                  <span className="material-symbols-outlined text-4xl">
                    manage_search
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md mb-2 text-primary">
                    Búsqueda Manual
                  </h3>
                  <p className="text-body-md font-body-md mb-6 text-on-surface-variant">
                    Explora y filtra los procesos de contratación de manera
                    detallada. Accede a registros históricos y documentos
                    originales verificados.
                  </p>
                  <span className="flex items-center gap-1 font-label-sm font-bold uppercase text-primary hover:underline">
                    Comenzar Búsqueda
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </span>
                </div>
              </Link>

              {/* Consultar a la IA */}
              <Link
                href="/chat"
                className="ambient-shadow flex flex-col items-start gap-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-8 transition-transform duration-300 hover:-translate-y-1 md:flex-row"
              >
                <div className="shrink-0 rounded-full bg-surface-variant p-4 text-primary">
                  <span className="material-symbols-outlined text-4xl">
                    psychology
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md mb-2 text-primary">
                    Consultar a la IA
                  </h3>
                  <p className="text-body-md font-body-md mb-6 text-on-surface-variant">
                    Obtén análisis y respuestas rápidas sobre procesos de
                    licitación mediante inteligencia artificial avanzada. Ideal
                    para resúmenes ejecutivos.
                  </p>
                  <span className="flex items-center gap-1 font-label-sm font-bold uppercase text-primary hover:underline">
                    Iniciar Consulta IA
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Transparencia en números ──────────────────────────── */}
        <section
          id="transparencia"
          className="container px-4 py-16 md:px-16"
        >
          <h2 className="font-headline-md text-headline-md mb-8 text-center text-primary md:text-left">
            Transparencia en números
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="ambient-shadow flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
              <div className="rounded-lg bg-surface-container p-3 text-primary">
                <span className="material-symbols-outlined icon-fill text-3xl">
                  handshake
                </span>
              </div>
              <div>
                <div className="font-headline-md text-headline-md text-primary">
                  150,000+
                </div>
                <div className="font-label-sm text-label-sm uppercase text-on-surface-variant">
                  Procesos Auditados
                </div>
              </div>
            </div>

            <div className="ambient-shadow flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
              <div className="rounded-lg bg-surface-container p-3 text-primary">
                <span className="material-symbols-outlined icon-fill text-3xl">
                  description
                </span>
              </div>
              <div>
                <div className="font-headline-md text-headline-md text-primary">
                  1.2M+
                </div>
                <div className="font-label-sm text-label-sm uppercase text-on-surface-variant">
                  Documentos Verificados
                </div>
              </div>
            </div>

            <div className="ambient-shadow flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
              <div className="rounded-lg bg-surface-container p-3 text-primary">
                <span className="material-symbols-outlined icon-fill text-3xl">
                  domain
                </span>
              </div>
              <div>
                <div className="font-headline-md text-headline-md text-primary">
                  500+
                </div>
                <div className="font-label-sm text-label-sm uppercase text-on-surface-variant">
                  Entidades Activas
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-outline-variant bg-surface-container">
        <div className="container flex flex-col items-center justify-between gap-6 px-4 py-12 md:flex-row md:px-16 md:text-left">
          <div className="flex items-center gap-2 opacity-80 transition-opacity hover:opacity-100">
            <span
              className="material-symbols-outlined icon-fill text-2xl text-primary"
              aria-hidden="true"
            >
              verified_user
            </span>
            <span className="font-headline-md text-headline-md font-bold text-primary">
              LicitaVerify
            </span>
          </div>

          <div className="text-body-md font-body-md text-center text-on-surface-variant md:text-left">
            © {new Date().getFullYear()} LicitaVerify. Portal de Transparencia
            Ciudadana.
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <a
              href="#"
              className="font-label-sm uppercase text-on-surface-variant transition-colors hover:text-primary hover:underline"
            >
              Privacidad
            </a>
            <a
              href="#"
              className="font-label-sm uppercase text-on-surface-variant transition-colors hover:text-primary hover:underline"
            >
              Términos
            </a>
            <a
              href="#"
              className="font-label-sm uppercase text-on-surface-variant transition-colors hover:text-primary hover:underline"
            >
              Contacto
            </a>
            <a
              href="#"
              className="font-label-sm uppercase text-on-surface-variant transition-colors hover:text-primary hover:underline"
            >
              Ayuda
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}