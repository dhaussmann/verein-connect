import { Drawer } from "@mantine/core";
import { createContext, useContext, type ReactNode } from "react";

interface SheetCtx {
  opened: boolean;
  onClose: () => void;
}

const SheetContext = createContext<SheetCtx>({ opened: false, onClose: () => {} });

export function Sheet({
  open = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <SheetContext.Provider value={{ opened: open, onClose: () => onOpenChange?.(false) }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  return <>{children}</>;
}

export function SheetContent({
  children,
  side = "right",
  className,
}: {
  children: ReactNode;
  side?: "left" | "right" | "top" | "bottom";
  className?: string;
}) {
  const { opened, onClose } = useContext(SheetContext);
  const posMap = { left: "left", right: "right", top: "top", bottom: "bottom" } as const;
  return (
    <Drawer opened={opened} onClose={onClose} position={posMap[side]} classNames={{ content: className ?? "" }}>
      {children}
    </Drawer>
  );
}

export function SheetHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`mb-4 ${className ?? ""}`}>{children}</div>;
}

export function SheetFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`mt-4 flex justify-end gap-2 ${className ?? ""}`}>{children}</div>;
}

export function SheetTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-lg font-semibold ${className ?? ""}`}>{children}</h2>;
}

export function SheetDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-muted-foreground ${className ?? ""}`}>{children}</p>;
}

export function SheetClose({ children }: { children?: ReactNode }) {
  const { onClose } = useContext(SheetContext);
  return <span onClick={onClose}>{children}</span>;
}

export function SheetOverlay() {
  return null;
}

export function SheetPortal({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
