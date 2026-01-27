interface PricingPageProps {
  onBack: () => void
}

export function PricingPage({ onBack }: PricingPageProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Pricing</h1>
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to app
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 font-medium">Crowdfunding Active</p>
          <p className="text-amber-700 text-sm mt-1">
            During early access, only Makerworld backers can use premium features.
            Public pricing takes effect after crowdfunding ends.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Tier */}
          <div className="border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold">Free</h2>
            <p className="text-3xl font-bold">$0</p>
            <ul className="space-y-2 text-gray-600">
              <li>✓ Explore the UI</li>
              <li>✓ Play with demo content</li>
              <li>✓ Learn the workflow</li>
              <li className="text-gray-400">✗ Import your own files</li>
              <li className="text-gray-400">✗ Save projects</li>
              <li className="text-gray-400">✗ Export/download</li>
            </ul>
          </div>

          {/* Paid Tier */}
          <div className="border-2 border-sky-500 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-sky-600">Pro</h2>
            <p className="text-3xl font-bold">$TBD<span className="text-lg font-normal text-gray-500">/mo</span></p>
            <ul className="space-y-2 text-gray-600">
              <li>✓ Everything in Free</li>
              <li>✓ Import STL/SVG files</li>
              <li>✓ Save unlimited projects</li>
              <li>✓ Export/download</li>
            </ul>
            <button
              disabled
              className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded cursor-not-allowed"
            >
              Available after crowdfunding
            </button>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">One-time Purchase?</h2>
          <p className="text-gray-600">
            Placeholder: Considering a one-time purchase option for individual exports. TBD.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Backer Rewards</h2>
          <p className="text-gray-600">
            Placeholder: What backers get and for how long.
          </p>
        </section>
      </div>
    </div>
  )
}
