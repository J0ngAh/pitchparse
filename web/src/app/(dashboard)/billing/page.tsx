"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSubscription } from "@/hooks/use-subscription";
import { createCheckout } from "@/lib/api/billing";
import { PageHeader } from "@/components/layout/page-header";
import { SkeletonCard } from "@/components/shared/skeleton-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, ArrowRight, Star, Clock } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    features: ["5 analyses/month", "1 user", "Basic scoring"],
    quota: 5,
    popular: false,
  },
  {
    name: "Starter",
    price: "$99",
    period: "/mo",
    features: ["50 analyses/month", "5 users", "Full scoring + coaching", "Report generation"],
    quota: 50,
    plan_id: "starter" as const,
    popular: true,
  },
  {
    name: "Team",
    price: "$249",
    period: "/mo",
    features: [
      "Unlimited analyses",
      "25 users",
      "Full scoring + coaching",
      "Report generation",
      "Custom KPI config",
      "Priority support",
    ],
    quota: -1,
    plan_id: "team" as const,
    popular: false,
  },
];

export default function BillingPage() {
  const searchParams = useSearchParams();
  const { data: subscription, isLoading } = useSubscription();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription updated successfully!");
    } else if (searchParams.get("canceled") === "true") {
      toast.info("Checkout canceled.");
    }
  }, [searchParams]);

  const handleUpgrade = async (plan: "starter" | "team") => {
    try {
      const origin = globalThis.location?.origin ?? "";
      const result = await createCheckout(
        plan,
        `${origin}/billing?success=true`,
        `${origin}/billing?canceled=true`,
      );
      globalThis.location?.assign(result.checkout_url);
    } catch {
      toast.error("Failed to create checkout session");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Billing" />
        <div className="grid grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const usagePct = subscription
    ? subscription.analysis_quota > 0
      ? Math.min((subscription.analysis_count / subscription.analysis_quota) * 100, 100)
      : 0
    : 0;

  const trialDaysLeft =
    subscription?.status === "trialing" && subscription.trial_ends_at
      ? Math.max(
          0,
          Math.ceil(
            (new Date(subscription.trial_ends_at).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Manage your subscription and usage" />

      {/* Trial banner */}
      {trialDaysLeft !== null && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Clock className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                You&apos;re on a 14-day free trial of the{" "}
                <span className="capitalize">{subscription?.plan}</span> plan
              </p>
              <p className="text-xs text-muted-foreground">
                {trialDaysLeft} days remaining — add a payment method to continue after the trial
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current usage */}
      {subscription && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Current Usage</CardTitle>
              <Badge variant="outline" className="capitalize">
                {subscription.plan} plan
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Analyses used</span>
              <span className="font-mono">
                {subscription.analysis_count} / {subscription.analysis_quota}
              </span>
            </div>
            <Progress value={usagePct} className="h-2" />
            {subscription.current_period_end && (
              <p className="text-xs text-muted-foreground">
                Period ends: {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan?.toLowerCase() === plan.name.toLowerCase();

          return (
            <Card
              key={plan.name}
              className={`relative overflow-hidden transition-all ${
                plan.popular
                  ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/5"
                  : isCurrent
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/50 bg-card/50 hover:bg-card/70"
              }`}
            >
              {plan.popular && (
                <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  <Star className="h-3 w-3 fill-primary" />
                  Most Popular
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {isCurrent && <Badge className="bg-primary/20 text-primary">Current</Badge>}
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                        <Check className="h-2.5 w-2.5 text-primary" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && plan.plan_id && (
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                    onClick={() => handleUpgrade(plan.plan_id!)}
                  >
                    Upgrade
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
