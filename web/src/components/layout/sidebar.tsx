"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  FileText,
  FileBarChart,
  Settings,
  CreditCard,
  ChevronLeft,
  Menu,
  Users,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthStore } from "@/stores/auth-store";
import { OrgSwitcher } from "./org-switcher";

const iconMap = {
  LayoutDashboard,
  Search,
  FileText,
  FileBarChart,
  Settings,
  CreditCard,
  Users,
  Shield,
} as const;

interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof iconMap;
  roles?: string[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/analyze", label: "Analyze", icon: "Search" },
  { href: "/transcripts", label: "Transcripts", icon: "FileText" },
  { href: "/reports", label: "Reports", icon: "FileBarChart" },
  { href: "/team", label: "Team", icon: "Users", roles: ["manager", "admin"] },
  { href: "/admin", label: "Admin", icon: "Shield", roles: ["admin"] },
  { href: "/settings", label: "Settings", icon: "Settings" },
  { href: "/billing", label: "Billing", icon: "CreditCard" },
];

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);

  const visibleItems = navItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );

  return (
    <nav className="flex-1 space-y-1 p-3">
      {visibleItems.map((item) => {
        const Icon = iconMap[item.icon];
        const isActive = pathname.startsWith(item.href);

        const link = (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary glow-signal-sm" />
            )}
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                isActive && "drop-shadow-[0_0_6px_var(--signal-glow)]",
              )}
            />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );

        if (collapsed) {
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        }

        return <div key={item.href}>{link}</div>;
      })}
    </nav>
  );
}

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
        {/* Animated signal bars */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary">
          <rect x="1" y="10" width="2" height="4" rx="0.5" fill="currentColor" opacity="0.6">
            <animate
              attributeName="height"
              values="4;8;4"
              dur="1.5s"
              repeatCount="indefinite"
              begin="0s"
            />
            <animate
              attributeName="y"
              values="10;6;10"
              dur="1.5s"
              repeatCount="indefinite"
              begin="0s"
            />
          </rect>
          <rect x="5" y="6" width="2" height="8" rx="0.5" fill="currentColor" opacity="0.8">
            <animate
              attributeName="height"
              values="8;4;8"
              dur="1.5s"
              repeatCount="indefinite"
              begin="0.2s"
            />
            <animate
              attributeName="y"
              values="6;10;6"
              dur="1.5s"
              repeatCount="indefinite"
              begin="0.2s"
            />
          </rect>
          <rect x="9" y="4" width="2" height="10" rx="0.5" fill="currentColor">
            <animate
              attributeName="height"
              values="10;6;10"
              dur="1.5s"
              repeatCount="indefinite"
              begin="0.4s"
            />
            <animate
              attributeName="y"
              values="4;8;4"
              dur="1.5s"
              repeatCount="indefinite"
              begin="0.4s"
            />
          </rect>
          <rect x="13" y="7" width="2" height="6" rx="0.5" fill="currentColor" opacity="0.7">
            <animate
              attributeName="height"
              values="6;10;6"
              dur="1.5s"
              repeatCount="indefinite"
              begin="0.6s"
            />
            <animate
              attributeName="y"
              values="7;3;7"
              dur="1.5s"
              repeatCount="indefinite"
              begin="0.6s"
            />
          </rect>
        </svg>
      </div>
      {!collapsed && (
        <span className="font-display text-base font-bold tracking-tight">
          Pitch<span className="text-primary">Parse</span>
        </span>
      )}
    </div>
  );
}

export function MobileSidebarTrigger() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!isMobile) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-60 bg-sidebar p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <Logo collapsed={false} />
        <OrgSwitcher collapsed={false} />
        <NavLinks collapsed={false} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function AppSidebar() {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);

  if (isMobile) return null;

  return (
    <aside
      className={cn(
        "hidden flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
      style={{ height: "100vh" }}
    >
      <Logo collapsed={collapsed} />
      <OrgSwitcher collapsed={collapsed} />
      <NavLinks collapsed={collapsed} />

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-muted-foreground hover:text-foreground"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>
    </aside>
  );
}
