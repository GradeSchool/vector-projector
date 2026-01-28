import { useEffect, useRef, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { safeLocalGet, safeLocalSet, safeLocalRemove } from '@/lib/storage'

const SESSION_KEY = 'vp_session_id'
const TAB_CHANNEL = 'vp_tab_coordination'

interface UseSessionResult {
  sessionId: string | null
  isSessionValid: boolean | undefined
  isDuplicateTab: boolean
  wasKicked: boolean
  clearKicked: () => void
  setSessionId: (id: string) => void
  clearSession: () => void
}

export function useSession(isAuthenticated: boolean): UseSessionResult {
  const [sessionId, setSessionIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return safeLocalGet(SESSION_KEY)
    }
    return null
  })
  const [isDuplicateTab, setIsDuplicateTab] = useState(false)
  const [kickedFlag, setKickedFlag] = useState(false)
  const tabId = useRef(crypto.randomUUID())
  const channelRef = useRef<BroadcastChannel | null>(null)

  // Validate session against server
  const sessionValidation = useQuery(
    api.users.validateSession,
    isAuthenticated && sessionId ? { sessionId } : "skip"
  )

  const isSessionValid = sessionValidation?.valid

  // Compute wasKicked from validation result or explicit flag
  const wasKicked = kickedFlag ||
    (sessionValidation !== undefined && !sessionValidation.valid && sessionValidation.reason === 'session_invalidated')

  // Clear localStorage when kicked (side effect)
  useEffect(() => {
    if (wasKicked && sessionId) {
      safeLocalRemove(SESSION_KEY)
    }
  }, [wasKicked, sessionId])

  // BroadcastChannel for duplicate tab detection
  // Only matters when we have a session (authenticated with sessionId)
  // Wrapped in try/catch - BroadcastChannel may not be available in all contexts
  useEffect(() => {
    if (typeof window === 'undefined' || !sessionId) return

    let channel: BroadcastChannel | null = null
    let checkTimeout: ReturnType<typeof setTimeout> | null = null

    try {
      channel = new BroadcastChannel(TAB_CHANNEL)
      channelRef.current = channel

      // Listen for other tabs
      channel.onmessage = (e) => {
        if (e.data.type === 'TAB_CHECK' && e.data.tabId !== tabId.current) {
          // Another tab is checking - respond to let it know we exist
          channel?.postMessage({ type: 'TAB_EXISTS', tabId: tabId.current })
        }
        if (e.data.type === 'TAB_EXISTS' && e.data.tabId !== tabId.current) {
          // Got response - another tab exists, we are the duplicate
          setIsDuplicateTab(true)
        }
      }

      // Small delay to ensure other tabs have their listeners set up
      checkTimeout = setTimeout(() => {
        channel?.postMessage({ type: 'TAB_CHECK', tabId: tabId.current })
      }, 100)
    } catch {
      // BroadcastChannel not available - duplicate tab detection disabled
      // This is fine, the feature just won't work
    }

    return () => {
      if (checkTimeout) clearTimeout(checkTimeout)
      if (channel) {
        try {
          channel.close()
        } catch {
          // Ignore close errors
        }
      }
      channelRef.current = null
    }
  }, [sessionId])

  // Set session ID (called after sign-in)
  const setSessionId = (id: string) => {
    safeLocalSet(SESSION_KEY, id)
    setSessionIdState(id)
    setKickedFlag(false)
  }

  // Clear session (called on sign-out)
  const clearSession = () => {
    safeLocalRemove(SESSION_KEY)
    setSessionIdState(null)
    setKickedFlag(false)
  }

  // Clear kicked state (for dismissing the message)
  const clearKicked = () => {
    setKickedFlag(false)
    setSessionIdState(null)
  }

  return {
    sessionId,
    isSessionValid,
    isDuplicateTab,
    wasKicked,
    clearKicked,
    setSessionId,
    clearSession,
  }
}
