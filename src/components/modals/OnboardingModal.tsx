import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Modal } from '@/components/Modal'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onGoToFaq: () => void
}

export function OnboardingModal({ isOpen, onClose, onGoToFaq }: OnboardingModalProps) {
  const appState = useQuery(api.appState.get)
  const crowdfundingActive = appState?.crowdfundingActive ?? false
  const handleFaqClick = () => {
    onClose()
    onGoToFaq()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Welcome to Vector Projector">
      <div className="space-y-4">
        {crowdfundingActive ? (
          <>
            <p className="text-gray-700">
              We're currently in <strong>Makerworld Crowdfunding Early Access</strong>.
            </p>
            <p className="text-gray-600 text-sm">
              Backers can unlock full features. Everyone can explore the app and try the demo content.
            </p>
          </>
        ) : (
          <>
            <p className="text-gray-700">
              A tool for 3D printing enthusiasts.
            </p>
            <p className="text-gray-600 text-sm">
              Explore the demo, sign up to save your work, subscribe to unlock exports.
            </p>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleFaqClick}
            className="flex-1 px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors"
          >
            Learn More (FAQ)
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Just Explore
          </button>
        </div>
      </div>
    </Modal>
  )
}
