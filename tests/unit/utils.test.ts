import { describe, expect, it } from 'vitest'
import { clamp, cn, formatNumber, pluralize } from '#/lib/utils'

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops false, null, and undefined values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })

  it('returns an empty string when nothing is provided', () => {
    expect(cn()).toBe('')
  })
})

describe('formatNumber', () => {
  it('rounds to the requested precision', () => {
    expect(formatNumber(1.234, 1)).toBe('1.2')
    expect(formatNumber(1.25, 1)).toBe('1.3')
    expect(formatNumber(62.5, 0)).toBe('63')
  })

  it('groups thousands', () => {
    expect(formatNumber(2590, 0)).toBe('2,590')
  })

  it('returns a dash for non-finite values', () => {
    expect(formatNumber(Number.NaN)).toBe('—')
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('—')
  })

  it('keeps negative values', () => {
    expect(formatNumber(-12.34, 1)).toBe('-12.3')
  })
})

describe('clamp', () => {
  it('clamps to the bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })
})

describe('pluralize', () => {
  it('uses the singular form for one', () => {
    expect(pluralize(1, 'set')).toBe('set')
  })

  it('uses the plural form otherwise', () => {
    expect(pluralize(0, 'set')).toBe('sets')
    expect(pluralize(2, 'set')).toBe('sets')
    expect(pluralize(2, 'mouse', 'mice')).toBe('mice')
  })
})
