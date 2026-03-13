"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useRouter, usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Settings, CreditCard, Building2 } from "lucide-react";
import { MobileSidebarTrigger } from "@/components/layout/sidebar";
import { useOrgSwitch } from "@/hooks/use-org-switch";
import Link from "next/link";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/analyze": "Analyze",
  "/transcripts": "Transcripts",
  "/reports": "Reports",
  "/team": "Team",
  "/admin": "Admin",
  "/settings": "Settings",
  "/billing": "Billing",
};

export function Topbar() {
  const { email, role, orgId, viewingOrgId, viewingOrgName, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { switchOrg } = useOrgSwitch();

  const initials = email ? email.split("@")[0].slice(0, 2).toUpperCase() : "??";

  const pageName = pageNames[pathname] || (pathname.startsWith("/calls/") ? "Call Detail" : "");

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const isViewingOtherOrg = viewingOrgId && viewingOrgId !== orgId;

  return (
    <header className="relative flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
      {/* Signal line — the signature orange accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="flex items-center gap-3">
        <MobileSidebarTrigger />
        <p className="font-display text-sm font-medium text-muted-foreground">{pageName}</p>
        {isViewingOtherOrg && (
          <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs text-primary">
            <Building2 className="h-3 w-3" />
            <span>
              Viewing <span className="font-semibold">{viewingOrgName}</span>
            </span>
            <button
              type="button"
              onClick={() => switchOrg(null, null)}
              className="ml-1 underline hover:no-underline"
            >
              Exit
            </button>
          </div>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="outline-none">
          <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent transition-all hover:ring-primary/50">
            <AvatarFallback className="bg-primary/15 text-xs font-mono font-medium text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-xs text-muted-foreground">{email}</p>
            {role && (
              <span className="mt-0.5 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium capitalize text-primary">
                {role}
              </span>
            )}
          </div>
          <DropdownMenuSeparator />
          <Link href="/settings">
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </Link>
          <Link href="/billing">
            <DropdownMenuItem className="cursor-pointer">
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
