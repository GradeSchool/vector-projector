/**
 * Safe storage access utilities.
 * localStorage/sessionStorage can throw in private browsing mode,
 * restricted contexts, or when storage is full.
 */

export function safeLocalGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeLocalSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Silently fail - storage unavailable
  }
}

export function safeLocalRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Silently fail - storage unavailable
  }
}

export function safeSessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // Silently fail - storage unavailable
  }
}

export function safeSessionRemove(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // Silently fail - storage unavailable
  }
}
