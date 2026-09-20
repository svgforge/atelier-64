import { fragmentHref } from "@/lib/icons";
import { cn } from "@/lib/utils";

type IconMarkProps = {
  id: string;
  className?: string;
  title?: string;
};

export function IconMark({ id, className, title }: IconMarkProps) {
  return (
    <svg
      className={cn("size-16 shrink-0", className)}
      viewBox="0 0 64 64"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <use href={fragmentHref(id)} />
    </svg>
  );
}
