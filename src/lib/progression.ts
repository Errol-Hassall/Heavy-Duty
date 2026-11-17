import type { WeightUnit } from './types'
import { roundLoad, toKg } from './units'

export const REP_MIN = 6
export const REP_MAX = 10

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
