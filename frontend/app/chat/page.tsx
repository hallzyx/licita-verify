import Link from "next/link";
import { ChatBot } from "@/components/ChatBot";

export default function ChatPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      {/* ── TopNavBar ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface-container-lowest">
        <div className="container flex h-16 items-center justify-between px-4 md:px-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="material-symbols-outlined icon-fill text-2xl text-primary" aria-hidden="true">
                verified_user
              </span>
              <span className="font-headline-md text-headline-md font-bold text-primary">
                LicitaVerify
              </span>
            </Link>

            <nav className="hidden items-center gap-6 md:flex">
              <Link
                href="/"
                className="font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary"
              >
                Inicio
              </Link>
              <Link
                href="/manual"
                className="border-b-2 border-primary pb-1 font-bold font-body-md text-body-md text-primary"
              >
                Búsqueda
              </Link>
              <a
                href="#transparencia"
                className="font-body-md text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary"
              >
                Transparencia
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/login"
              className="hidden items-center justify-center rounded-full bg-primary px-6 py-2 font-label-sm text-label-sm text-on-primary transition-colors hover:opacity-90 md:flex"
            >
              Acceder
            </Link>
            <button className="md:hidden text-on-surface-variant" aria-label="Menú">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Chat Area ──────────────────────────────────────── */}
      <main className="container mx-auto flex w-full max-w-[900px] flex-1 flex-col items-center px-4 py-8 md:px-16">
        {/* Back link */}
        <div className="mb-6 flex w-full justify-start">
          <Link
            href="/"
            className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Volver al inicio
          </Link>
        </div>

        {/* Chat container */}
        <ChatBot />

        {/* Quick prompts shown outside ChatBot when no messages */}
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-outline-variant bg-surface-container">
        <div className="container flex flex-col items-center justify-between gap-6 px-4 py-12 md:flex-row md:px-16 md:text-left">
          <p className="font-body-md text-body-md text-center text-on-surface-variant md:text-left">
            © {new Date().getFullYear()} LicitaVerify. Portal de Transparencia Ciudadana.
          </p>
          <nav className="flex flex-wrap justify-center gap-6">
            <a href="#" className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary hover:underline">Privacidad</a>
            <a href="#" className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary hover:underline">Términos</a>
            <a href="#" className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary hover:underline">Contacto</a>
            <a href="#" className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary hover:underline">Ayuda</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}