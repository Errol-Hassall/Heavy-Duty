import { describe, expect, it } from 'vitest'
import { supersetBlocks, supersetLabels } from '#/lib/labels'

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

describe('supersetBlocks', () => {
  it('keeps adjacent separate supersets in their own blocks', () => {
    expect(supersetBlocks([1, 1, 2, 2])).toEqual([
      { start: 0, length: 2, letter: 'A' },
      { start: 2, length: 2, letter: 'B' },
    ])
  })

  it('renders standalone exercises separately', () => {
    expect(supersetBlocks([null, 1, 1])).toEqual([
      { start: 0, length: 1, letter: null },
      { start: 1, length: 2, letter: 'A' },
    ])
  })

  it('splits a group interrupted by a standalone exercise', () => {
    expect(supersetBlocks([1, null, 1])).toEqual([
      { start: 0, length: 1, letter: 'A' },
      { start: 1, length: 1, letter: null },
      { start: 2, length: 1, letter: 'A' },
    ])
  })

  it('treats a group of one as standalone', () => {
    expect(supersetBlocks([1, null, 2, 2])).toEqual([
      { start: 0, length: 1, letter: null },
      { start: 1, length: 1, letter: null },
      { start: 2, length: 2, letter: 'A' },
    ])
  })

  it('returns no blocks for no exercises', () => {
    expect(supersetBlocks([])).toEqual([])
  })
})
