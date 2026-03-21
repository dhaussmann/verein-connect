import { Skeleton as MantineSkeleton, type SkeletonProps } from "@mantine/core";

export function Skeleton({ className, ...props }: SkeletonProps & { className?: string }) {
  return <MantineSkeleton className={className} {...props} />;
}
