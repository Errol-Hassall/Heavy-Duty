import type { MuscleGroup } from './types'

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  calves: 'Calves',
  abs: 'Abs',
}

export const EQUIPMENT_LABELS: Record<
  'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight',
  string
> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
}

export const STATUS_LABELS = {
  completed: 'Completed',
  in_progress: 'In progress',
} as const

export interface SupersetLabel {
  label: string
  isSuperset: boolean
}

/**
 * Label exercises for supersets: A1, A2, B1… Exercises not in a group of two
 * or more get an empty label.
 */
export function supersetLabels(
  groups: Array<number | null | undefined>,
): SupersetLabel[] {
  const counts = new Map<number, number>()
  for (const group of groups) {
    if (group === null || group === undefined) continue
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }

  const letters = new Map<number, string>()
  let nextLetter = 65
  const positions = new Map<number, number>()

  return groups.map((group) => {
    if (group === null || group === undefined || (counts.get(group) ?? 0) < 2) {
      return { label: '', isSuperset: false }
    }
    if (!letters.has(group)) {
      letters.set(group, String.fromCharCode(nextLetter))
      nextLetter += 1
    }
    const position = (positions.get(group) ?? 0) + 1
    positions.set(group, position)
    return {
      label: `${letters.get(group)}${position}`,
      isSuperset: true,
    }
  })
}

export interface SupersetBlock {
  /** Index of the first exercise in the block. */
  start: number
  /** Number of consecutive exercises in the block. */
  length: number
  /** Group letter when the block is a superset, otherwise null. */
  letter: string | null
}

/**
 * Split exercises into consecutive render blocks. Each standalone exercise is
 * its own block; adjacent exercises in the same superset share a block so they
 * can be framed together, while separate supersets stay visually distinct.
 */
export function supersetBlocks(
  groups: Array<number | null | undefined>,
): SupersetBlock[] {
  const labels = supersetLabels(groups)
  const blocks: SupersetBlock[] = []

  labels.forEach((label, index) => {
    const letter = label.isSuperset ? label.label.charAt(0) : null
    const previous = blocks[blocks.length - 1]
    if (
      letter !== null &&
      previous?.letter === letter &&
      previous.start + previous.length === index
    ) {
      previous.length += 1
      return
    }
    blocks.push({ start: index, length: 1, letter })
  })

  return blocks
}
