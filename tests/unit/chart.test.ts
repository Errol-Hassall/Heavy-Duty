import { describe, expect, it } from 'vitest'
import { niceTicks, sampleIndexes } from '#/lib/chart'

describe('niceTicks', () => {
  it('builds ascending ticks that cover the domain', () => {
    const ticks = niceTicks(57.2, 68.4, 4)
    expect(ticks.length).toBeGreaterThanOrEqual(4)
    expect(ticks[0]).toBeLessThanOrEqual(57.2)
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(68.4)
    for (let index = 1; index < ticks.length; index++) {
      expect(ticks[index]).toBeGreaterThan(ticks[index - 1])
    }
  })

  it('uses a consistent step', () => {
    const ticks = niceTicks(0, 100, 5)
    const step = ticks[1] - ticks[0]
    for (let index = 2; index < ticks.length; index++) {
      expect(ticks[index] - ticks[index - 1]).toBeCloseTo(step, 6)
    }
  })

  it('expands a flat domain', () => {
    const ticks = niceTicks(80, 80, 4)
    expect(ticks).toContain(80)
    expect(ticks[0]).toBeLessThan(80)
    expect(ticks[ticks.length - 1]).toBeGreaterThan(80)
  })

  it('handles negative and fractional domains', () => {
    const ticks = niceTicks(-12.5, -3.5, 4)
    expect(ticks[0]).toBeLessThanOrEqual(-12.5)
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(-3.5)
  })

  it('returns an empty list for non-finite input', () => {
    expect(niceTicks(Number.NaN, 10)).toEqual([])
    expect(niceTicks(0, Number.POSITIVE_INFINITY)).toEqual([])
  })
})

describe('sampleIndexes', () => {
  it('returns an empty list for an empty series', () => {
    expect(sampleIndexes(0, 4)).toEqual([])
  })

  it('returns every index when the series is short', () => {
    expect(sampleIndexes(2, 4)).toEqual([0, 1])
    expect(sampleIndexes(3, 3)).toEqual([0, 1, 2])
  })

  it('always includes the first and last point', () => {
    const indexes = sampleIndexes(10, 4)
    expect(indexes).toEqual([0, 3, 6, 9])
  })

  it('never duplicates indexes', () => {
    const indexes = sampleIndexes(100, 4)
    expect(new Set(indexes).size).toBe(indexes.length)
    expect(indexes[0]).toBe(0)
    expect(indexes[indexes.length - 1]).toBe(99)
  })

  it('handles a single point', () => {
    expect(sampleIndexes(1, 3)).toEqual([0])
  })
})
