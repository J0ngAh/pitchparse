import ky from "ky";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";

const api = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 30000,
  hooks: {
    beforeRequest: [
      (request) => {
        const { accessToken, viewingOrgId } = useAuthStore.getState();
        if (accessToken) {
          request.headers.set("Authorization", `Bearer ${accessToken}`);
        }
        if (viewingOrgId) {
          request.headers.set("X-Admin-Org-Id", viewingOrgId);
        }
      },
    ],
    afterResponse: [
      async (request, _options, response) => {
        if (response.status === 401) {
          // Attempt token refresh before logging out
          const { data } = await supabase.auth.refreshSession();
          if (data.session?.access_token) {
            useAuthStore.getState().setAccessToken(data.session.access_token);
            // Retry the original request with the new token
            request.headers.set("Authorization", `Bearer ${data.session.access_token}`);
            return ky(request);
          }
          // Refresh failed — log out
          useAuthStore.getState().logout();
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        }
      },
    ],
  },
});

export default api;
