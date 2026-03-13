"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { AppSidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { BrandingProvider, useBranding } from "@/components/providers/branding-provider";
import { motion } from "motion/react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

function useHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function DynamicTitle() {
  const { page_title } = useBranding();
  useEffect(() => {
    if (page_title) {
      document.title = page_title;
    }
  }, [page_title]);
  return null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  // Role-based route guards
  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    if (pathname.startsWith("/admin") && role !== "admin") {
      router.push("/dashboard");
    }
    if (pathname.startsWith("/team") && role !== "manager" && role !== "admin") {
      router.push("/dashboard");
    }
  }, [hydrated, isAuthenticated, pathname, role, router]);

  if (!hydrated || !isAuthenticated) {
    return null;
  }

  return (
    <BrandingProvider>
      <DynamicTitle />
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="noise-overlay flex-1 overflow-y-auto p-4 md:p-6">
            <ErrorBoundary>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mx-auto max-w-7xl"
              >
                {children}
              </motion.div>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </BrandingProvider>
  );
}
