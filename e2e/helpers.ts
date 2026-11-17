import { expect, type Locator, type Page } from '@playwright/test'

/** The card that contains an exercise heading in the workout editor. */
export function exerciseCard(page: Page, name: string): Locator {
  return page.locator('.card-surface').filter({
    has: page.getByRole('heading', { name, exact: true }),
  })
}

/**
 * Wait for the editor's debounced auto-save to finish. The check first looks
 * for the dirty/saving state so a pre-existing "Saved" label cannot make the
 * assertion pass before the change is actually persisted.
 */
export async function waitForSaved(page: Page): Promise<void> {
  await expect(page.getByText(/Unsaved changes|Saving/)).toBeVisible({
    timeout: 5_000,
  })
  await expect(page.getByText(/^Saved/)).toBeVisible({ timeout: 20_000 })
}

/** Read the editor's completed-save counter. */
export async function saveCount(page: Page): Promise<number> {
  const value = await page
    .locator('[data-save-state]')
    .getAttribute('data-save-count')
  return Number(value ?? 0)
}

/** Wait until a save that started after `before` has landed. */
export async function waitForSaveCount(
  page: Page,
  before: number,
): Promise<void> {
  const status = page.locator('[data-save-state]')
  await expect(status).toHaveAttribute('data-save-state', 'saved', {
    timeout: 20_000,
  })
  await expect
    .poll(() => saveCount(page), { timeout: 20_000 })
    .toBeGreaterThan(before)
}

export async function fillWorkingSet(
  page: Page,
  exercise: string,
  weight: number | string,
  reps: number | string,
  unit: 'kg' | 'lb' = 'kg',
): Promise<void> {
  const card = exerciseCard(page, exercise)
  await card.getByLabel(`Working set weight in ${unit}`).fill(String(weight))
  await card.getByLabel('Working set reps').fill(String(reps))
}

export function isoOffset(days: number): string {
  // The app server and browser both run in UTC during E2E, so derive dates in
  // UTC rather than the test runner's local timezone.
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Match the app's `formatDate(iso, 'medium')` output. */
export function mediumDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

/** Add an exercise to the open workout through the picker dialog. */
export async function addExercise(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Add exercise' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Search exercises').fill(name)
  await dialog.getByRole('button', { name: new RegExp(name) }).click()
  await expect(dialog).toBeHidden()
}
