import { Modal } from "@mantine/core";
import { createContext, useContext, type ReactNode } from "react";

interface DialogCtx {
  opened: boolean;
  onClose: () => void;
}

const DialogContext = createContext<DialogCtx>({ opened: false, onClose: () => {} });

interface DialogRootProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open = false, onOpenChange, children }: DialogRootProps) {
  return (
    <DialogContext.Provider value={{ opened: open, onClose: () => onOpenChange?.(false) }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  return <>{children}</>;
}

export function DialogPortal({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function DialogOverlay() {
  return null;
}

interface DialogContentProps {
  children: ReactNode;
  className?: string;
  onInteractOutside?: (e: Event) => void;
}

export function DialogContent({ children, className }: DialogContentProps) {
  const { opened, onClose } = useContext(DialogContext);
  return (
    <Modal opened={opened} onClose={onClose} classNames={{ content: className ?? "" }} size="md" centered>
      {children}
    </Modal>
  );
}

export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`mb-4 ${className ?? ""}`}>{children}</div>;
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`mt-4 flex justify-end gap-2 ${className ?? ""}`}>{children}</div>;
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-lg font-semibold ${className ?? ""}`}>{children}</h2>;
}

export function DialogDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-muted-foreground ${className ?? ""}`}>{children}</p>;
}

export function DialogClose({ children, asChild }: { children?: ReactNode; asChild?: boolean }) {
  const { onClose } = useContext(DialogContext);
  return <span onClick={onClose}>{children}</span>;
}
