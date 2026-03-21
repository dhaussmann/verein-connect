import { Button as MantineButton, type ButtonProps as MantineBtnProps } from "@mantine/core";
import type { ReactNode } from "react";

interface ButtonProps extends Omit<MantineBtnProps, "variant" | "size"> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  form?: string;
}

const variantMap: Record<string, { variant: MantineBtnProps["variant"]; color?: string }> = {
  default: { variant: "filled" },
  destructive: { variant: "filled", color: "red" },
  outline: { variant: "outline" },
  secondary: { variant: "light" },
  ghost: { variant: "subtle" },
  link: { variant: "transparent" },
};

const sizeMap: Record<string, MantineBtnProps["size"]> = {
  default: "sm",
  sm: "xs",
  lg: "md",
  icon: "compact-sm",
};

export function Button({ variant = "default", size = "default", asChild: _asChild, className, children, ...props }: ButtonProps) {
  const { variant: mv, color } = variantMap[variant] ?? variantMap.default;
  const ms = sizeMap[size] ?? "sm";
  return (
    <MantineButton variant={mv} color={color} size={ms} className={className} {...props}>
      {children}
    </MantineButton>
  );
}

export type { ButtonProps };
