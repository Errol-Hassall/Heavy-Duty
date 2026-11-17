import { describe, expect, it } from 'vitest'
import {
  PROGRAMS,
  SPLIT_ROTATION,
  getProgram,
  nextProgram,
} from '#/lib/programs'
import { SEED_EXERCISES } from '#/server/seed-data'

describe('nextProgram', () => {
  it('starts a new lifter on Chest & Back', () => {
    expect(nextProgram(null).slug).toBe('chest-back')
  })

  it('advances through the split', () => {
    expect(nextProgram('chest-back').slug).toBe('legs-abs')
    expect(nextProgram('legs-abs').slug).toBe('shoulders-arms')
    expect(nextProgram('shoulders-arms').slug).toBe('chest-back')
  })

  it('keeps a full-body trainee on the full-body program', () => {
    expect(nextProgram('full-body').slug).toBe('full-body')
  })

  it('falls back to Chest & Back for unknown templates', () => {
    expect(nextProgram('something-else').slug).toBe('chest-back')
  })

  it('defines the expected rotation', () => {
    expect(SPLIT_ROTATION).toEqual([
      'chest-back',
      'legs-abs',
      'shoulders-arms',
    ])
  })
})

describe('getProgram', () => {
  it('finds a program by slug', () => {
    expect(getProgram('legs-abs')?.name).toBe('Legs & Abs')
  })

  it('returns null for missing input', () => {
    expect(getProgram(null)).toBeNull()
    expect(getProgram(undefined)).toBeNull()
    expect(getProgram('nope')).toBeNull()
  })
})

describe('program definitions', () => {
  const seedSlugs = new Set(SEED_EXERCISES.map((exercise) => exercise.slug))

  it('ships four programs with unique slugs and names', () => {
    expect(PROGRAMS).toHaveLength(4)
    expect(new Set(PROGRAMS.map((program) => program.slug)).size).toBe(4)
    expect(new Set(PROGRAMS.map((program) => program.name)).size).toBe(4)
  })

  it.each(PROGRAMS)('$name has a complete structure', (program) => {
    expect(program.day.length).toBeGreaterThan(0)
    expect(program.tagline.length).toBeGreaterThan(0)
    expect(program.description.length).toBeGreaterThan(0)
    expect(program.restDays).toMatch(/rest|train/i)
    expect(program.focus.length).toBeGreaterThan(0)
    expect(program.exercises.length).toBeGreaterThanOrEqual(5)
    expect(program.exercises.length).toBeLessThanOrEqual(12)
  })

  it.each(PROGRAMS)('$name has unique exercises in the library', (program) => {
    const slugs = program.exercises.map((exercise) => exercise.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(seedSlugs.has(slug)).toBe(true)
  })

  it.each(PROGRAMS)('$name only uses supersets with at least two members', (program) => {
    const counts = new Map<number, number>()
    for (const exercise of program.exercises) {
      if (exercise.superset === undefined) continue
      counts.set(exercise.superset, (counts.get(exercise.superset) ?? 0) + 1)
    }
    for (const count of counts.values()) expect(count).toBeGreaterThanOrEqual(2)
  })

  it('uses the A/B superset layout for Chest & Back', () => {
    const program = getProgram('chest-back')!
    expect(program.exercises.map((exercise) => exercise.superset ?? null)).toEqual([
      1, 1, null, null, null,
    ])
  })

  it('uses three supersets in the full-body starter', () => {
    const program = getProgram('full-body')!
    expect(program.exercises).toHaveLength(12)
    expect(
      new Set(
        program.exercises
          .map((exercise) => exercise.superset)
          .filter((group) => group !== undefined),
      ).size,
    ).toBe(3)
  })
})
