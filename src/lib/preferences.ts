import { Store, useStore } from '@tanstack/react-store'
import type { WeightUnit } from '#/lib/types'

export interface Preferences {
  unit: WeightUnit
}

const STORAGE_KEY = 'heavy-duty:preferences'

export const preferencesStore = new Store<Preferences>({ unit: 'kg' })

let hydrated = false

export function hydratePreferences() {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Partial<Preferences>
    if (parsed.unit === 'kg' || parsed.unit === 'lb') {
      preferencesStore.setState((state) => ({ ...state, unit: parsed.unit! }))
    }
  } catch {
    // Ignore unreadable preferences and keep defaults.
  }
}

export function setUnit(unit: WeightUnit) {
  preferencesStore.setState((state) => ({ ...state, unit }))
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...preferencesStore.state, unit }),
      )
    } catch {
      // Storage can be unavailable in private browsing; the app still works.
    }
  }
}

export function useUnit(): WeightUnit {
  return useStore(preferencesStore, (state) => state.unit)
}
