import Link from "next/link";
import { ChatBot } from "@/components/ChatBot";

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            LicitaVerify
          </Link>
          <Link
            href="/admin/login"
            className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6">
          <Link
            href="/"
            className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            ← Volver al inicio
          </Link>
        </div>
        <ChatBot />
      </main>
    </div>
  );
}
