import { cn } from "@/lib/utils";
import { getScoreBadgeClasses } from "@/lib/constants";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ScoreBadge({ score, size = "md", className }: ScoreBadgeProps) {
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-mono font-semibold",
        sizeClasses[size],
        getScoreBadgeClasses(score),
        className,
      )}
    >
      {score}
    </span>
  );
}
