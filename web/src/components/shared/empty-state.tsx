import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-gradient-to-b from-card/50 to-card/20 px-8 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 ring-1 ring-border/50">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-5 text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
