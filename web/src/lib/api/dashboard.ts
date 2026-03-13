import api from "@/lib/api-client";
import type { DashboardStats } from "@/types/api";

export async function getDashboardStats(): Promise<DashboardStats> {
  return api.get("api/dashboard/stats").json<DashboardStats>();
}
