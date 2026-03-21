import { TextInput, type TextInputProps } from "@mantine/core";
import type { ReactNode } from "react";

export interface InputProps extends Omit<TextInputProps, "size"> {
  className?: string;
  size?: string;
}

export function Input({ className, size: _size, ...props }: InputProps) {
  return <TextInput className={className} {...props} />;
}

// InputOTP compat - passthrough wrappers
export function InputOTP({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function InputOTPGroup({ children }: { children: ReactNode }) {
  return <div className="flex gap-1">{children}</div>;
}

export function InputOTPSlot({ index: _index }: { index: number }) {
  return <input className="w-10 h-10 text-center border rounded" maxLength={1} />;
}
