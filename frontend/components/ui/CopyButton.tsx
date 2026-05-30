"use client";

import { useState } from "react";

interface CopyButtonProps {
  value: string;
  className?: string;
}

/**
 * An icon-only copy button with brief "copied" feedback.
 * Uses Material Symbols `content_copy` / `check` icons.
 */
export function CopyButton({ value, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`text-on-surface-variant transition-colors hover:text-primary ${className}`}
      title="Copiar"
    >
      <span className={`material-symbols-outlined text-[18px] ${copied ? "text-secondary" : ""}`}>
        {copied ? "check" : "content_copy"}
      </span>
    </button>
  );
}