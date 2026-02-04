import { useEffect, useState } from 'react'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'

interface CheckoutSuccessPageProps {
  onContinue: () => void
}

export function CheckoutSuccessPage({ onContinue }: CheckoutSuccessPageProps) {
  const { isLoading, hasSubscription, tier } = useSubscriptionStatus()
  const [autoRedirectCountdown, setAutoRedirectCountdown] = useState(5)

  // Countdown timer
  useEffect(() => {
    if (!hasSubscription) return

    const interval = setInterval(() => {
      setAutoRedirectCountdown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [hasSubscription])

  // Auto-redirect when countdown reaches 0
  useEffect(() => {
    if (hasSubscription && autoRedirectCountdown === 0) {
      onContinue()
    }
  }, [hasSubscription, autoRedirectCountdown, onContinue])

  const tierName = tier === 'personal' ? 'Personal' : tier === 'commercial' ? 'Commercial' : 'Premium'

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        {isLoading || !hasSubscription ? (
          <>
            <div className="text-6xl">...</div>
            <h1 className="text-2xl font-bold">Processing...</h1>
            <p className="text-gray-600">
              Please wait while we confirm your subscription.
            </p>
            <div className="animate-pulse flex justify-center">
              <div className="h-2 w-24 bg-sky-200 rounded"></div>
            </div>
          </>
        ) : (
          <>
            <div className="text-6xl text-green-500">&#10003;</div>
            <h1 className="text-2xl font-bold">Welcome to {tierName}!</h1>
            <p className="text-gray-600">
              Your subscription is now active. You have full access to all {tierName} features.
            </p>
            <button
              onClick={onContinue}
              className="px-6 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors"
            >
              Continue to App
            </button>
            <p className="text-sm text-gray-400">
              Redirecting in {autoRedirectCountdown} seconds...
            </p>
          </>
        )}
      </div>
    </div>
  )
}
