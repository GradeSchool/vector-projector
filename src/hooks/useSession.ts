import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

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
      return localStorage.getItem(SESSION_KEY)
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
  const wasKicked = useMemo(() => {
    if (kickedFlag) return true
    if (sessionValidation && !sessionValidation.valid && sessionValidation.reason === 'session_invalidated') {
      return true
    }
    return false
  }, [sessionValidation, kickedFlag])

  // Clear localStorage when kicked (side effect)
  useEffect(() => {
    if (wasKicked && sessionId) {
      localStorage.removeItem(SESSION_KEY)
    }
  }, [wasKicked, sessionId])

  // BroadcastChannel for duplicate tab detection
  // Only matters when we have a session (authenticated with sessionId)
  useEffect(() => {
    if (typeof window === 'undefined' || !sessionId) return

    const channel = new BroadcastChannel(TAB_CHANNEL)
    channelRef.current = channel

    // Listen for other tabs
    channel.onmessage = (e) => {
      if (e.data.type === 'TAB_CHECK' && e.data.tabId !== tabId.current) {
        // Another tab is checking - respond to let it know we exist
        channel.postMessage({ type: 'TAB_EXISTS', tabId: tabId.current })
      }
      if (e.data.type === 'TAB_EXISTS' && e.data.tabId !== tabId.current) {
        // Got response - another tab exists, we are the duplicate
        setIsDuplicateTab(true)
      }
    }

    // Small delay to ensure other tabs have their listeners set up
    const checkTimeout = setTimeout(() => {
      channel.postMessage({ type: 'TAB_CHECK', tabId: tabId.current })
    }, 100)

    return () => {
      clearTimeout(checkTimeout)
      channel.close()
      channelRef.current = null
    }
  }, [sessionId])

  // Set session ID (called after sign-in)
  const setSessionId = useCallback((id: string) => {
    localStorage.setItem(SESSION_KEY, id)
    setSessionIdState(id)
    setKickedFlag(false)
  }, [])

  // Clear session (called on sign-out)
  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setSessionIdState(null)
    setKickedFlag(false)
  }, [])

  // Clear kicked state (for dismissing the message)
  const clearKicked = useCallback(() => {
    setKickedFlag(false)
    setSessionIdState(null) // Also clear session state so useMemo recomputes
  }, [])

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
