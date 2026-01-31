import { useState } from 'react'
import {
  AlertsSection,
  BaseStlSection,
  PlaceholderSection,
} from './sections'

type AdminSection =
  | 'alerts'
  | 'base-stl'
  | 'users'
  | 'analytics'
  | 'settings'
  | 'logs'

interface NavItem {
  id: AdminSection
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    id: 'alerts',
    label: 'Alerts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    id: 'base-stl',
    label: 'Base STL Files',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    id: 'users',
    label: 'User Management',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'System Settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'logs',
    label: 'Logs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

interface AdminLayoutProps {
  onBack: () => void
  onSignOut: () => void
}

export function AdminLayout({ onBack, onSignOut }: AdminLayoutProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('alerts')

  const renderSection = () => {
    switch (activeSection) {
      case 'alerts':
        return <AlertsSection />
      case 'base-stl':
        return <BaseStlSection />
      case 'users':
        return <PlaceholderSection title="User Management" />
      case 'analytics':
        return <PlaceholderSection title="Analytics" />
      case 'settings':
        return <PlaceholderSection title="System Settings" />
      case 'logs':
        return <PlaceholderSection title="Logs" />
      default:
        return null
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Admin banner */}
      <div className="bg-purple-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-4">
        <span>Admin Dashboard</span>
        <button
          onClick={onBack}
          className="text-purple-200 hover:text-white underline"
        >
          Back to app
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left nav - matches main sidebar width */}
        <aside className="w-80 flex flex-col border-r shrink-0 bg-gray-50">
          <nav className="flex-1 overflow-y-auto py-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                  ${activeSection === item.id
                    ? 'bg-purple-100 text-purple-900 border-r-2 border-purple-600'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <span className={activeSection === item.id ? 'text-purple-600' : 'text-gray-400'}>
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Sign out at bottom */}
          <div className="p-4 border-t">
            <button
              onClick={onSignOut}
              className="w-full px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl">
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  )
}
