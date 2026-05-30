import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-container-high text-on-surface-variant",
  success: "bg-secondary-container text-on-secondary-container",
  warning: "bg-primary-fixed text-on-primary-fixed-variant",
  danger: "bg-error-container text-on-error-container",
  info: "bg-surface-variant text-on-surface-variant",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-label-sm text-label-sm ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}