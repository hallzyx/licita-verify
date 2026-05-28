"use client";

interface ConfidenceBadgeProps {
  confidence: "alta" | "media" | "baja";
}

const config = {
  alta: { dot: "bg-green-500", label: "Alta" },
  media: { dot: "bg-yellow-500", label: "Media" },
  baja: { dot: "bg-red-500", label: "Baja" },
} as const;

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const { dot, label } = config[confidence];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
