import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

/**
 * Step 3: Choose or Import SVGs
 * Shows available base SVG samples for projection.
 * Users can browse and select an SVG to project onto their model.
 */
export function Step3Panel() {
  const baseSamples = useQuery(api.svgFiles.listBaseSamples)

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-medium text-sm text-slate-700">Choose or Import SVGs</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Max file size = 15KB. Select an extrusion plane in the 3D scene. Drag an SVG onto the extrusion plane.
          Adjust the position, rotation, and scale. Repeat for any of your extrusion planes.
        </p>
      </div>

      {baseSamples === undefined ? (
        <div className="text-sm text-slate-400">Loading...</div>
      ) : baseSamples.length === 0 ? (
        <div className="text-sm text-slate-400">No patterns available yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {baseSamples.map((sample) => (
            <button
              key={sample._id}
              className="group flex flex-col bg-white border border-slate-200 rounded-lg p-2 hover:border-emerald-400 hover:shadow-sm transition-all text-left"
            >
              {/* Thumbnail placeholder - will be replaced with actual SVG preview */}
              <div className="aspect-square w-full bg-slate-100 rounded flex items-center justify-center mb-2">
                <svg
                  className="w-8 h-8 text-slate-300 group-hover:text-emerald-400 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
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
