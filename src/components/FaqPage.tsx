interface FaqPageProps {
  onBack: () => void
}

export function FaqPage({ onBack }: FaqPageProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">FAQ</h1>
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to app
          </button>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-sky-600">What is Vector Projector?</h2>
          <p className="text-gray-600">
            Placeholder: Description of what the app does.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-sky-600">Crowdfunding Early Access</h2>
          <p className="text-gray-600">
            Placeholder: We're currently on Makerworld crowdfunding. Here's how to get backer access...
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 font-medium">Are you a backer?</p>
            <p className="text-amber-700 text-sm mt-1">
              Placeholder: Instructions for backers to unlock access.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-sky-600">How do I sign up?</h2>
          <p className="text-gray-600">
            Placeholder: Sign up with email or Google. During crowdfunding, you'll need backer verification to unlock full features.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-sky-600">What can I do for free?</h2>
          <p className="text-gray-600">
            Placeholder: Explore the UI, play with demo content, learn the workflow.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-sky-600">What requires payment?</h2>
          <p className="text-gray-600">
            Placeholder: Importing your own files, saving projects, exporting/downloading.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-sky-600">Video Tutorial</h2>
          <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
            Placeholder: YouTube embed goes here
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-sky-600">Contact / Support</h2>
          <p className="text-gray-600">
            Placeholder: Email, Discord, etc.
          </p>
        </section>
      </div>
    </div>
  )
}
