"use client";

import { useEffect, useRef, useState } from "react";
import type { AiExtractResponse } from "@/lib/ai";

interface AiExtractModalProps {
  file: File;
  onComplete: (fields: AiExtractResponse["fields"]) => void;
  onClose: () => void;
}

type ModalStatus = "loading" | "error" | "done";

export function AiExtractModal({ file, onComplete, onClose }: AiExtractModalProps) {
  const [status, setStatus] = useState<ModalStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const previewUrl = useRef<string | null>(null);

  useEffect(() => {
    // Create object URL for preview
    const url = URL.createObjectURL(file);
    previewUrl.current = url;

    let cancelled = false;

    async function extract() {
      try {
        const formData = new FormData();
        formData.set("file", file);

        const res = await fetch("/api/ai/extract", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({ error: "Error desconocido" }));
          throw new Error(json.error || "Error al extraer datos del documento");
        }

        const json: AiExtractResponse = await res.json();
        if (!cancelled) {
          setStatus("done");
          onComplete(json.fields);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "Error desconocido");
        }
      }
    }

    extract();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file, onComplete]);

  const isImage = file.type.startsWith("image/");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Auto-llenado IA</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Content ───────────────────────────────────────── */}
        <div className="p-6">
          {status === "loading" && (
            <>
              {/* File preview + scan animation */}
              <div className="relative mb-4 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex h-48 items-center justify-center">
                  {isImage && previewUrl.current ? (
                    <img
                      src={previewUrl.current}
                      alt="Vista previa del documento"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 px-4 text-center text-gray-400">
                      <svg
                        className="h-10 w-10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="max-w-full truncate text-xs">{file.name}</span>
                    </div>
                  )}
                </div>
                <div className="scan-overlay" />
              </div>

              <p className="text-center text-sm text-gray-600">
                Extrayendo datos del documento...
              </p>

              <style>{`
                @keyframes scan {
                  0%, 100% { transform: translateY(-100%); }
                  50% { transform: translateY(100%); }
                }
                .scan-overlay {
                  position: absolute;
                  inset: 0;
                  background: linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.25) 50%, transparent 100%);
                  animation: scan 2s ease-in-out infinite;
                  pointer-events: none;
                }
              `}</style>
            </>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-red-100 p-3">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="max-w-sm text-center text-sm text-red-600">{errorMessage}</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
