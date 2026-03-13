import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  complete: "bg-green-500/20 text-green-400 border-green-500/30",
  processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        statusStyles[status] || "bg-muted text-muted-foreground",
        className,
      )}
    >
      {(status === "processing" || status === "pending") && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {status}
    </span>
  );
}
