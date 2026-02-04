import { useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Modal } from '@/components/Modal'

type Tier = 'personal' | 'commercial'
type Interval = 'month' | 'year'

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

interface ProductInfo {
  name: string
  description: string | undefined
}

function extractPricing(
  catalog: {
    prices: Array<{
      unitAmount: number
      interval: string
      metadata: Record<string, string>
    }>
  } | null | undefined,
  tier: Tier,
  audience: 'public' | 'backer' = 'public'
): TierPricing | null {
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
  const yearlySavings = monthly * 12 - yearly

  return { monthly, yearly, yearlySavings }
}

function extractProductInfo(
  catalog: {
    products: Array<{
      name: string
      description?: string
      metadata: Record<string, string>
    }>
  } | null | undefined,
  tier: Tier
): ProductInfo | null {
  if (!catalog) return null

  const product = catalog.products.find((p) => p.metadata.tier === tier)
  if (!product) return null

  return {
    name: product.name,
    description: product.description,
  }
}

export function SubscribeModal({ isOpen, onClose, tier }: SubscribeModalProps) {
  const [loading, setLoading] = useState<Interval | null>(null)
  const [error, setError] = useState<string | null>(null)

  const catalog = useQuery(api.pricingCatalog.get)
  const createCheckoutSession = useAction(api.billing.createCheckoutSession)

  const pricing = extractPricing(catalog, tier)
  const productInfo = extractProductInfo(catalog, tier)
  const tierName = productInfo?.name ?? TIER_NAMES[tier]

  const handleClose = () => {
    setError(null)
    setLoading(null)
    onClose()
  }

  const handleSelectInterval = async (interval: Interval) => {
    setLoading(interval)
    setError(null)

    try {
      const { url } = await createCheckoutSession({
        tier,
        interval,
        audience: 'public', // TODO: Support backer pricing
      })

      if (url) {
        // Redirect to Stripe checkout
        window.location.href = url
      } else {
        setError('Failed to create checkout session')
        setLoading(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(null)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Subscribe to ${tierName}`}>
      {!pricing ? (
        <p className="text-sm text-gray-500">Loading pricing...</p>
      ) : (
        <div className="space-y-4">
          {productInfo?.description && (
            <p className="text-sm text-gray-600">{productInfo.description}</p>
          )}

          <p className="text-sm text-gray-600">Choose your billing period:</p>

          {error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>}

          {/* Monthly option */}
          <button
            onClick={() => handleSelectInterval('month')}
            disabled={loading !== null}
            className="w-full p-4 border rounded-lg text-left hover:border-sky-500 hover:bg-sky-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Monthly</p>
                <p className="text-sm text-gray-500">Billed monthly</p>
              </div>
              <div className="text-right">
                {loading === 'month' ? (
                  <p className="text-sm text-gray-500">Redirecting...</p>
                ) : (
                  <p className="text-xl font-bold">
                    ${pricing.monthly}
                    <span className="text-sm font-normal text-gray-500">/mo</span>
                  </p>
                )}
              </div>
            </div>
          </button>

          {/* Yearly option */}
          <button
            onClick={() => handleSelectInterval('year')}
            disabled={loading !== null}
            className="w-full p-4 border-2 border-sky-500 rounded-lg text-left hover:bg-sky-50 transition-colors relative disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="absolute -top-2 right-4 bg-sky-500 text-white text-xs px-2 py-0.5 rounded">
              Save ${pricing.yearlySavings}
            </span>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Yearly</p>
                <p className="text-sm text-gray-500">Billed annually</p>
              </div>
              <div className="text-right">
                {loading === 'year' ? (
                  <p className="text-sm text-gray-500">Redirecting...</p>
                ) : (
                  <p className="text-xl font-bold">
                    ${pricing.yearly}
                    <span className="text-sm font-normal text-gray-500">/yr</span>
                  </p>
                )}
              </div>
            </div>
          </button>

          <p className="text-xs text-gray-400 text-center">
            You'll be redirected to Stripe to complete your subscription.
          </p>
        </div>
      )}
    </Modal>
  )
}
