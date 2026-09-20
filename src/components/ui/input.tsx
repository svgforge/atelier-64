import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md bg-surface px-3.5 font-sans text-sm text-fg placeholder:text-subtle shadow-[var(--shadow-border)] outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "transition-[box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
        className,
      )}
      {...props}
    />
  );
}
