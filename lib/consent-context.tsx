'use client'

/**
 * Cookie consent state container.
 * ===============================
 * Holds the visitor's cookie preferences across the whole site.
 * Persisted in localStorage (survives sessions — a decision must not be
 * re-asked on every visit). Mirrors the BookingProvider shape: reducer +
 * hydrate-once-on-mount + persist-on-change.
 *
 * Consent Mode v2 is bootstrapped default-denied in the layout BEFORE GA4
 * loads; this container only ever sends the `update` signal afterwards.
 */

import * as React from 'react'

export interface ConsentState {
  /** Always true — strictly necessary cookies cannot be switched off. */
  necessary: true
  analytics: boolean
  marketing: boolean
  /** false = visitor has not answered yet → banner is shown. */
  decided: boolean
}

const initialState: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  decided: false,
}

type ConsentAction = { type: 'SET_CONSENT'; payload: { analytics: boolean; marketing: boolean } }

function consentReducer(state: ConsentState, action: ConsentAction): ConsentState {
  switch (action.type) {
    case 'SET_CONSENT':
      return {
        necessary: true,
        analytics: action.payload.analytics,
        marketing: action.payload.marketing,
        decided: true,
      }
    default:
      return state
  }
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = 'tb-consent'

interface StoredConsent {
  analytics: boolean
  marketing: boolean
}

function readStoredConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredConsent>
    // A stored record is only meaningful if both flags are real booleans;
    // anything else is corrupt → treat as "not decided" and re-ask.
    if (typeof parsed?.analytics !== 'boolean' || typeof parsed?.marketing !== 'boolean') {
      return null
    }
    return { analytics: parsed.analytics, marketing: parsed.marketing }
  } catch {
    // localStorage unavailable (private browsing, quota exceeded) — ignore
    return null
  }
}

function writeStoredConsent(value: StoredConsent): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // ignore
  }
}

// ── Consent Mode v2 update signal ─────────────────────────────────────────────

// `dataLayer` is already declared by @next/third-parties — only gtag is ours.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * Tell Google the visitor's choice. The default-denied state is already set by
 * the bootstrap script in the layout, so this only ever relaxes/keeps denials.
 * No-op when gtag is absent (NEXT_PUBLIC_GA_ID unset, or blocker installed).
 */
function pushConsentUpdate({ analytics, marketing }: StoredConsent): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('consent', 'update', {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
  })
}

// ── Context ───────────────────────────────────────────────────────────────────

const ConsentContext = React.createContext<{
  state: ConsentState
  /** false until localStorage has been read — consumers must not render yet. */
  isHydrated: boolean
  acceptAll: () => void
  rejectAll: () => void
  savePreferences: (prefs: { analytics: boolean; marketing: boolean }) => void
} | null>(null)

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(consentReducer, initialState)
  const [isHydrated, setIsHydrated] = React.useState(false)

  // Hydrate from localStorage once on mount. A previously stored decision must
  // be replayed to Consent Mode on every page load — the bootstrap script resets
  // to denied each time, so without this replay a returning visitor who accepted
  // would silently be treated as denied.
  React.useEffect(() => {
    const stored = readStoredConsent()
    if (stored) {
      dispatch({ type: 'SET_CONSENT', payload: stored })
      pushConsentUpdate(stored)
    }
    setIsHydrated(true)
  }, [])

  const setConsent = React.useCallback((prefs: { analytics: boolean; marketing: boolean }) => {
    dispatch({ type: 'SET_CONSENT', payload: prefs })
    writeStoredConsent(prefs)
    pushConsentUpdate(prefs)
  }, [])

  const acceptAll = React.useCallback(
    () => setConsent({ analytics: true, marketing: true }),
    [setConsent]
  )
  const rejectAll = React.useCallback(
    () => setConsent({ analytics: false, marketing: false }),
    [setConsent]
  )

  const value = React.useMemo(
    () => ({ state, isHydrated, acceptAll, rejectAll, savePreferences: setConsent }),
    [state, isHydrated, acceptAll, rejectAll, setConsent]
  )

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}

export function useConsent() {
  const context = React.useContext(ConsentContext)
  if (!context) {
    throw new Error('useConsent must be used within a ConsentProvider')
  }
  return context
}
