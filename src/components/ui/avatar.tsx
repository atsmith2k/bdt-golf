'use client';

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string;
}

export function Avatar({ name, src, className, ...props }: AvatarProps) {
  const fallback = React.useMemo(() => {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 0) {
      return "NA";
    }
    const first = parts[0]?.[0] ?? "";
    const last = parts[parts.length - 1]?.[0] ?? "";
    return `${first}${last}`.toUpperCase();
  }, [name]);

  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600",
        className,
      )}
      {...props}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={40}
          height={40}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        fallback
      )}
    </div>
  );
}
