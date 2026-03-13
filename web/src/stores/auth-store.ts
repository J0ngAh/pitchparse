import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole } from "@/types/api";

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  orgId: string | null;
  email: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  viewingOrgId: string | null;
  viewingOrgName: string | null;
  setAuth: (data: {
    access_token: string;
    user_id: string;
    org_id: string;
    email: string;
    role: string;
  }) => void;
  setAccessToken: (token: string) => void;
  setViewingOrg: (orgId: string | null, orgName: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      userId: null,
      orgId: null,
      email: null,
      role: null,
      isAuthenticated: false,
      viewingOrgId: null,
      viewingOrgName: null,
      setAuth: (data) =>
        set({
          accessToken: data.access_token,
          userId: data.user_id,
          orgId: data.org_id,
          email: data.email,
          role: data.role as UserRole,
          isAuthenticated: true,
        }),
      setAccessToken: (token) => set({ accessToken: token }),
      setViewingOrg: (orgId, orgName) =>
        set({
          viewingOrgId: orgId,
          viewingOrgName: orgName,
        }),
      logout: () =>
        set({
          accessToken: null,
          userId: null,
          orgId: null,
          email: null,
          role: null,
          isAuthenticated: false,
          viewingOrgId: null,
          viewingOrgName: null,
        }),
    }),
    {
      name: "pitchparse-auth",
    },
  ),
);
