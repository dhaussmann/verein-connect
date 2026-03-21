import { Divider, type DividerProps } from "@mantine/core";

interface SeparatorProps extends DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Separator({ orientation = "horizontal", className, ...props }: SeparatorProps) {
  return (
    <Divider
      orientation={orientation}
      className={className}
      {...props}
    />
  );
}
