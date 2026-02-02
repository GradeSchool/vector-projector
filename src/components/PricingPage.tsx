import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'

type Tier = 'personal' | 'commercial'

interface PricingPageProps {
  onBack: () => void
  onSubscribe: (tier: Tier) => void
}

interface TierPricing {
  monthly: number
  yearly: number
  yearlySavings: number
}

function extractPricing(catalog: {
  prices: Array<{
    unitAmount: number
    interval: string
    metadata: Record<string, string>
  }>
} | null | undefined, tier: Tier, audience: 'public' | 'backer' = 'public'): TierPricing | null {
  if (!catalog) return null

  const monthlyPrice = catalog.prices.find(
    (p) => p.metadata.tier === tier && p.metadata.audience === audience && p.interval === 'month'
  )
  const yearlyPrice = catalog.prices.find(
    (p) => p.metadata.tier === tier && p.metadata.audience === audience && p.interval === 'year'
  )

  if (!monthlyPrice || !yearlyPrice) return null

  const monthly = monthlyPrice.unitAmount / 100
  const yearly = yearlyPrice.unitAmount / 100
  const yearlySavings = (monthly * 12) - yearly

  return { monthly, yearly, yearlySavings }
}

export function PricingPage({ onBack, onSubscribe }: PricingPageProps) {
  const appState = useQuery(api.appState.get)
  const crowdfundingActive = appState?.crowdfundingActive ?? false
  const { hasSubscription, tier: currentTier } = useSubscriptionStatus()
  const catalog = useQuery(api.pricingCatalog.get)

  const personalPricing = extractPricing(catalog, 'personal')
  const commercialPricing = extractPricing(catalog, 'commercial')

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Pricing</h1>
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back to app
          </button>
        </div>

        {crowdfundingActive && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 font-medium">Crowdfunding Active</p>
            <p className="text-amber-700 text-sm mt-1">
              During early access, only Makerworld backers can use premium features.
              Public pricing takes effect after crowdfunding ends.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Free Tier */}
          <div className="border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold">Free</h2>
            <p className="text-3xl font-bold">$0</p>
            <p className="text-sm text-gray-500">Forever free</p>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-500">&#10003;</span>
                <span>Explore the UI</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">&#10003;</span>
                <span>Play with demo content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">&#10003;</span>
                <span>Learn the workflow</span>
              </li>
              <li className="flex items-start gap-2 text-gray-400">
                <span>&#10005;</span>
                <span>Import your own files</span>
              </li>
              <li className="flex items-start gap-2 text-gray-400">
                <span>&#10005;</span>
                <span>Save projects</span>
              </li>
              <li className="flex items-start gap-2 text-gray-400">
                <span>&#10005;</span>
                <span>Export/download</span>
              </li>
            </ul>
            {!hasSubscription && (
              <div className="pt-2">
                <span className="inline-block px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded">
                  Current Plan
                </span>
              </div>
            )}
          </div>

          {/* Personal Tier */}
          <div className={`border-2 rounded-lg p-6 space-y-4 ${currentTier === 'personal' ? 'border-sky-500 bg-sky-50/50' : 'border-sky-500'}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-sky-600">Personal</h2>
              {currentTier === 'personal' && (
                <span className="px-2 py-0.5 text-xs bg-sky-500 text-white rounded">Current</span>
              )}
            </div>
            {personalPricing ? (
              <>
                <p className="text-3xl font-bold">${personalPricing.monthly}<span className="text-lg font-normal text-gray-500">/mo</span></p>
                <p className="text-sm text-gray-500">or ${personalPricing.yearly}/year (save ${personalPricing.yearlySavings})</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Loading pricing...</p>
            )}
            <ul className="space-y-2 text-gray-600 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-500">&#10003;</span>
                <span>Everything in Free</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">&#10003;</span>
                <span>Import STL/SVG files</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">&#10003;</span>
                <span>Save unlimited projects</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">&#10003;</span>
                <span>Export/download</span>
              </li>
              <li className="flex items-start gap-2 text-gray-400">
                <span>&#10005;</span>
                <span>Commercial use</span>
              </li>
            </ul>
            <button
              onClick={() => onSubscribe('personal')}
              disabled={crowdfundingActive || hasSubscription || !personalPricing}
              className="w-full px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {currentTier === 'personal' ? 'Current Plan' : crowdfundingActive ? 'Available after crowdfunding' : 'Subscribe'}
            </button>
          </div>

          {/* Commercial Tier */}
          <div className={`border-2 rounded-lg p-6 space-y-4 ${currentTier === 'commercial' ? 'border-emerald-500 bg-emerald-50/50' : 'border-emerald-500'}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-emerald-600">Commercial</h2>
              {currentTier === 'commercial' && (
                <span className="px-2 py-0.5 text-xs bg-emerald-500 text-white rounded">Current</span>
              )}
            </div>
            {commercialPricing ? (
              <>
                <p className="text-3xl font-bold">${commercialPricing.monthly}<span className="text-lg font-normal text-gray-500">/mo</span></p>
                <p className="text-sm text-gray-500">or ${commercialPricing.yearly}/year (save ${commercialPricing.yearlySavings})</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Loading pricing...</p>
            )}
            <ul className="space-y-2 text-gray-600 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-500">&#10003;</span>
                <span>Everything in Personal</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">&#10003;</span>
                <span>Commercial license</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">&#10003;</span>
                <span>Sell your designs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">&#10003;</span>
                <span>Use in business projects</span>
              </li>
            </ul>
            <button
              onClick={() => onSubscribe('commercial')}
              disabled={crowdfundingActive || hasSubscription || !commercialPricing}
              className="w-full px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {currentTier === 'commercial' ? 'Current Plan' : crowdfundingActive ? 'Available after crowdfunding' : 'Subscribe'}
            </button>
          </div>
        </div>

        <section className="space-y-4 pt-4">
          <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Can I change my plan later?</h3>
              <p className="text-gray-600 text-sm mt-1">
                Yes! You can upgrade, downgrade, or cancel your subscription at any time from your account settings.
              </p>
            </div>
            <div>
              <h3 className="font-medium">What's the difference between Personal and Commercial?</h3>
              <p className="text-gray-600 text-sm mt-1">
                Personal is for hobbyists and personal projects. Commercial includes a license to use your designs for business purposes, including selling prints or using them in commercial products.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
