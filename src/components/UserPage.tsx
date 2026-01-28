import { useState, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

interface UserPageProps {
  onBack: () => void
  onSignOut: () => Promise<void>
}

export function UserPage({ onBack, onSignOut }: UserPageProps) {
  const [signingOut, setSigningOut] = useState(false)

  const activeAlerts = useQuery(api.alerts.getActive)
  const hasUnread = useQuery(api.alerts.hasUnread)
  const markAsRead = useMutation(api.alerts.markAsRead)

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

          <section className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold mb-2">Subscription</h2>
            <p className="text-sm text-gray-600">
              View and manage your subscription plan.
            </p>
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
