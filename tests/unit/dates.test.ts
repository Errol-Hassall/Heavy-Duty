import { describe, expect, it } from 'vitest'
import {
  addDaysISO,
  daysBetweenISO,
  daysSince,
  formatDate,
  formatDayParts,
  formatDuration,
  formatMonth,
  formatShortDate,
  isISODate,
  parseISODate,
  relativeDate,
  todayISO,
  weekdayName,
} from '#/lib/dates'

describe('todayISO', () => {
  it('formats the local calendar date', () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(todayISO(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31')
  })

  it('zero-pads months and days', () => {
    expect(todayISO(new Date(2026, 8, 9))).toBe('2026-09-09')
  })
})

describe('isISODate', () => {
  it('accepts real calendar dates', () => {
    expect(isISODate('2026-11-18')).toBe(true)
    expect(isISODate('2024-02-29')).toBe(true)
    expect(isISODate('2000-02-29')).toBe(true)
  })

  it('rejects impossible and malformed dates', () => {
    expect(isISODate('2026-02-29')).toBe(false)
    expect(isISODate('2026-04-31')).toBe(false)
    expect(isISODate('2026-13-01')).toBe(false)
    expect(isISODate('2026-00-10')).toBe(false)
    expect(isISODate('2026-1-01')).toBe(false)
    expect(isISODate('18-11-2026')).toBe(false)
    expect(isISODate('')).toBe(false)
  })
})

describe('parseISODate', () => {
  it('returns a local date with the expected components', () => {
    const date = parseISODate('2026-11-18')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(10)
    expect(date.getDate()).toBe(18)
  })
})

describe('daysBetweenISO / daysSince', () => {
  it('counts whole calendar days in both directions', () => {
    expect(daysBetweenISO('2026-01-01', '2026-01-01')).toBe(0)
    expect(daysBetweenISO('2026-01-01', '2026-01-31')).toBe(30)
    expect(daysBetweenISO('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetweenISO('2026-01-10', '2026-01-01')).toBe(-9)
  })

  it('handles leap years and year boundaries', () => {
    expect(daysBetweenISO('2024-02-28', '2024-03-01')).toBe(2)
    expect(daysBetweenISO('2025-12-31', '2026-01-01')).toBe(1)
  })

  it('supports an explicit today value', () => {
    expect(daysSince('2026-11-01', '2026-11-18')).toBe(17)
  })
})

describe('addDaysISO', () => {
  it('adds and subtracts across boundaries', () => {
    expect(addDaysISO('2026-01-01', 30)).toBe('2026-01-31')
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDaysISO('2024-03-01', -1)).toBe('2024-02-29')
    expect(addDaysISO('2026-01-10', 0)).toBe('2026-01-10')
  })
})

describe('date formatting', () => {
  it('formats en-GB long, medium, and short dates', () => {
    expect(formatDate('2026-11-18', 'long')).toBe(
      'Wednesday, 18 November 2026',
    )
    expect(formatDate('2026-11-18', 'medium')).toBe('Wed, 18 Nov 2026')
    expect(formatDate('2026-11-18', 'short')).toBe('18 Nov')
    expect(formatDate('2026-11-18')).toBe('Wed, 18 Nov 2026')
  })

  it('formats a month heading', () => {
    expect(formatMonth('2026-11-01')).toBe('November 2026')
  })

  it('formats epoch timestamps for chart axes', () => {
    const timestamp = new Date(2026, 10, 18).getTime()
    expect(formatShortDate(timestamp)).toBe('18 Nov')
  })

  it('splits a date into calendar-box parts', () => {
    expect(formatDayParts('2026-11-18')).toEqual({
      day: '18',
      weekday: 'Wed',
      month: 'Nov',
    })
  })

  it('formats weekday names', () => {
    expect(weekdayName('2026-11-18')).toBe('Wednesday')
  })
})

describe('relativeDate', () => {
  const today = '2026-11-18'

  it('describes recent dates', () => {
    expect(relativeDate('2026-11-18', today)).toBe('Today')
    expect(relativeDate('2026-11-17', today)).toBe('Yesterday')
    expect(relativeDate('2026-11-15', today)).toBe('3 days ago')
    expect(relativeDate('2026-11-09', today)).toBe('Last week')
  })

  it('falls back to a short date for older entries', () => {
    expect(relativeDate('2026-10-20', today)).toBe('20 Oct')
  })
})

describe('formatDuration', () => {
  it('formats timer values', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(59)).toBe('0:59')
    expect(formatDuration(60)).toBe('1:00')
    expect(formatDuration(90.4)).toBe('1:30')
    expect(formatDuration(3599)).toBe('59:59')
    expect(formatDuration(3600)).toBe('60:00')
  })

  it('clamps negative values to zero', () => {
    expect(formatDuration(-10)).toBe('0:00')
  })
})
