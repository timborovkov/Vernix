import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Plan } from "@/lib/billing/constants";
import type { UsageSummary } from "@/lib/billing/usage";
import type { EffectiveLimits } from "@/lib/billing/limits";

export interface BillingData {
  plan: Plan;
  trialing: boolean;
  trialDaysRemaining: number;
  trialEndsAt: string | null;
  hasSubscription: boolean;
  hasPolarCustomer: boolean;
  period: { start: string; end: string };
  usage: UsageSummary;
  limits: EffectiveLimits;
}

export function useBilling() {
  const { data, isLoading, error, refetch } = useQuery<BillingData>({
    queryKey: queryKeys.billing.all,
    queryFn: async () => {
      const res = await fetch("/api/billing");
      if (!res.ok) throw new Error("Failed to load billing data");
      return res.json();
    },
    staleTime: 60_000, // 1 min
  });

  return { billing: data, loading: isLoading, error, refetch };
}
