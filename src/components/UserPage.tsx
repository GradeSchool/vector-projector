interface UserPageProps {
  onBack: () => void
}

export function UserPage({ onBack }: UserPageProps) {
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
            <h2 className="font-semibold mb-2">Danger Zone</h2>
            <p className="text-sm text-gray-600">
              Delete account and other destructive actions.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
