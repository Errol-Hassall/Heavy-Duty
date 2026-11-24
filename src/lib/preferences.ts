import { Store, useStore } from '@tanstack/react-store'
import type { WeightUnit } from '#/lib/types'
import { DEFAULT_RECOVERY_HOURS, isRecoveryHours } from '#/lib/recovery'

export interface Preferences {
  unit: WeightUnit
  recoveryHours: number
}

const STORAGE_KEY = 'heavy-duty:preferences'

export const preferencesStore = new Store<Preferences>({
  unit: 'kg',
  recoveryHours: DEFAULT_RECOVERY_HOURS,
})

let hydrated = false

export function hydratePreferences() {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Partial<Preferences>
    preferencesStore.setState((state) => ({
      unit:
        parsed.unit === 'kg' || parsed.unit === 'lb' ? parsed.unit : state.unit,
      recoveryHours: isRecoveryHours(parsed.recoveryHours)
        ? parsed.recoveryHours
        : state.recoveryHours,
    }))
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

export function setRecoveryHours(hours: number) {
  preferencesStore.setState((state) => ({ ...state, recoveryHours: hours }))
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...preferencesStore.state, recoveryHours: hours }),
      )
    } catch {
      // Storage can be unavailable in private browsing; the app still works.
    }
  }
}

export function useUnit(): WeightUnit {
  return useStore(preferencesStore, (state) => state.unit)
}

export function useRecoveryHours(): number {
  return useStore(preferencesStore, (state) => state.recoveryHours)
}
