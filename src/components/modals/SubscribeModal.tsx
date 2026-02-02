import { useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Modal } from '@/components/Modal'

type Tier = 'personal' | 'commercial'

interface SubscribeModalProps {
  isOpen: boolean
  onClose: () => void
  tier: Tier
}

const TIER_NAMES = {
  personal: 'Personal',
  commercial: 'Commercial',
} as const

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

export function SubscribeModal({ isOpen, onClose, tier }: SubscribeModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCheckoutSession = useAction(api.billing.createCheckoutSession)
  const catalog = useQuery(api.pricingCatalog.get)

  const pricing = extractPricing(catalog, tier)
  const tierName = TIER_NAMES[tier]

  const handleSelect = async (interval: 'month' | 'year') => {
    setLoading(true)
    setError(null)

    try {
      // TODO: Support backer audience based on user status
      const result = await createCheckoutSession({ tier, interval, audience: 'public' })
      if (result.url) {
        window.location.href = result.url
      } else {
        setError('Failed to create checkout session')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Subscribe to ${tierName}`}>
      <div className="space-y-4">
        {!pricing ? (
          <p className="text-sm text-gray-500">Loading pricing...</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Choose your billing period:
            </p>

            {/* Monthly option */}
            <button
              onClick={() => handleSelect('month')}
              disabled={loading}
              className="w-full p-4 border rounded-lg text-left hover:border-sky-500 hover:bg-sky-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Monthly</p>
                  <p className="text-sm text-gray-500">Billed monthly</p>
                </div>
                <p className="text-xl font-bold">${pricing.monthly}<span className="text-sm font-normal text-gray-500">/mo</span></p>
              </div>
            </button>

            {/* Yearly option */}
            <button
              onClick={() => handleSelect('year')}
              disabled={loading}
              className="w-full p-4 border-2 border-sky-500 rounded-lg text-left hover:bg-sky-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
            >
              <span className="absolute -top-2 right-4 bg-sky-500 text-white text-xs px-2 py-0.5 rounded">
                Save ${pricing.yearlySavings}
              </span>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Yearly</p>
                  <p className="text-sm text-gray-500">Billed annually</p>
                </div>
                <p className="text-xl font-bold">${pricing.yearly}<span className="text-sm font-normal text-gray-500">/yr</span></p>
              </div>
            </button>
          </>
        )}

        {error && (
          <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
        )}

        {loading && (
          <p className="text-sm text-gray-500 text-center">Redirecting to checkout...</p>
        )}
      </div>
    </Modal>
  )
}
