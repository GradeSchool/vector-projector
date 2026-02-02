import { useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

export function SettingsSection() {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const catalog = useQuery(api.pricingCatalog.get)
  const syncPricing = useAction(api.pricingCatalog.sync)

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await syncPricing({})
      if (result.success) {
        setSyncResult({
          success: true,
          message: `Synced ${result.productCount} products and ${result.priceCount} prices from Stripe.`,
        })
      } else {
        setSyncResult({
          success: false,
          message: result.error ?? 'Unknown error occurred',
        })
      }
    } catch (err) {
      setSyncResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to sync pricing',
      })
    } finally {
      setSyncing(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="space-y-8">
      {/* Pricing Catalog Section */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Pricing Catalog</h2>
        <p className="text-sm text-gray-500 mb-4">
          Sync product and price data from Stripe. This pulls all products/prices
          with the app metadata tag.
        </p>

        {/* Current Status */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Current Status</h3>

          {catalog === undefined ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : catalog === null ? (
            <p className="text-sm text-amber-600">
              No pricing catalog found. Click &quot;Sync from Stripe&quot; to initialize.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Products:</span>
                <span className="font-medium">{catalog.products.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Prices:</span>
                <span className="font-medium">{catalog.prices.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Synced:</span>
                <span className="font-medium">
                  {catalog.lastSyncedAt ? formatDate(catalog.lastSyncedAt) : 'Never'}
                </span>
              </div>
              {catalog.lastSyncError && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700">
                  <p className="font-medium">Last sync error:</p>
                  <p>{catalog.lastSyncError}</p>
                  {catalog.lastSyncFailedAt && (
                    <p className="text-xs mt-1">at {formatDate(catalog.lastSyncFailedAt)}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? 'Syncing...' : 'Sync from Stripe'}
        </button>

        {/* Sync Result */}
        {syncResult && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              syncResult.success
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {syncResult.message}
          </div>
        )}

        {/* Price Details */}
        {catalog && catalog.prices.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Configured Prices</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Tier
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Audience
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Interval
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {catalog.prices.map((price) => (
                    <tr key={price.priceId}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {price.metadata.tier ?? '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {price.metadata.audience ?? '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {price.interval}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        ${(price.unitAmount / 100).toFixed(2)} {price.currency.toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Placeholder for other settings */}
      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-1 text-gray-400">Other Settings</h2>
        <p className="text-sm text-gray-400">
          Additional system settings will appear here.
        </p>
      </div>
    </div>
  )
}
