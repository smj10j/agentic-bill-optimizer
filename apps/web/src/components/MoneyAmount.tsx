import { formatCents } from "@orbit/shared";

type Props = {
  cents: number;
  showSign?: boolean;
  className?: string;
};

export default function MoneyAmount({ cents, showSign = false, className }: Props) {
  const isNegative = cents < 0;
  const colorClass = isNegative ? "text-red-600" : "text-green-600";

  return (
    <span className={`${colorClass} ${className ?? ""}`.trim()}>
      {formatCents(cents, { showSign })}
    </span>
  );
}
