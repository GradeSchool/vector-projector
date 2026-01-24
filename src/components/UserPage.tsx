import { useState } from 'react'
import { authClient } from '../lib/auth-client'

interface UserPageProps {
  onBack: () => void
  onSignOut: () => void
}

export function UserPage({ onBack, onSignOut }: UserPageProps) {
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await authClient.signOut()
      onSignOut()
    } catch (err) {
      console.error('Sign out failed:', err)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 text-sm text-sky-600 hover:underline"
        >
          &larr; Back to App
        </button>

        <h1 className="text-2xl font-bold mb-6">User Settings</h1>

        <div className="space-y-6">
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
