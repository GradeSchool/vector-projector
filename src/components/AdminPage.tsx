import { authClient } from '@/lib/auth-client'

interface AdminPageProps {
  onBack: () => void
  onSignOut: () => void
}

export function AdminPage({ onBack, onSignOut }: AdminPageProps) {
  const handleSignOut = async () => {
    onSignOut() // Navigate away first to avoid flicker
    await authClient.signOut()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Admin banner */}
      <div className="bg-purple-600 text-white px-4 py-2 text-center font-semibold">
        Logged in as Admin
      </div>

      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <button
              onClick={onBack}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to app
            </button>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h2 className="font-semibold text-purple-900 mb-2">Admin Features</h2>
            <p className="text-sm text-purple-700">
              Admin-specific functionality will go here. This page is only visible to users
              whose email is in the admins table.
            </p>
          </div>

          {/* Placeholder sections for future admin features */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-medium mb-2">User Management</h3>
              <p className="text-sm text-gray-500">Coming soon</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-medium mb-2">Analytics</h3>
              <p className="text-sm text-gray-500">Coming soon</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-medium mb-2">System Settings</h3>
              <p className="text-sm text-gray-500">Coming soon</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-medium mb-2">Logs</h3>
              <p className="text-sm text-gray-500">Coming soon</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
