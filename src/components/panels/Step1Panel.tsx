import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

/**
 * Step 1: Select Base STL
 * Shows available base STL samples for discovery mode.
 * Users can browse and select a model to work with.
 */
export function Step1Panel() {
  const baseSamples = useQuery(api.stlFiles.listBaseSamples)

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-medium text-sm text-slate-700">Select a Model</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Choose a base model to get started
        </p>
      </div>

      {baseSamples === undefined ? (
        <div className="text-sm text-slate-400">Loading...</div>
      ) : baseSamples.length === 0 ? (
        <div className="text-sm text-slate-400">No models available yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {baseSamples.map((sample) => (
            <button
              key={sample._id}
              className="group flex flex-col bg-white border border-slate-200 rounded-lg p-2 hover:border-sky-400 hover:shadow-sm transition-all text-left"
            >
              {/* Thumbnail placeholder - will be replaced with actual thumbnail */}
              <div className="aspect-square w-full bg-slate-100 rounded flex items-center justify-center mb-2">
                <svg
                  className="w-8 h-8 text-slate-300 group-hover:text-sky-400 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <span className="text-xs font-medium text-slate-700 truncate w-full">
                {sample.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
