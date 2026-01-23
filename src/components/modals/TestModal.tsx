import { Modal } from '../Modal'

interface TestModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TestModal({ isOpen, onClose }: TestModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Test Modal">
      <p className="text-gray-600 mb-4">
        This is a test modal. Modals are used throughout the app for various actions.
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 border rounded hover:bg-gray-50 transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors text-sm"
        >
          Confirm
        </button>
      </div>
    </Modal>
  )
}
