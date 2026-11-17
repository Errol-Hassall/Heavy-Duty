import { describe, expect, it } from 'vitest'
import { KG_PER_LB } from '#/lib/units'
import {
  formatInputWeight,
  formatWeight,
  formatWeightDelta,
  roundLoad,
  toDisplayWeight,
  toKg,
  weightStep,
} from '#/lib/units'

describe('weight conversion', () => {
  it('converts kg to lb and back', () => {
    expect(toDisplayWeight(100, 'kg')).toBe(100)
    expect(toDisplayWeight(100, 'lb')).toBeCloseTo(220.4623, 4)
    expect(toKg(220.4623, 'lb')).toBeCloseTo(100, 4)
    expect(toKg(100, 'kg')).toBe(100)
  })

  it('round-trips lb values', () => {
    const pounds = toDisplayWeight(82.5, 'lb')
    expect(toKg(pounds, 'lb')).toBeCloseTo(82.5, 10)
  })

  it('exposes the exact pound conversion', () => {
    expect(KG_PER_LB).toBe(0.45359237)
  })

  it('uses sensible input steps', () => {
    expect(weightStep('kg')).toBe(0.5)
    expect(weightStep('lb')).toBe(1)
  })
})

describe('formatInputWeight', () => {
  it('formats editable values with at most one decimal', () => {
    expect(formatInputWeight(62.5, 'kg')).toBe('62.5')
    expect(formatInputWeight(62.54, 'kg')).toBe('62.5')
    expect(formatInputWeight(100, 'lb')).toBe('220.5')
  })

  it('returns an empty string for missing values', () => {
    expect(formatInputWeight(null, 'kg')).toBe('')
    expect(formatInputWeight(undefined, 'lb')).toBe('')
  })

  it('keeps zero as a real value', () => {
    expect(formatInputWeight(0, 'kg')).toBe('0')
  })
})

describe('formatWeight', () => {
  it('adds the unit suffix by default', () => {
    expect(formatWeight(62.5, 'kg')).toBe('62.5 kg')
    expect(formatWeight(100, 'lb')).toBe('220.5 lb')
  })

  it('can omit the unit for compact displays', () => {
    expect(formatWeight(62.5, 'kg', { withUnit: false })).toBe('62.5')
  })

  it('renders a dash for missing values', () => {
    expect(formatWeight(null, 'kg')).toBe('—')
    expect(formatWeight(undefined, 'lb')).toBe('—')
  })
})

describe('formatWeightDelta', () => {
  it('uses a plus sign for gains', () => {
    expect(formatWeightDelta(1.5, 'kg')).toBe('+1.5 kg')
  })

  it('uses a true minus sign for losses', () => {
    expect(formatWeightDelta(-2.5, 'kg')).toBe('−2.5 kg')
  })

  it('omits the sign for no change', () => {
    expect(formatWeightDelta(0, 'kg')).toBe('0 kg')
  })

  it('converts deltas to the display unit', () => {
    expect(formatWeightDelta(1, 'lb')).toBe('+2.2 lb')
  })
})

describe('roundLoad', () => {
  it('rounds to the nearest 2.5 kg', () => {
    expect(roundLoad(101.3, 'kg')).toBe(102.5)
    expect(roundLoad(100.6, 'kg')).toBe(100)
    expect(roundLoad(2.5, 'kg')).toBe(2.5)
  })

  it('rounds to the nearest 5 lb in imperial mode', () => {
    expect(roundLoad(100, 'lb')).toBeCloseTo(99.7903, 4)
    expect(roundLoad(102.3, 'lb')).toBeCloseTo(102.0583, 4)
  })
})
