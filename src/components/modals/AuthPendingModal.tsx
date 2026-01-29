import { Modal } from '@/components/Modal'

interface AuthPendingModalProps {
  isOpen: boolean
  message: string | null
  details: string | null
  onClose: () => void
}

export function AuthPendingModal({ isOpen, message, details, onClose }: AuthPendingModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sign-in Issue">
      <div className="space-y-2 text-sm text-gray-700">
        <p>{message}</p>
        {details && <p className="text-gray-500">{details}</p>}
      </div>
    </Modal>
  )
}
