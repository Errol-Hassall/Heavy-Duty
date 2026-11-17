import { describe, expect, it } from 'vitest'
import { supersetLabels } from '#/lib/labels'

describe('supersetLabels', () => {
  it('labels pairs with sequential letters and positions', () => {
    expect(supersetLabels([1, 1])).toEqual([
      { label: 'A1', isSuperset: true },
      { label: 'A2', isSuperset: true },
    ])
  })

  it('leaves ungrouped exercises blank', () => {
    expect(supersetLabels([null, undefined])).toEqual([
      { label: '', isSuperset: false },
      { label: '', isSuperset: false },
    ])
  })

  it('advances letters in order of first appearance', () => {
    expect(supersetLabels([2, 2, 1, 1])).toEqual([
      { label: 'A1', isSuperset: true },
      { label: 'A2', isSuperset: true },
      { label: 'B1', isSuperset: true },
      { label: 'B2', isSuperset: true },
    ])
  })

  it('supports groups interrupted by standalone exercises', () => {
    expect(supersetLabels([1, null, 1])).toEqual([
      { label: 'A1', isSuperset: true },
      { label: '', isSuperset: false },
      { label: 'A2', isSuperset: true },
    ])
  })

  it('treats a group of one as standalone', () => {
    expect(supersetLabels([1, null, 2, 2])).toEqual([
      { label: '', isSuperset: false },
      { label: '', isSuperset: false },
      { label: 'A1', isSuperset: true },
      { label: 'A2', isSuperset: true },
    ])
  })

  it('supports triples', () => {
    expect(supersetLabels([5, 5, 5])).toEqual([
      { label: 'A1', isSuperset: true },
      { label: 'A2', isSuperset: true },
      { label: 'A3', isSuperset: true },
    ])
  })

  it('returns an empty list for no exercises', () => {
    expect(supersetLabels([])).toEqual([])
  })
})
