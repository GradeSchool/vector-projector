import { useState, useEffect } from 'react'
import { useMutation, useQuery, useAction } from 'convex/react'
import { api } from '@convex/_generated/api'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'

interface UserPageProps {
  onBack: () => void
  onSignOut: () => Promise<void>
  onGoToPricing: () => void
}

export function UserPage({ onBack, onSignOut, onGoToPricing }: UserPageProps) {
  const [signingOut, setSigningOut] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const activeAlerts = useQuery(api.alerts.getActive)
  const hasUnread = useQuery(api.alerts.hasUnread)
  const markAsRead = useMutation(api.alerts.markAsRead)
  const cancelSubscription = useAction(api.billing.cancelSubscription)
  const reactivateSubscription = useAction(api.billing.reactivateSubscription)
  const createPortalSession = useAction(api.billing.createCustomerPortalSession)

  const {
    isLoading: subscriptionLoading,
    hasSubscription,
    status: subscriptionStatus,
    tier,
    currentPeriodEnd,
    cancelAtPeriodEnd,
  } = useSubscriptionStatus()

  // Auto-mark as read when viewing page with unread alerts
  // Only call if hasUnread is explicitly true (not undefined during loading/sign-out)
  useEffect(() => {
    if (hasUnread === true) {
      markAsRead().catch(() => {
        // Ignore errors during sign-out race condition
      })
    }
  }, [hasUnread, markAsRead])

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await onSignOut()
    } finally {
      setSigningOut(false)
    }
  }

  const handleCancelSubscription = async () => {
    setActionLoading('cancel')
    setSubscriptionError(null)
    setSuccessMessage(null)

    try {
      await cancelSubscription({})
      setSuccessMessage('Subscription will be canceled at the end of the billing period.')
    } catch (err) {
      setSubscriptionError(err instanceof Error ? err.message : 'Failed to cancel subscription')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivateSubscription = async () => {
    setActionLoading('reactivate')
    setSubscriptionError(null)
    setSuccessMessage(null)

    try {
      await reactivateSubscription({})
      setSuccessMessage('Subscription reactivated! Your subscription will continue.')
    } catch (err) {
      setSubscriptionError(err instanceof Error ? err.message : 'Failed to reactivate subscription')
    } finally {
      setActionLoading(null)
    }
  }

  const handleManageSubscription = async () => {
    setActionLoading('portal')
    setSubscriptionError(null)
    setSuccessMessage(null)

    try {
      const { url } = await createPortalSession({})
      window.location.href = url
    } catch (err) {
      setSubscriptionError(err instanceof Error ? err.message : 'Failed to open billing portal')
      setActionLoading(null)
    }
  }

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Unknown'
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getTierName = () => {
    if (tier === 'personal') return 'Personal'
    if (tier === 'commercial') return 'Commercial'
    return 'Premium'
  }

  const getStatusBadge = () => {
    if (!subscriptionStatus) return null

    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      past_due: 'bg-red-100 text-red-800',
      canceled: 'bg-gray-100 text-gray-800',
      trialing: 'bg-blue-100 text-blue-800',
    }

    const labels: Record<string, string> = {
      active: 'Active',
      past_due: 'Past Due',
      canceled: 'Canceled',
      trialing: 'Trial',
    }

    return (
      <span className={`px-2 py-0.5 text-xs rounded ${styles[subscriptionStatus] || 'bg-gray-100 text-gray-800'}`}>
        {labels[subscriptionStatus] || subscriptionStatus}
      </span>
    )
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 text-sm text-sky-600 hover:underline"
        >
          &larr; Back to App
        </button>

        <h1 className="text-2xl font-bold mb-6">User Settings</h1>

        <div className="space-y-6">
          {/* Active Alerts */}
          {activeAlerts && activeAlerts.length > 0 && (
            <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h2 className="font-semibold mb-3 text-amber-800">
                Updates {activeAlerts.length > 1 && `(${activeAlerts.length})`}
              </h2>
              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <div key={alert._id} className="border-l-2 border-amber-300 pl-3">
                    <p className="text-amber-900">{alert.message}</p>
                    <p className="text-xs text-amber-600 mt-1">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold mb-2">Profile</h2>
            <p className="text-sm text-gray-600">
              Manage your account settings and preferences.
            </p>
          </section>

          {/* Subscription Section */}
          <section className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold mb-3">Subscription</h2>

            {subscriptionLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : hasSubscription ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-medium">{getTierName()}</span>
                  {getStatusBadge()}
                </div>

                {subscriptionStatus === 'past_due' && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-red-800 text-sm font-medium">Payment Issue</p>
                    <p className="text-red-700 text-xs mt-1">
                      Your last payment failed. Please update your payment method to avoid service interruption.
                    </p>
                  </div>
                )}

                {cancelAtPeriodEnd ? (
                  <p className="text-sm text-amber-600">
                    Cancels on {formatDate(currentPeriodEnd)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    Renews on {formatDate(currentPeriodEnd)}
                  </p>
                )}

                {subscriptionError && (
                  <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{subscriptionError}</p>
                )}

                {successMessage && (
                  <p className="text-sm text-green-600 bg-green-50 p-2 rounded">{successMessage}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  {/* Manage Subscription - opens Stripe portal */}
                  <button
                    onClick={handleManageSubscription}
                    disabled={actionLoading !== null}
                    className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === 'portal' ? 'Opening...' : 'Manage Billing'}
                  </button>

                  {/* Cancel or Reactivate based on state */}
                  {cancelAtPeriodEnd ? (
                    <button
                      onClick={handleReactivateSubscription}
                      disabled={actionLoading !== null}
                      className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === 'reactivate' ? 'Reactivating...' : 'Reactivate Subscription'}
                    </button>
                  ) : (
                    <button
                      onClick={handleCancelSubscription}
                      disabled={actionLoading !== null}
                      className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === 'cancel' ? 'Canceling...' : 'Cancel Subscription'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  No active subscription. Subscribe to unlock all features.
                </p>
                <button
                  onClick={onGoToPricing}
                  className="px-4 py-2 text-sm bg-sky-500 text-white rounded hover:bg-sky-600"
                >
                  Subscribe
                </button>
              </div>
            )}
          </section>

          <section className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold mb-2">Sign Out</h2>
            <p className="text-sm text-gray-600 mb-3">
              Sign out of your account on this device.
            </p>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </section>

          <section className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold mb-2 text-red-600">Danger Zone</h2>
            <p className="text-sm text-gray-600">
              Delete account and other destructive actions.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
