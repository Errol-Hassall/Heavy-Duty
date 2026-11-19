import { describe, expect, it } from 'vitest'
import {
  REP_MAX,
  REP_MIN,
  formatLastPerformance,
  suggestNext,
} from '#/lib/progression'

describe('formatLastPerformance', () => {
  it('summarises the last completed working set with an absolute date', () => {
    expect(
      formatLastPerformance({ weightKg: 90, reps: 8, date: '2026-10-14' }, 'kg'),
    ).toBe('90 kg × 8 · Wed, 14 Oct 2026')
  })

  it('converts the load into the display unit', () => {
    expect(
      formatLastPerformance({ weightKg: 100, reps: 5, date: '2026-10-14' }, 'lb'),
    ).toBe('220.5 lb × 5 · Wed, 14 Oct 2026')
  })

  it('labels bodyweight movements', () => {
    expect(
      formatLastPerformance({ weightKg: null, reps: 12, date: '2026-10-14' }, 'kg'),
    ).toBe('BW × 12 · Wed, 14 Oct 2026')
  })

  it('handles a missing rep count', () => {
    expect(
      formatLastPerformance({ weightKg: 60, reps: null, date: '2026-10-14' }, 'kg'),
    ).toBe('60 kg × — · Wed, 14 Oct 2026')
  })

  it('reports when there is no previous performance', () => {
    expect(formatLastPerformance(null, 'kg')).toBe('No previous performance')
  })
})

describe('suggestNext', () => {
  it('sets a baseline for a new movement', () => {
    expect(suggestNext(null, 'kg')).toEqual({
      weightKg: null,
      reps: REP_MIN,
      kind: 'start',
      label: 'Set a baseline',
    })
  })

  it('keeps a known load when reps have never been recorded', () => {
    expect(suggestNext({ weightKg: 100, reps: null }, 'kg')).toEqual({
      weightKg: 100,
      reps: REP_MIN,
      kind: 'start',
      label: 'Set a baseline',
    })
  })

  it('adds a rep at the same load inside the range', () => {
    expect(suggestNext({ weightKg: 60, reps: 8 }, 'kg')).toEqual({
      weightKg: 60,
      reps: 9,
      kind: 'reps',
      label: 'Beat 8 reps',
    })
  })

  it('moves from 6 to 7 reps', () => {
    expect(suggestNext({ weightKg: 60, reps: 6 }, 'kg').reps).toBe(7)
  })

  it('adds weight after reaching the top of the range', () => {
    const target = suggestNext({ weightKg: 100, reps: REP_MAX }, 'kg')
    expect(target.kind).toBe('load')
    expect(target.reps).toBe(REP_MIN)
    expect(target.weightKg).toBeGreaterThan(100)
    expect(target.weightKg).toBe(105)
    expect(target.label).toBe('Time to add weight')
  })

  it('falls back to a minimum jump when 5% would not round up', () => {
    const target = suggestNext({ weightKg: 1, reps: 10 }, 'kg')
    expect(target.kind).toBe('load')
    // 1.05 kg rounds back to 0 at the 2.5 kg step, so the fallback adds a
    // 2.5 kg increment before rounding to the nearest available load.
    expect(target.weightKg).toBe(2.5)
    expect(target.weightKg).toBeGreaterThan(1)
  })

  it('rounds imperial loads in 5 lb increments', () => {
    const target = suggestNext({ weightKg: 45.359237, reps: 10 }, 'lb')
    expect(target.kind).toBe('load')
    expect(target.weightKg).toBeGreaterThan(45.359237)
  })

  it('adds reps for bodyweight movements', () => {
    expect(suggestNext({ weightKg: null, reps: 8 }, 'kg')).toEqual({
      weightKg: null,
      reps: 9,
      kind: 'reps',
      label: 'Beat 8 reps',
    })
  })

  it('resets high-rep bodyweight work to the bottom of the range', () => {
    expect(suggestNext({ weightKg: null, reps: 12 }, 'kg')).toEqual({
      weightKg: null,
      reps: REP_MIN,
      kind: 'reps',
      label: 'Beat 12 reps',
    })
  })
})
