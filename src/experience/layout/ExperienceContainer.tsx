import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared max-width column for all foreground content (menu text, page content,
 * navigation). The particle field and background deliberately live OUTSIDE
 * this container so they stay full-bleed.
 */
export const EXPERIENCE_MAX_W = "max-w-3xl";

export function ExperienceContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6", EXPERIENCE_MAX_W, className)}>
      {children}
    </div>
  );
}
