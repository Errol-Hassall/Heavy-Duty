import { formatNumber } from './utils'
import type { WeightUnit } from './types'

export const KG_PER_LB = 0.45359237
const LB_PER_KG = 1 / KG_PER_LB

export function toDisplayWeight(weightKg: number, unit: WeightUnit): number {
  return unit === 'kg' ? weightKg : weightKg * LB_PER_KG
}

export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB
}

export function weightStep(unit: WeightUnit): number {
  return unit === 'kg' ? 0.5 : 1
}

/** Weight for an editable input (`62.5`, `135`). */
export function formatInputWeight(
  weightKg: number | null | undefined,
  unit: WeightUnit,
): string {
  if (weightKg === null || weightKg === undefined) return ''
  return formatNumber(toDisplayWeight(weightKg, unit), 1)
}

/** Weight with unit suffix (`62.5 kg`). */
export function formatWeight(
  weightKg: number | null | undefined,
  unit: WeightUnit,
  options: { withUnit?: boolean } = {},
): string {
  if (weightKg === null || weightKg === undefined) return '—'
  const value = formatNumber(toDisplayWeight(weightKg, unit), 1)
  return options.withUnit === false ? value : `${value} ${unit}`
}

/** Difference between two weights, e.g. `+1.5 kg`. */
export function formatWeightDelta(
  deltaKg: number,
  unit: WeightUnit,
): string {
  const value = formatNumber(toDisplayWeight(Math.abs(deltaKg), unit), 1)
  const sign = deltaKg > 0 ? '+' : deltaKg < 0 ? '−' : ''
  return `${sign}${value} ${unit}`
}

/** Round a target load to a realistic jump in the active unit. */
export function roundLoad(weightKg: number, unit: WeightUnit): number {
  const increment = unit === 'kg' ? 2.5 : 5
  const display = toDisplayWeight(weightKg, unit)
  const rounded = Math.round(display / increment) * increment
  return toKg(rounded, unit)
}
