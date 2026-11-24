import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RECOVERY_HOURS,
  RECOVERY_HOURS_MAX,
  RECOVERY_HOURS_MIN,
  formatRecoveryDuration,
  isRecoveryHours,
  recoveryStatus,
} from '#/lib/recovery'

describe('recoveryStatus', () => {
  const today = '2026-11-25'

  it('reports no completed session as not started', () => {
    expect(recoveryStatus(null, 96, today)).toEqual({
      days: null,
      elapsedHours: 0,
      ready: false,
      pct: 0,
      remainingHours: 96,
    })
  })

  it('keeps the default 96h window behaviour', () => {
    expect(DEFAULT_RECOVERY_HOURS).toBe(96)
    // Three days in: recovering at 75%, one day to go.
    expect(recoveryStatus('2026-11-22', 96, today)).toEqual({
      days: 3,
      elapsedHours: 72,
      ready: false,
      pct: 75,
      remainingHours: 24,
    })
    // Four days in: the window has just cleared.
    expect(recoveryStatus('2026-11-21', 96, today)).toEqual({
      days: 4,
      elapsedHours: 96,
      ready: true,
      pct: 100,
      remainingHours: 0,
    })
  })

  it('supports windows that are not multiples of a day', () => {
    // 72h elapsed against an 80h window.
    expect(recoveryStatus('2026-11-22', 80, today)).toEqual({
      days: 3,
      elapsedHours: 72,
      ready: false,
      pct: 90,
      remainingHours: 8,
    })
    // 96h elapsed clears the same window.
    expect(recoveryStatus('2026-11-21', 80, today).ready).toBe(true)
  })

  it('caps progress at 100 and never reports negative time left', () => {
    const state = recoveryStatus('2026-10-01', 48, today)
    expect(state.ready).toBe(true)
    expect(state.pct).toBe(100)
    expect(state.remainingHours).toBe(0)
  })

  it('clamps future dates to zero elapsed time', () => {
    const state = recoveryStatus('2026-11-30', 96, today)
    expect(state.days).toBe(0)
    expect(state.elapsedHours).toBe(0)
    expect(state.ready).toBe(false)
    expect(state.remainingHours).toBe(96)
  })

  it('treats a same-day session as zero hours elapsed', () => {
    expect(recoveryStatus(today, 1, today)).toEqual({
      days: 0,
      elapsedHours: 0,
      ready: false,
      pct: 0,
      remainingHours: 1,
    })
  })
})

describe('formatRecoveryDuration', () => {
  it('uses whole days when the hours divide evenly', () => {
    expect(formatRecoveryDuration(24)).toBe('1 day')
    expect(formatRecoveryDuration(96)).toBe('4 days')
  })

  it('falls back to hours otherwise', () => {
    expect(formatRecoveryDuration(8)).toBe('8 hours')
    expect(formatRecoveryDuration(36)).toBe('36 hours')
  })
})

describe('isRecoveryHours', () => {
  it('accepts whole hours inside the bounds', () => {
    expect(isRecoveryHours(RECOVERY_HOURS_MIN)).toBe(true)
    expect(isRecoveryHours(96)).toBe(true)
    expect(isRecoveryHours(RECOVERY_HOURS_MAX)).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isRecoveryHours(0)).toBe(false)
    expect(isRecoveryHours(1.5)).toBe(false)
    expect(isRecoveryHours(RECOVERY_HOURS_MAX + 1)).toBe(false)
    expect(isRecoveryHours('96')).toBe(false)
    expect(isRecoveryHours(null)).toBe(false)
  })
})
