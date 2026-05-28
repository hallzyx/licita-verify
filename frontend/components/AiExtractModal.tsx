"use client";

import { useEffect, useRef, useState } from "react";
import { computeSha256 } from "@/lib/hash";
import type { AiExtractResponse } from "@/lib/ai";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

const ACCEPT_STRING = ".pdf,.jpg,.jpeg,.png";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export interface AiExtractResult {
  fields: AiExtractResponse["fields"];
  file: File;
  hash: string;
  fileName: string;
}

interface AiExtractModalProps {
  onComplete: (result: AiExtractResult) => void;
  onClose: () => void;
}

type Step = "select" | "extracting" | "error" | "done";

export function AiExtractModal({ onComplete, onClose }: AiExtractModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── File selection ────────────────────────────────────────

  function validateAndSelect(file: File) {
    setErrorMessage("");

    if (!ACCEPTED_TYPES.includes(file.type as typeof ACCEPTED_TYPES[number])) {
      setErrorMessage("Solo se aceptan archivos PDF, JPG o PNG.");
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(`El archivo excede el máximo de 10 MB (${mb} MB).`);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStep("extracting");
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSelect(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  // ── Extraction ────────────────────────────────────────────

  useEffect(() => {
    if (step !== "extracting" || !selectedFile) return;

    let cancelled = false;

    async function extract() {
      try {
        if (!selectedFile) return;
        const formData = new FormData();
        formData.set("file", selectedFile);

        const res = await fetch("/api/ai/extract", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({ error: "Error desconocido" }));
          throw new Error(json.error || "Error al extraer datos del documento");
        }

        if (cancelled) return;

        const hash = await computeSha256(selectedFile);
        const json: AiExtractResponse = await res.json();

        setStep("done");
        onComplete({
          fields: json.fields,
          file: selectedFile,
          hash,
          fileName: selectedFile.name,
        });
      } catch (err) {
        if (!cancelled) {
          setStep("error");
          setErrorMessage(err instanceof Error ? err.message : "Error desconocido");
        }
      }
    }

    extract();

    return () => { cancelled = true; };
  }, [step, selectedFile, onComplete]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const isImage = selectedFile?.type.startsWith("image/");

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
          {/* Step 1: File selection */}
          {step === "select" && (
            <>
              <p className="mb-4 text-sm text-gray-600">
                Seleccioná el documento del pliego para extraer los datos automáticamente.
              </p>

              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_STRING}
                onChange={handleInputChange}
                className="hidden"
              />

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors ${
                  isDragOver
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50"
                }`}
              >
                <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Arrastrá el archivo acá o <span className="text-blue-600 underline">seleccionalo</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">PDF, JPG o PNG — Máx. 10 MB</p>
                </div>
              </div>

              {errorMessage && (
                <p className="mt-3 text-center text-xs text-red-600" role="alert">
                  {errorMessage}
                </p>
              )}
            </>
          )}

          {/* Step 2: Extracting */}
          {step === "extracting" && selectedFile && (
            <>
              <div className="relative mb-4 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex h-48 items-center justify-center">
                  {isImage && previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Vista previa del documento"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 px-4 text-center text-gray-400">
                      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="max-w-full truncate text-xs">{selectedFile.name}</span>
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

          {/* Step 3: Error */}
          {step === "error" && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-red-100 p-3">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="max-w-sm text-center text-sm text-red-600">{errorMessage}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("select");
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setErrorMessage("");
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Intentar con otro archivo
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
