import type { SubscriptionStatus, BillStatus } from "@orbit/shared";

type Status = SubscriptionStatus | BillStatus;

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  flagged: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-gray-100 text-gray-500",
  pending: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  flagged: "Flagged",
  cancelled: "Cancelled",
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
};

type Props = {
  status: Status;
  className?: string;
};

export default function StatusBadge({ status, className }: Props) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600";
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style} ${className ?? ""}`.trim()}
    >
      {label}
    </span>
  );
}
