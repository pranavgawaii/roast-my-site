interface LoadingSpinnerProps {
  size?: number;
}

export function LoadingSpinner({ size = 20 }: LoadingSpinnerProps) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-white/50 border-t-white"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
