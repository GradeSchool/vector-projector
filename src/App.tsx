import { useState, useEffect } from 'react'
import { UserPage } from './components/UserPage'
import { TestModal } from './components/modals/TestModal'

const MIN_WIDTH = 1024
const MIN_HEIGHT = 768

type Page = 'main' | 'user'

function App() {
  const [tooSmall, setTooSmall] = useState(false)
  const [activeStep, setActiveStep] = useState(1)
  const [currentPage, setCurrentPage] = useState<Page>('main')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const check = () => setTooSmall(
      window.innerWidth < MIN_WIDTH || window.innerHeight < MIN_HEIGHT
    )
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (tooSmall) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-xl font-semibold mb-2">Desktop Required</h1>
          <p className="text-muted-foreground">
            This app requires a screen at least {MIN_WIDTH}x{MIN_HEIGHT} pixels.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center h-16 border-b shrink-0">
        {/* Logo - clicks to home */}
        <button
          onClick={() => setCurrentPage('main')}
          className="w-80 h-full flex items-center px-4 bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-colors"
        >
          Vector Projector
        </button>

        {/* Menu */}
        <div className="flex-1 h-full flex items-center justify-center gap-6 bg-teal-500 text-white">
          <button className="hover:underline">Pricing</button>
          <button className="hover:underline">FAQ</button>
          <button className="hover:underline">New Project</button>
          <span className="text-white/70">Project Name</span>
          <button className="hover:underline">Save</button>
        </div>

        {/* User - navigates to user page */}
        <button
          onClick={() => setCurrentPage('user')}
          className="w-20 h-full flex items-center justify-center bg-orange-400 text-white font-medium hover:bg-orange-500 transition-colors"
        >
          User
        </button>
      </header>

      {/* Page content */}
      {currentPage === 'user' ? (
        <UserPage onBack={() => setCurrentPage('main')} />
      ) : (
        /* Main content area */
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          <aside className="w-80 flex flex-col border-r shrink-0">
            {/* Step numbers */}
            <div className="flex shrink-0">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <button
                  key={step}
                  onClick={() => setActiveStep(step)}
                  className={`flex-1 h-10 text-sm font-medium border-r last:border-r-0 transition-colors
                    ${activeStep === step
                      ? 'bg-slate-500 text-white'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                >
                  {step}
                </button>
              ))}
            </div>

            {/* Updates section */}
            <div className="bg-rose-400 text-white px-4 py-2 text-sm font-medium shrink-0">
              UPDATES
            </div>

            {/* Panel - scrollable if needed */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeStep === 1 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Panel content for step 1
                  </p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors text-sm"
                  >
                    Open Test Modal
                  </button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Panel content for step {activeStep}
                </div>
              )}
            </div>
          </aside>

          {/* Scene - never scrolls */}
          <main className="flex-1 flex items-center justify-center bg-slate-50 overflow-hidden">
            <div className="text-2xl text-slate-400 font-light">
              SCENE
            </div>
          </main>
        </div>
      )}

      {/* Modals */}
      <TestModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}

export default App
