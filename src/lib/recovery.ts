import { daysSince, todayISO } from '#/lib/dates'

export const DEFAULT_RECOVERY_HOURS = 96
export const RECOVERY_HOURS_MIN = 1
export const RECOVERY_HOURS_MAX = 1440

export interface RecoveryState {
  /** Whole calendar days since the last completed session, null when there is none. */
  days: number | null
  /** Whole hours elapsed since the last completed session (0 when there is none). */
  elapsedHours: number
  ready: boolean
  /** Progress toward the window, 0–100. */
  pct: number
  remainingHours: number
}

/**
 * Sessions are dated to the day, so elapsed time is whole days × 24 hours.
 */
export function recoveryStatus(
  lastCompletedISO: string | null,
  windowHours: number,
  today = todayISO(),
): RecoveryState {
  if (!lastCompletedISO) {
    return {
      days: null,
      elapsedHours: 0,
      ready: false,
      pct: 0,
      remainingHours: windowHours,
    }
  }
  const days = Math.max(0, daysSince(lastCompletedISO, today))
  const elapsedHours = days * 24
  return {
    days,
    elapsedHours,
    ready: elapsedHours >= windowHours,
    pct: Math.min(100, (elapsedHours / windowHours) * 100),
    remainingHours: Math.max(0, windowHours - elapsedHours),
  }
}

/** '1 day' and '4 days' for multiples of a day, whole hours otherwise. */
export function formatRecoveryDuration(hours: number): string {
  if (hours % 24 === 0) {
    const days = hours / 24
    return `${days} ${days === 1 ? 'day' : 'days'}`
  }
  return `${hours} hours`
}

export function isRecoveryHours(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= RECOVERY_HOURS_MIN &&
    value <= RECOVERY_HOURS_MAX
  )
}
