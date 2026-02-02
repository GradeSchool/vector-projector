import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

export function useSubscriptionStatus() {
  const status = useQuery(api.billing.getSubscriptionStatus)

  return {
    isLoading: status === undefined,
    hasSubscription: status?.hasSubscription ?? false,
    status: status?.status ?? null,
    tier: status?.tier ?? null,
    currentPeriodEnd: status?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: status?.cancelAtPeriodEnd ?? false,
  }
}
