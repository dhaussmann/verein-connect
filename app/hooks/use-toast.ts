import { notifications } from "@mantine/notifications";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

type ToastInstance = {
  id?: string;
};

export function useToast() {
  return {
    toast: ({ title, description, variant, duration }: ToastOptions) => {
      notifications.show({
        title,
        message: description,
        color: variant === "destructive" ? "red" : "blue",
        autoClose: duration ?? 5000,
      });
    },
    toasts: [] as ToastInstance[],
    dismiss: (id?: string) => {
      if (id) notifications.hide(id);
    },
  };
}

export const toast = ({
  title,
  description,
  variant,
  duration,
}: ToastOptions) => {
  notifications.show({
    title,
    message: description,
    color: variant === "destructive" ? "red" : "blue",
    autoClose: duration ?? 5000,
  });
};
