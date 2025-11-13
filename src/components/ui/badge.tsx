import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "success";
}

const variantClasses = {
  default: "bg-bdt-royal text-white shadow-[0_8px_16px_rgb(var(--bdt-navy) / 0.24)]",
  outline:
    "border border-[rgb(var(--bdt-royal) / 0.28)] bg-[rgb(var(--bdt-ice))] text-bdt-royal",
  success: "bg-[rgba(32,133,90,0.18)] text-[rgb(22,94,64)]",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

