"use client";

import { Suspense } from "react";
import { CoachPage } from "@/components/coach/coach-page";
import { Loader2 } from "lucide-react";

function CoachFallback() {
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function CoachRoute() {
  return (
    <Suspense fallback={<CoachFallback />}>
      <CoachPage />
    </Suspense>
  );
}
