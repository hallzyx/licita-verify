"use client";

import { useState, useRef, useCallback } from "react";
import { computeSha256 } from "@/lib/hash";

export interface FileUploadResult {
  file: File | null;
  hash: string;
  fileName: string;
}

interface FileUploadProps {
  label?: string;
  error?: string;
  onChange?: (result: FileUploadResult) => void;
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function FileUpload({ label, error, onChange }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      setLocalError(null);
      setSelectedFile(null);
      setFileName("");
      setFileHash("");

      if (!file) {
        onChange?.({ file: null, hash: "", fileName: "" });
        return;
      }

      // Validate PDF, JPG, PNG
      if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
        const err = "Solo se aceptan archivos PDF, JPG o PNG.";
        setLocalError(err);
        onChange?.({ file: null, hash: "", fileName: "" });
        return;
      }

      // Validate max size
      if (file.size > MAX_SIZE_BYTES) {
        const mb = (file.size / (1024 * 1024)).toFixed(1);
        const err = `El archivo excede el máximo de 10 MB (${mb} MB).`;
        setLocalError(err);
        onChange?.({ file: null, hash: "", fileName: "" });
        return;
      }

      // Compute SHA-256
      try {
        const hash = await computeSha256(file);
        setSelectedFile(file);
        setFileName(file.name);
        setFileHash(hash);
        onChange?.({ file, hash, fileName: file.name });
      } catch {
        const err = "Error al calcular el hash del archivo.";
        setLocalError(err);
        onChange?.({ file: null, hash: "", fileName: "" });
      }
    },
    [onChange],
  );

  const displayError = error || localError;
  const inputId = label?.toLowerCase().replace(/\s+/g, "-") || "file-upload";

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}

      <div
        className={`rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors ${
          displayError
            ? "border-red-400 bg-red-50"
            : "border-gray-300 bg-white hover:border-blue-400"
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={handleFileChange}
          className="hidden"
          aria-invalid={!!displayError}
          aria-describedby={displayError ? `${inputId}-error` : undefined}
        />

        {!selectedFile ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm text-blue-600 underline hover:text-blue-800"
          >
            Hacé clic para seleccionar un archivo
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-700">{fileName}</p>
            <p className="font-mono text-xs text-gray-500 break-all">
              SHA-256: <span className="text-gray-600">{fileHash}</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setFileName("");
                setFileHash("");
                setLocalError(null);
                onChange?.({ file: null, hash: "", fileName: "" });
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-xs text-red-600 underline hover:text-red-800"
            >
              Eliminar archivo
            </button>
          </div>
        )}
      </div>

      {displayError && (
        <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
}
