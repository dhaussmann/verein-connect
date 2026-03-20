import * as React from "react";
import { cn } from "@/lib/utils";

type ToggleVariant = "default" | "outline";
type ToggleSize = "default" | "sm" | "lg";

interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  variant?: ToggleVariant;
  size?: ToggleSize;
}

const sizeClasses: Record<ToggleSize, string> = {
  default: "h-10 px-3",
  sm: "h-9 px-2.5",
  lg: "h-11 px-5",
};

const variantClasses: Record<ToggleVariant, string> = {
  default: "bg-transparent",
  outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
};

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, variant = "default", size = "default", pressed, onPressedChange, onClick, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      data-state={pressed ? "on" : "off"}
      onClick={(e) => {
        onPressedChange?.(!pressed);
        onClick?.(e);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);
Toggle.displayName = "Toggle";

export { Toggle };
