import { AdminLayout } from '@/components/admin'

interface AdminPageProps {
  onBack: () => void
  onSignOut: () => void
}

export function AdminPage({ onBack, onSignOut }: AdminPageProps) {
  return <AdminLayout onBack={onBack} onSignOut={onSignOut} />
}
