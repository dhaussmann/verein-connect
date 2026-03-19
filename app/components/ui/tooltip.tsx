import { Tooltip as MantineTooltip, type TooltipProps } from "@mantine/core";
import type { ReactNode } from "react";

// TooltipProvider: no-op wrapper
export function TooltipProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

interface TooltipRootProps {
  children: ReactNode;
  delayDuration?: number;
}

export function Tooltip({ children }: TooltipRootProps) {
  return <>{children}</>;
}

export function TooltipTrigger({ children, asChild: _asChild }: { children: ReactNode; asChild?: boolean }) {
  return <>{children}</>;
}

interface TooltipContentProps {
  children: ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function TooltipContent({ children: _children }: TooltipContentProps) {
  return null; // handled by MantineTooltip label
}

export { MantineTooltip };
export type { TooltipProps };
