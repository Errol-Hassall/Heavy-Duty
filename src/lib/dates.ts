const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Local (not UTC) date as YYYY-MM-DD. */
export function todayISO(date = new Date()): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  )
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Days between two ISO dates, counted in whole calendar days. */
export function daysBetweenISO(from: string, to: string): number {
  const a = parseISODate(from)
  const b = parseISODate(to)
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((utcB - utcA) / 86_400_000)
}

export function daysSince(isoDate: string, today = todayISO()): number {
  return daysBetweenISO(isoDate, today)
}

export function addDaysISO(isoDate: string, days: number): string {
  const date = parseISODate(isoDate)
  date.setDate(date.getDate() + days)
  return todayISO(date)
}

export function formatDate(
  isoDate: string,
  format: 'long' | 'medium' | 'short' = 'medium',
): string {
  const date = parseISODate(isoDate)
  if (format === 'long') {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
  }
  if (format === 'short') {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
    }).format(date)
  }
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatMonth(isoDate: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(parseISODate(isoDate))
}

/** Short date from an epoch timestamp, used by charts. */
export function formatShortDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(timestamp))
}

export function formatDayParts(isoDate: string): {
  day: string
  weekday: string
  month: string
} {
  const date = parseISODate(isoDate)
  return {
    day: `${date.getDate()}`,
    weekday: new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date),
    month: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date),
  }
}

export function relativeDate(isoDate: string, today = todayISO()): string {
  const days = daysBetweenISO(isoDate, today)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'Last week'
  return formatDate(isoDate, 'short')
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`
}

export function weekdayName(isoDate: string): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(
    parseISODate(isoDate),
  )
}
