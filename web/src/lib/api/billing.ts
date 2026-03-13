import api from "@/lib/api-client";
import type { CheckoutResponse, SubscriptionResponse } from "@/types/api";

export async function createCheckout(
  plan: "starter" | "team",
  successUrl: string,
  cancelUrl: string,
): Promise<CheckoutResponse> {
  return api
    .post("api/billing/checkout", {
      json: {
        plan,
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
    })
    .json<CheckoutResponse>();
}

export async function getSubscription(): Promise<SubscriptionResponse> {
  return api.get("api/billing/subscription").json<SubscriptionResponse>();
}
