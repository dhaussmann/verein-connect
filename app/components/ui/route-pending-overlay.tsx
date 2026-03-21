import { LoadingOverlay } from "@mantine/core";

export function RoutePendingOverlay({ visible }: { visible: boolean }) {
  return (
    <LoadingOverlay
      visible={visible}
      zIndex={10}
      overlayProps={{ blur: 1, backgroundOpacity: 0.2, radius: "sm" }}
      loaderProps={{ size: "sm" }}
    />
  );
}
