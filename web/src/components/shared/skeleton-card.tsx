import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard() {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-3 h-8 w-16" />
        <Skeleton className="mt-2 h-3 w-24" />
      </CardContent>
    </Card>
  );
}

export function SkeletonChart() {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-64 w-full" />
      </CardContent>
    </Card>
  );
}

export function SkeletonTable() {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-6">
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
