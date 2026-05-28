"use client";

import { useState } from "react";

interface CopyValueProps {
  value: string;
  label?: string;
}

/**
 * Displays a truncated value (first 6 + last 4 chars) with a copy button.
 * Click copies the full value to clipboard and shows a brief "Copiado" feedback.
 */
export function CopyValue({ value, label }: CopyValueProps) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const truncated =
    value.length > 14
      ? `${value.slice(0, 6)}...${value.slice(-4)}`
      : value;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard not available
    }
  }

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-400">{label}</span>}
      <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
        {truncated}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        title="Copiar valor completo"
      >
        {copied ? (
          <>
            <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Copiado
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
            </svg>
            Copiar
          </>
        )}
      </button>
    </div>
  );
}
