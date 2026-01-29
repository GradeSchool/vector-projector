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
  const tabOpenedAt = useRef<number | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)

  // Validate session against server
  const sessionValidation = useQuery(
    api.users.validateSession,
    isAuthenticated && sessionId ? { sessionId } : "skip"
  )

  const isSessionValid = sessionValidation?.valid

  const isSessionIdInvalid = sessionValidation?.reason === 'invalid_session_id'
  const effectiveSessionId = isSessionIdInvalid ? null : sessionId

  // Compute wasKicked from validation result or explicit flag
  const wasKicked = kickedFlag ||
    (sessionValidation !== undefined && !sessionValidation.valid && sessionValidation.reason === 'session_invalidated')

  useEffect(() => {
    if (isSessionIdInvalid) {
      safeLocalRemove(SESSION_KEY)
    }
  }, [isSessionIdInvalid])

  // Clear localStorage when kicked (side effect)
  useEffect(() => {
    if (wasKicked && effectiveSessionId) {
      safeLocalRemove(SESSION_KEY)
    }
  }, [wasKicked, effectiveSessionId])

  // BroadcastChannel for duplicate tab detection
  // Only matters when we have a session (authenticated with sessionId)
  // Wrapped in try/catch - BroadcastChannel may not be available in all contexts
  useEffect(() => {
    if (typeof window === 'undefined' || !effectiveSessionId) return

    let channel: BroadcastChannel | null = null
    let checkTimeout: ReturnType<typeof setTimeout> | null = null
    if (tabOpenedAt.current === null) {
      tabOpenedAt.current = Date.now()
    }
    const isDuplicateFor = (otherOpenedAt: number, otherTabId: string) => {
      const currentOpenedAt = tabOpenedAt.current ?? 0
      if (otherOpenedAt < currentOpenedAt) return true
      if (otherOpenedAt > currentOpenedAt) return false
      return otherTabId.localeCompare(tabId.current) < 0
    }

    try {
      channel = new BroadcastChannel(TAB_CHANNEL)
      channelRef.current = channel

      // Listen for other tabs
      channel.onmessage = (e) => {
        if (e.data.type === 'TAB_CHECK' && e.data.tabId !== tabId.current) {
          // Another tab is checking - respond to let it know we exist
          channel?.postMessage({
            type: 'TAB_EXISTS',
            tabId: tabId.current,
            openedAt: tabOpenedAt.current ?? Date.now(),
          })
        }
        if (e.data.type === 'TAB_EXISTS' && e.data.tabId !== tabId.current) {
          // Mark duplicate only if the other tab existed first
          if (isDuplicateFor(e.data.openedAt, e.data.tabId)) {
            setIsDuplicateTab(true)
          }
        }
      }

      // Small delay to ensure other tabs have their listeners set up
      checkTimeout = setTimeout(() => {
        channel?.postMessage({
          type: 'TAB_CHECK',
          tabId: tabId.current,
          openedAt: tabOpenedAt.current ?? Date.now(),
        })
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
  }, [effectiveSessionId])

  const clearSessionState = () => {
    safeLocalRemove(SESSION_KEY)
    setSessionIdState(null)
    setKickedFlag(false)
  }

  // Set session ID (called after sign-in)
  const setSessionId = (id: string) => {
    safeLocalSet(SESSION_KEY, id)
    setSessionIdState(id)
    setKickedFlag(false)
    setIsDuplicateTab(false)
  }

  // Clear session (called on sign-out)
  const clearSession = () => {
    clearSessionState()
    setIsDuplicateTab(false)
  }

  // Clear kicked state (for dismissing the message)
  const clearKicked = () => {
    setKickedFlag(false)
    setSessionIdState(null)
    setIsDuplicateTab(false)
  }

  return {
    sessionId: effectiveSessionId,
    isSessionValid,
    isDuplicateTab: effectiveSessionId ? isDuplicateTab : false,
    wasKicked,
    clearKicked,
    setSessionId,
    clearSession,
  }
}
