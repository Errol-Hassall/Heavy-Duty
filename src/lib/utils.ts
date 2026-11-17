export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(' ')
}

/** Format a number without unnecessary trailing zeros. */
export function formatNumber(value: number, maxDecimals = 1): string {
  if (!Number.isFinite(value)) return '—'
  const rounded = Number(value.toFixed(maxDecimals))
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxDecimals,
  }).format(rounded)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural
}
