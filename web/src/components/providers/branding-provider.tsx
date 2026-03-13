"use client";

import { createContext, useContext, useMemo } from "react";
import { useOrgConfig } from "@/hooks/use-org-config";
import type { AppConfig } from "@/types/api";

interface BrandingContext {
  company_name: string;
  tagline: string;
  page_title: string;
  primary_color: string;
  logo_url: string | null;
}

const DEFAULT_BRANDING: BrandingContext = {
  company_name: "Pitch|Parse",
  tagline: "Every call, parsed. Every rep, sharper.",
  page_title: "Pitch|Parse",
  primary_color: "#0D9488",
  logo_url: null,
};

const BrandingCtx = createContext<BrandingContext>(DEFAULT_BRANDING);

export function useBranding() {
  return useContext(BrandingCtx);
}

function hexToHsl(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data: orgData } = useOrgConfig();

  const branding = useMemo(() => {
    if (!orgData?.config) return DEFAULT_BRANDING;
    const config = orgData.config as unknown as AppConfig;
    return {
      company_name: config.branding?.company_name || DEFAULT_BRANDING.company_name,
      tagline: config.branding?.tagline || DEFAULT_BRANDING.tagline,
      page_title: config.branding?.page_title || DEFAULT_BRANDING.page_title,
      primary_color: config.branding?.primary_color || DEFAULT_BRANDING.primary_color,
      logo_url: config.branding?.logo_url ?? null,
    };
  }, [orgData]);

  const cssVars = useMemo(() => {
    const color = branding.primary_color;
    if (color === DEFAULT_BRANDING.primary_color) return undefined;
    const hsl = hexToHsl(color);
    if (!hsl) return undefined;
    return {
      "--primary": hsl,
      "--ring": hsl,
      "--sidebar-primary": hsl,
      "--sidebar-ring": hsl,
      "--chart-1": hsl,
    } as React.CSSProperties;
  }, [branding.primary_color]);

  return (
    <BrandingCtx.Provider value={branding}>
      <div style={cssVars}>{children}</div>
    </BrandingCtx.Provider>
  );
}
