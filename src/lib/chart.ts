export interface Tick {
  value: number
  position: number
}

/** Generate human-friendly axis ticks covering a domain. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.05, 1)
    min -= pad
    max += pad
  }
  const span = max - min
  const rawStep = span / Math.max(1, count - 1)
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalised = rawStep / magnitude
  const stepMultiplier =
    normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10
  const step = stepMultiplier * magnitude
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step

  const ticks: number[] = []
  for (let value = start; value <= end + step * 0.001; value += step) {
    ticks.push(Number(value.toFixed(6)))
  }
  return ticks
}

/** Evenly sample indexes from a list, always including the first and last. */
export function sampleIndexes(length: number, count: number): number[] {
  if (length <= 0) return []
  if (length <= count) return Array.from({ length }, (_, index) => index)
  const results = new Set<number>()
  for (let index = 0; index < count; index++) {
    results.add(Math.round((index / (count - 1)) * (length - 1)))
  }
  return [...results].sort((a, b) => a - b)
}
