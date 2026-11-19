import { formatDate } from './dates'
import type { LastPerformance, WeightUnit } from './types'
import { formatWeight, roundLoad, toKg } from './units'

export const REP_MIN = 6
export const REP_MAX = 10

/**
 * Summarise the last completed working set for an exercise. The absolute date
 * is always included, so a session from months or years ago is still readable
 * at a glance.
 */
export function formatLastPerformance(
  last: Pick<LastPerformance, 'weightKg' | 'reps' | 'date'> | null,
  unit: WeightUnit,
): string {
  if (!last) return 'No previous performance'
  const weight = last.weightKg === null ? 'BW' : formatWeight(last.weightKg, unit)
  const reps = last.reps === null ? '—' : `${last.reps}`
  return `${weight} × ${reps} · ${formatDate(last.date, 'medium')}`
}

export interface NextTarget {
  weightKg: number | null
  reps: number
  kind: 'reps' | 'load' | 'start'
  label: string
}

/**
 * Heavy Duty double progression:
 * stay at the same load and add reps until the top of the range, then add
 * weight and restart at the bottom of the range.
 */
export function suggestNext(
  last: { weightKg: number | null; reps: number | null } | null,
  unit: WeightUnit,
): NextTarget {
  if (!last || last.reps === null) {
    return {
      weightKg: last?.weightKg ?? null,
      reps: REP_MIN,
      kind: 'start',
      label: 'Set a baseline',
    }
  }

  if (last.weightKg === null) {
    const reps = last.reps >= 12 ? REP_MIN : last.reps + 1
    return {
      weightKg: null,
      reps,
      kind: 'reps',
      label: `Beat ${last.reps} reps`,
    }
  }

  if (last.reps >= REP_MAX) {
    let nextWeight = roundLoad(last.weightKg * 1.05, unit)
    if (nextWeight <= last.weightKg) {
      nextWeight = roundLoad(
        last.weightKg + toKg(unit === 'kg' ? 2.5 : 5, unit),
        unit,
      )
    }
    return {
      weightKg: nextWeight,
      reps: REP_MIN,
      kind: 'load',
      label: 'Time to add weight',
    }
  }

  return {
    weightKg: last.weightKg,
    reps: last.reps + 1,
    kind: 'reps',
    label: `Beat ${last.reps} reps`,
  }
}
