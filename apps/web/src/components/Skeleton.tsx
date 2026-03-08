type Props = {
  className?: string;
  rows?: number;
};

export default function Skeleton({ className, rows = 1 }: Props) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-200 rounded ${className ?? "h-4 w-full"}`}
        />
      ))}
    </div>
  );
}
