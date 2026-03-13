"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 60 * 1000, // 60s default
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <LazyMotion features={domAnimation}>
          <MotionConfig reducedMotion="user">
            <TooltipProvider>
              {children}
              <Toaster richColors position="bottom-right" />
            </TooltipProvider>
          </MotionConfig>
        </LazyMotion>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
