import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-[rgb(var(--bdt-royal) / 0.22)] bg-white/95 px-3 py-2 text-sm text-bdt-navy shadow-[0_10px_22px_rgb(var(--bdt-navy) / 0.08)] transition focus:border-[rgb(var(--bdt-royal))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--bdt-royal) / 0.35)] focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-[rgb(var(--bdt-ice))] disabled:text-[rgb(var(--bdt-navy) / 0.45)]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
