import { useState, useEffect } from 'react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useSession } from './hooks/useSession'
import { UserPage } from './components/UserPage'
import { AdminPage } from './components/AdminPage'
import { FaqPage } from './components/FaqPage'
import { PricingPage } from './components/PricingPage'
import { TestModal } from './components/modals/TestModal'
import { AuthModal } from './components/modals/AuthModal'
import { AuthPendingModal } from './components/modals/AuthPendingModal'
import { OnboardingModal } from './components/modals/OnboardingModal'
import { authClient } from '@/lib/auth-client'
import {
  safeLocalGet,
  safeLocalSet,
  safeSessionGet,
  safeSessionRemove,
} from '@/lib/storage'

const MIN_WIDTH = 1024
const MIN_HEIGHT = 768

type Page = 'main' | 'user' | 'faq' | 'pricing'

const ONBOARDING_KEY = 'vp_onboarding_seen'
const AUTH_PENDING_KEY = 'vp_auth_pending'
const BACKER_ID_KEY = 'vp_backer_id'
const BACKER_TOKEN_KEY = 'vp_backer_token'

function App() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const [tooSmall, setTooSmall] = useState(false)
  const [activeStep, setActiveStep] = useState(1)
  const [currentPage, setCurrentPage] = useState<Page>('main')
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | null>(null)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [isEnsuringUser, setIsEnsuringUser] = useState(false)
  const [ensureUserError, setEnsureUserError] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [authPending, setAuthPending] = useState(false)
  const [authPendingError, setAuthPendingError] = useState<string | null>(null)
  const [authPendingDetails, setAuthPendingDetails] = useState<string | null>(null)
  const [ensureAttempt, setEnsureAttempt] = useState(0)

  // Show onboarding modal on first visit
  useEffect(() => {
    const seen = safeLocalGet(ONBOARDING_KEY)
    if (!seen) {
      setIsOnboardingOpen(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setAuthPending(safeSessionGet(AUTH_PENDING_KEY) === 'true')
  }, [])


  const handleOnboardingClose = () => {
    safeLocalSet(ONBOARDING_KEY, 'true')
    setIsOnboardingOpen(false)
  }

  const handleGoToFaq = () => {
    setCurrentPage('faq')
  }

  // Session management
  const {
    sessionId,
    isSessionValid,
    isDuplicateTab,
    wasKicked,
    clearKicked,
    setSessionId,
    clearSession,
  } = useSession(isAuthenticated)

  // App user state from session validation or direct query
  const [appUser, setAppUser] = useState<{
    userId: string
    email: string
    name?: string
    isAdmin: boolean
  } | null>(null)

  const ensureAppUser = useMutation(api.users.ensureAppUser)
  const appUserQuery = useQuery(
    api.users.getCurrentAppUser,
    isAuthenticated && sessionId ? {} : "skip"
  )
  const hasUnreadAlerts = useQuery(
    api.alerts.hasUnread,
    isAuthenticated && sessionId ? {} : "skip"
  )

  // Create app user and session if authenticated but no session exists
  useEffect(() => {
    if (isAuthenticated && !sessionId && !wasKicked) {
      let isActive = true
      // No session - need to create one (e.g., after Google OAuth redirect)
      setIsEnsuringUser(true)
      setEnsureUserError(null)

      // Check for backer ID from crowdfunding sign up flow (stored before OAuth redirect)
      const storedBackerId = safeSessionGet(BACKER_ID_KEY)
      const storedBackerToken = safeSessionGet(BACKER_TOKEN_KEY)
      const crowdfundingBackerId = storedBackerId
        ? (storedBackerId as Id<"crowdfunding_backers">)
        : undefined
      const crowdfundingBackerToken = storedBackerToken ? String(storedBackerToken) : undefined

      ensureAppUser({ crowdfundingBackerId, crowdfundingBackerToken })
        .then((result) => {
          if (!isActive) return
          setSessionId(result.sessionId)
          setAppUser({
            userId: result.userId,
            email: result.email,
            name: result.name,
            isAdmin: result.isAdmin,
          })
          // Clear backer ID after successful account creation
          safeSessionRemove(BACKER_ID_KEY)
          safeSessionRemove(BACKER_TOKEN_KEY)
        })
        .catch((err) => {
          console.error('Failed to establish session:', err)
          if (crowdfundingBackerId) {
            safeSessionRemove(BACKER_ID_KEY)
            safeSessionRemove(BACKER_TOKEN_KEY)
          }
          setEnsureUserError(
            err instanceof Error ? err.message : 'Unable to finish sign-in. Please try again.'
          )
        })
        .finally(() => {
          if (!isActive) return
          setIsEnsuringUser(false)
        })
      return () => {
        isActive = false
      }
    }
  }, [isAuthenticated, sessionId, wasKicked, ensureAppUser, setSessionId, ensureAttempt])

  useEffect(() => {
    if (!isAuthenticated || wasKicked) {
      setAppUser(null)
      return
    }
    if (appUserQuery === undefined) return
    if (appUserQuery === null) {
      setAppUser(null)
      return
    }
    setAppUser({
      userId: appUserQuery.userId,
      email: appUserQuery.email,
      name: appUserQuery.name,
      isAdmin: appUserQuery.isAdmin,
    })
  }, [appUserQuery, isAuthenticated, wasKicked])

  useEffect(() => {
    if (!authPending) return
    if (isAuthenticated && sessionId && appUserQuery !== undefined) {
      safeSessionRemove(AUTH_PENDING_KEY)
      setAuthPending(false)
      setAuthPendingError(null)
    }
  }, [authPending, isAuthenticated, sessionId, appUserQuery])

  useEffect(() => {
    if (!authPending) return
    const timeout = window.setTimeout(() => {
      if (!isAuthenticated && !sessionId) {
        safeSessionRemove(AUTH_PENDING_KEY)
        setAuthPending(false)
        setAuthPendingError('We could not complete Google sign-in.')
        setAuthPendingDetails(
          'This can happen if Google is slow, blocked, or the pop-up was closed. Please try again.'
        )
      }
    }, 45000)
    return () => window.clearTimeout(timeout)
  }, [authPending, isAuthenticated, sessionId])


  // Compute effective app user - null if kicked or not authenticated
  const effectiveAppUser = (wasKicked || !isAuthenticated) ? null : appUser

  // Handle sign out - clear session
  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      await authClient.signOut()
    } catch (err) {
      console.error('Sign out failed:', err)
    } finally {
      safeSessionRemove(AUTH_PENDING_KEY)
      safeSessionRemove(BACKER_TOKEN_KEY)
      safeSessionRemove(BACKER_ID_KEY)
      setAuthPending(false)
      setAuthPendingError(null)
      setAuthPendingDetails(null)
      setEnsureUserError(null)
      clearSession()
      setAppUser(null)
      setCurrentPage('main')
      setIsSigningOut(false)
    }
  }

  // Handle successful sign-in from modal
  const handleAuthSuccess = (result: {
    userId: string
    email: string
    name?: string
    isAdmin: boolean
    sessionId: string
  }) => {
    setSessionId(result.sessionId)
    setAppUser({
      userId: result.userId,
      email: result.email,
      name: result.name,
      isAdmin: result.isAdmin,
    })
  }

  useEffect(() => {
    const check = () => setTooSmall(
      window.innerWidth < MIN_WIDTH || window.innerHeight < MIN_HEIGHT
    )
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Show duplicate tab warning
  if (isDuplicateTab) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center bg-amber-50">
        <div>
          <h1 className="text-xl font-semibold mb-2 text-amber-800">Duplicate Tab</h1>
          <p className="text-amber-700">
            You already have this app open in another tab.
            <br />
            Please use that tab instead.
          </p>
        </div>
      </div>
    )
  }

  // Show kicked message
  if (wasKicked) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center bg-red-50">
        <div>
          <h1 className="text-xl font-semibold mb-2 text-red-800">Session Ended</h1>
          <p className="text-red-700 mb-4">
            You signed in on another device.
            <br />
            Only one session is allowed at a time.
          </p>
          <button
            onClick={clearKicked}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Sign In Again
          </button>
        </div>
      </div>
    )
  }

  if (ensureUserError && isAuthenticated && !sessionId) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center bg-red-50">
        <div>
          <h1 className="text-xl font-semibold mb-2 text-red-800">Sign-in Error</h1>
          <p className="text-red-700 mb-4">
            {ensureUserError}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setEnsureUserError(null)
                setEnsureAttempt((prev) => prev + 1)
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Try Again
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-white text-red-700 border border-red-200 rounded hover:bg-red-100"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

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

  // Check if session is valid (only matters if authenticated)
  const hasValidSession = !isAuthenticated || isSessionValid === true
  const isSessionValidationPending = isAuthenticated && !!sessionId && isSessionValid === undefined
  const isAppUserLoading = isAuthenticated && !!sessionId && appUserQuery === undefined
  const isAuthResolving = isLoading || isEnsuringUser || isSigningOut || isSessionValidationPending || isAppUserLoading
  const shouldShowUser = !isAuthResolving && isAuthenticated && hasValidSession && !!effectiveAppUser
  const shouldShowSignedOut = !isAuthenticated

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
          <button onClick={() => setCurrentPage('pricing')} className="hover:underline">Pricing</button>
          <button onClick={() => setCurrentPage('faq')} className="hover:underline">FAQ</button>
        </div>

        {/* Auth buttons - fixed width to prevent layout shift */}
        <div className="w-40 h-full flex shrink-0">
          {shouldShowUser ? (
            <button
              onClick={() => setCurrentPage('user')}
              className="relative w-full h-full flex items-center justify-center bg-orange-400 text-white font-medium hover:bg-orange-500 transition-colors"
            >
              User
              {hasUnreadAlerts && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-orange-400" />
              )}
            </button>
          ) : shouldShowSignedOut ? (
            <div className="flex w-full h-full">
              <button
                onClick={() => setAuthModalMode('signup')}
                className="flex-1 h-full flex items-center justify-center bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors text-sm"
              >
                Sign Up
              </button>
              <button
                onClick={() => setAuthModalMode('signin')}
                className="flex-1 h-full flex items-center justify-center bg-orange-400 text-white font-medium hover:bg-orange-500 transition-colors text-sm"
              >
                Sign In
              </button>
            </div>
          ) : (
            <button
              disabled
              className="w-full h-full flex items-center justify-center bg-orange-400/80 text-white font-medium cursor-not-allowed"
            >
              User
            </button>
          )}
        </div>
      </header>

      {/* Page content */}
      {currentPage === 'user' ? (
        effectiveAppUser?.isAdmin ? (
          <AdminPage
            onBack={() => setCurrentPage('main')}
            onSignOut={handleSignOut}
          />
        ) : (
          <UserPage
            onBack={() => setCurrentPage('main')}
            onSignOut={handleSignOut}
          />
        )
      ) : currentPage === 'faq' ? (
        <FaqPage onBack={() => setCurrentPage('main')} />
      ) : currentPage === 'pricing' ? (
        <PricingPage onBack={() => setCurrentPage('main')} />
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
                    onClick={() => setIsTestModalOpen(true)}
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

          {/* Scene area */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Project toolbar */}
            <div className="h-10 flex items-center gap-4 px-4 border-b bg-white shrink-0">
              <button className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
                New Project
              </button>
              <span className="text-sm text-slate-400">Project Name</span>
              <button className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
                Save
              </button>
            </div>
            {/* Scene - never scrolls */}
            <div className="flex-1 flex items-center justify-center bg-slate-50 overflow-hidden">
              <div className="text-2xl text-slate-400 font-light">
                SCENE
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Modals */}
      <TestModal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} />
      <AuthModal
        isOpen={authModalMode !== null}
        onClose={() => setAuthModalMode(null)}
        mode={authModalMode ?? 'signin'}
        onAuthSuccess={handleAuthSuccess}
      />
      <AuthPendingModal
        isOpen={!!authPendingError}
        message={authPendingError}
        details={authPendingDetails}
        onClose={() => {
          setAuthPendingError(null)
          setAuthPendingDetails(null)
        }}
      />
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={handleOnboardingClose}
        onGoToFaq={handleGoToFaq}
      />
    </div>
  )
}

export default App
