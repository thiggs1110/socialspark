import { useQuery } from "@tanstack/react-query";

export interface SubscriptionStatus {
  status: "none" | "trialing" | "active" | "past_due" | "canceled" | "trial_expired";
  subscription: any | null;
}

export function useSubscription() {
  const { data: subscriptionStatus, isLoading, refetch } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const hasActiveSubscription = subscriptionStatus?.status === "active" || subscriptionStatus?.status === "trialing";
  const isTrialing = subscriptionStatus?.status === "trialing";
  const needsPayment = subscriptionStatus?.status === "trialing" || subscriptionStatus?.status === "trial_expired";
  const isExpired = subscriptionStatus?.status === "trial_expired" || subscriptionStatus?.status === "past_due";

  return {
    subscriptionStatus,
    subscription: subscriptionStatus?.subscription,
    hasActiveSubscription,
    isTrialing,
    needsPayment,
    isExpired,
    isLoading,
    refetch,
  };
}