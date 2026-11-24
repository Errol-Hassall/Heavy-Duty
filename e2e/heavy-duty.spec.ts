import { expect, test } from '@playwright/test'
import {
  addExercise,
  exerciseCard,
  fillWorkingSet,
  isoOffset,
  mediumDate,
  saveCount,
  waitForSaveCount,
  waitForSaved,
} from './helpers'

// The suite walks through one long, realistic training history. Serial mode
// keeps the shared SQLite database deterministic across the interactions.
test.describe.configure({ mode: 'serial' })

const TODAY = isoOffset(0)
const BASELINE = isoOffset(-47)
const MID = isoOffset(-17)
const BACKFILL = isoOffset(-21)

const CUSTOM_TITLE = 'Chest & Back — Heavy'

const CHEST_BACK_EXERCISES = [
  'Dumbbell Flye',
  'Incline Bench Press',
  'Machine Pullover',
  'Close-Grip Underhand Pulldown',
  'Deadlift',
]

const FULL_BODY_EXERCISES = [
  'Leg Extension',
  'Leg Press',
  'Lying Leg Curl',
  'Standing Calf Raise',
  'Deadlift',
  'Barbell Row',
  'Pull-Up',
  'Dumbbell Flye',
  'Incline Bench Press',
  'Lateral Raise',
  'Barbell Curl',
  'Triceps Pressdown',
]

test('starts empty, navigates the shell, and renders not-found pages', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: /Train less/ }),
  ).toBeVisible()
  await expect(page.getByText('No sessions logged yet.')).toBeVisible()
  await expect(page.getByText('No entries yet.')).toBeVisible()
  await expect(page.getByText('Not started').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Day 1' })).toBeVisible()

  // First-run totals: no work logged, but the seeded library is ready.
  await expect(
    page.getByText('Sessions', { exact: true }).locator('..'),
  ).toContainText('0')
  await expect(
    page.getByText('Sets to failure', { exact: true }).locator('..'),
  ).toContainText('0')
  await expect(
    page.getByText('Movements', { exact: true }).locator('..'),
  ).toContainText('36')

  const nav = page.getByRole('navigation', { name: 'Main' })
  await nav.getByRole('link', { name: 'Workouts', exact: true }).click()
  await expect(page).toHaveURL(/\/workouts$/)
  await expect(
    page.getByRole('heading', { name: 'No sessions yet' }),
  ).toBeVisible()

  await nav.getByRole('link', { name: 'Exercises', exact: true }).click()
  await expect(page).toHaveURL(/\/exercises$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Exercises' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /Dumbbell Flye/ })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Chest · 6' }),
  ).toBeVisible()

  await nav.getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page).toHaveURL(/\/progress$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Progress' }),
  ).toBeVisible()
  await expect(
    page.getByText('Add your bodyweight to start the trend.'),
  ).toBeVisible()
  await expect(
    page.getByText('Log a working set to unlock exercise trends.'),
  ).toBeVisible()

  await nav.getByRole('link', { name: 'Programs', exact: true }).click()
  await expect(page).toHaveURL(/\/programs$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Heavy Duty programs' }),
  ).toBeVisible()
  await expect(page.getByText('One set to failure')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Chest & Back' })).toBeVisible()

  await page.goto('/exercises/999999')
  await expect(page.getByText('Error 404')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Off the bar path' }),
  ).toBeVisible()

  await page.goto('/workouts/999999')
  await expect(page.getByText('Error 404')).toBeVisible()
})

test('validates and stores bodyweight and plots the progress trend', async ({
  page,
}) => {
  await page.goto('/')

  const weight = page.getByLabel('Bodyweight in kg').first()
  await weight.fill('9999')
  await page.getByRole('button', { name: 'Log', exact: true }).first().click()
  await expect(
    page.getByText('That seems out of range. Check the number and unit.'),
  ).toBeVisible()

  // Bodyweight accepts tenths rather than only whole/half kilos.
  await weight.fill('77.1')
  await page.getByRole('button', { name: 'Log', exact: true }).first().click()
  await expect(page.getByText('Bodyweight saved.')).toBeVisible()

  await page.reload()
  await expect(page.getByText('77.1', { exact: true }).first()).toBeVisible()

  await page.goto('/progress')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Progress' }),
  ).toBeVisible()

  const addBodyweight = async (date: string, value: string) => {
    await page.getByLabel('Date').fill(date)
    await page.getByLabel('Bodyweight in kg').fill(value)
    await page.getByRole('button', { name: 'Log', exact: true }).click()
    await expect(page.getByText('Bodyweight saved.')).toBeVisible()
  }

  await addBodyweight(BASELINE, '85')
  await addBodyweight(MID, '83')

  await expect(
    page.getByText('Entries', { exact: true }).locator('..'),
  ).toContainText('3')
  await expect(
    page.getByText('Starting', { exact: true }).locator('..'),
  ).toContainText('85 kg')
  await expect(
    page.getByText('All-time change', { exact: true }).locator('..'),
  ).toContainText('7.9 kg')
  await expect(page.getByText('Last logged today')).toBeVisible()

  const chart = page.getByRole('img', {
    name: 'Trend chart with 3 data points',
  })
  await expect(chart).toBeVisible()

  await page
    .getByRole('button', { name: `${mediumDate(MID)}: 83 kg` })
    .focus()
  const tooltip = page.getByTestId('chart-tooltip')
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toContainText('83 kg')
  await expect(tooltip).toContainText(/Tap to (pin|unpin)/)

  const range = page.getByRole('group', { name: 'Bodyweight chart range' })
  await range.getByRole('button', { name: '3M' }).click()
  await expect(range.getByRole('button', { name: '3M' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(chart).toBeVisible()
  await range.getByRole('button', { name: 'All' }).click()
  await expect(range.getByRole('button', { name: 'All' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  // Recent entries show the long-form date for the older weigh-ins.
  await expect(page.getByText(mediumDate(BASELINE)).first()).toBeVisible()
  await expect(page.getByText(mediumDate(MID)).first()).toBeVisible()
})

test('logs a full Chest & Back session with warm-ups, notes, supersets, autosave, units, and finish stats', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Day 1' }).click()
  await expect(page).toHaveURL(/\/workouts\/\d+$/)

  await expect(page.locator('#workout-title')).toHaveValue('Chest & Back')
  await expect(page.getByText('In progress', { exact: true })).toBeVisible()

  // The program template pre-populates five exercises, including the A/B
  // superset pair.
  await expect(page.locator('.card-surface h3')).toHaveText(
    CHEST_BACK_EXERCISES,
  )
  await expect(exerciseCard(page, 'Dumbbell Flye')).toContainText('Superset A')
  await expect(exerciseCard(page, 'Incline Bench Press')).toContainText(
    'Superset A',
  )

  // With no earlier completed session, the editor says so explicitly.
  await expect(exerciseCard(page, 'Dumbbell Flye')).toContainText(
    'First time logging this movement',
  )

  const flye = exerciseCard(page, 'Dumbbell Flye')
  await flye.getByRole('button', { name: 'Warm-up' }).click()
  await expect(flye.getByLabel('Warm-up 1 weight in kg')).toBeVisible()
  await flye.getByLabel('Warm-up 1 weight in kg').fill('30')
  await flye.getByLabel('Warm-up 1 reps').fill('12')
  await flye.getByLabel('Working set weight in kg').fill('60')
  await flye.getByLabel('Working set reps').fill('8')

  // The program seeds a note, so its textarea is already open.
  await flye
    .getByPlaceholder('Form cues, seat height, how the set felt…')
    .fill('Elbows tucked, slow eccentric')

  // An exercise without a seeded note starts collapsed.
  const press = exerciseCard(page, 'Incline Bench Press')
  await expect(
    press.getByPlaceholder('Form cues, seat height, how the set felt…'),
  ).toHaveCount(0)
  await press.getByRole('button', { name: 'Notes' }).click()
  await press
    .getByPlaceholder('Form cues, seat height, how the set felt…')
    .fill('Slight pause at the bottom')

  // Unlinking and relinking exercises exercises the superset UI.
  await flye.getByRole('button', { name: 'Unlink' }).click()
  await expect(flye).toContainText('One working set to failure')
  await flye.getByRole('button', { name: 'Superset with next' }).click()
  await expect(flye).toContainText('Superset A')

  await page.getByRole('button', { name: /Session notes/ }).click()
  await page
    .getByPlaceholder('Energy, sleep, aches, gym conditions…')
    .fill('Slept well. Focused on beating the logbook.')

  await fillWorkingSet(page, 'Incline Bench Press', 70, 9)
  await fillWorkingSet(page, 'Machine Pullover', 55, 10)
  await fillWorkingSet(page, 'Close-Grip Underhand Pulldown', 60, 8)
  await fillWorkingSet(page, 'Deadlift', 100, 5)

  await waitForSaved(page)
  await expect(page.getByText('5 logged')).toBeVisible()

  // Reload to prove the debounced autosave hit the real SQLite database.
  await page.reload()
  await expect(page.locator('#workout-title')).toHaveValue('Chest & Back')
  await expect(
    exerciseCard(page, 'Dumbbell Flye').getByLabel('Warm-up 1 weight in kg'),
  ).toHaveValue('30')
  await expect(
    exerciseCard(page, 'Dumbbell Flye').getByLabel('Working set weight in kg'),
  ).toHaveValue('60')
  await expect(
    exerciseCard(page, 'Dumbbell Flye').getByLabel('Working set reps'),
  ).toHaveValue('8')
  await expect(
    exerciseCard(page, 'Dumbbell Flye').getByPlaceholder(
      'Form cues, seat height, how the set felt…',
    ),
  ).toHaveValue('Elbows tucked, slow eccentric')
  await expect(
    exerciseCard(page, 'Incline Bench Press').getByPlaceholder(
      'Form cues, seat height, how the set felt…',
    ),
  ).toHaveValue('Slight pause at the bottom')
  await expect(
    page.getByPlaceholder('Energy, sleep, aches, gym conditions…'),
  ).toHaveValue('Slept well. Focused on beating the logbook.')

  // The unit preference converts the live draft and survives a reload.
  const unitToggle = page.getByRole('group', { name: 'Weight unit' })
  await unitToggle.getByRole('button', { name: 'lb' }).click()
  await expect(
    exerciseCard(page, 'Dumbbell Flye').getByLabel(
      'Working set weight in lb',
    ),
  ).toHaveValue('132.3')
  await waitForSaved(page)
  await page.reload()
  await expect(
    exerciseCard(page, 'Dumbbell Flye').getByLabel(
      'Working set weight in lb',
    ),
  ).toHaveValue('132.3')

  await unitToggle.getByRole('button', { name: 'kg' }).click()
  await expect(
    exerciseCard(page, 'Dumbbell Flye').getByLabel(
      'Working set weight in kg',
    ),
  ).toHaveValue('60')
  await waitForSaved(page)

  await page.locator('#workout-title').fill(CUSTOM_TITLE)
  await waitForSaved(page)

  await page.getByRole('button', { name: 'Finish workout' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Session logged')
  await expect(
    dialog.getByText('Working sets', { exact: true }).locator('..'),
  ).toContainText('5')
  await expect(
    dialog.getByText('Total load', { exact: true }).locator('..'),
  ).toContainText('2,640 kg')
  await expect(
    dialog.getByText('Top set', { exact: true }).locator('..'),
  ).toContainText('100 kg × 5')

  await dialog.getByRole('button', { name: 'Stay here' }).click()
  await expect(page.getByRole('button', { name: 'Completed' })).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Reopen', exact: true }),
  ).toBeVisible()
})

test('filters the logbook and persists reopen/finish transitions', async ({
  page,
}) => {
  await page.goto('/workouts')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Workouts' }),
  ).toBeVisible()

  const row = page
    .getByRole('link')
    .filter({ hasText: CUSTOM_TITLE })
    .first()
  await expect(row).toBeVisible()

  const filter = page.getByRole('group', { name: 'Filter workouts' })
  await filter.getByRole('button', { name: 'Completed' }).click()
  await expect(row).toBeVisible()
  await filter.getByRole('button', { name: 'In progress' }).click()
  await expect(
    page.getByRole('heading', { name: 'Nothing here' }),
  ).toBeVisible()
  await filter.getByRole('button', { name: 'All' }).click()
  await expect(row).toBeVisible()

  await row.click()
  await expect(page).toHaveURL(/\/workouts\/\d+$/)
  await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible()

  const savesBeforeReopen = await saveCount(page)
  await page.getByRole('button', { name: 'Reopen session' }).click()
  await expect(page.getByText('In progress', { exact: true })).toBeVisible()
  await waitForSaveCount(page, savesBeforeReopen)

  // Reopen is persisted before we leave the editor.
  await page.reload()
  await expect(page.getByText('In progress', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Logbook' }).click()
  await expect(page).toHaveURL(/\/workouts$/)
  await expect(row).toContainText('In progress')

  await filter.getByRole('button', { name: 'In progress' }).click()
  await expect(row).toBeVisible()
  await filter.getByRole('button', { name: 'Completed' }).click()
  await expect(
    page.getByRole('heading', { name: 'Nothing here' }),
  ).toBeVisible()
  await filter.getByRole('button', { name: 'All' }).click()
  await row.click()

  await page.getByRole('button', { name: 'Finish workout' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Session logged')
  await dialog.getByRole('button', { name: 'Back to logbook' }).click()
  await expect(page).toHaveURL(/\/workouts$/)

  await filter.getByRole('button', { name: 'In progress' }).click()
  await expect(
    page.getByRole('heading', { name: 'Nothing here' }),
  ).toBeVisible()
  await filter.getByRole('button', { name: 'Completed' }).click()
  await expect(row).toBeVisible()
})

test('repeats a session with cleared loads and logs a second progression', async ({
  page,
}) => {
  await page.goto('/workouts')
  const row = page
    .getByRole('link')
    .filter({ hasText: CUSTOM_TITLE })
    .first()
  await row.click()
  await expect(page).toHaveURL(/\/workouts\/(\d+)$/)
  const firstId = page.url().split('/').pop()

  await page.getByRole('button', { name: 'Repeat' }).click()
  await expect(page.getByText('In progress', { exact: true })).toBeVisible()
  const secondId = page.url().split('/').pop()
  expect(secondId).not.toBe(firstId)

  await expect(page.locator('#workout-title')).toHaveValue(CUSTOM_TITLE)
  await expect(page.locator('.card-surface h3')).toHaveText(
    CHEST_BACK_EXERCISES,
  )
  await expect(
    exerciseCard(page, 'Dumbbell Flye').getByLabel('Working set weight in kg'),
  ).toHaveValue('')
  await expect(
    exerciseCard(page, 'Dumbbell Flye').getByLabel('Warm-up 1 weight in kg'),
  ).toHaveValue('')
  await expect(
    exerciseCard(page, 'Dumbbell Flye').getByPlaceholder(
      'Form cues, seat height, how the set felt…',
    ),
  ).toHaveValue('Elbows tucked, slow eccentric')

  // The repeated session shows what each movement did last time, even though
  // the inputs themselves start empty.
  await expect(exerciseCard(page, 'Dumbbell Flye')).toContainText(
    `Previous: 60 kg × 8 · ${mediumDate(TODAY)}`,
  )
  await expect(exerciseCard(page, 'Incline Bench Press')).toContainText(
    `Previous: 70 kg × 9 · ${mediumDate(TODAY)}`,
  )

  await fillWorkingSet(page, 'Dumbbell Flye', 65, 6)
  await fillWorkingSet(page, 'Incline Bench Press', 75, 7)
  await waitForSaved(page)

  await page.getByRole('button', { name: 'Finish workout' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Session logged')
  await expect(
    dialog.getByText('Working sets', { exact: true }).locator('..'),
  ).toContainText('2')
  await expect(
    dialog.getByText('Total load', { exact: true }).locator('..'),
  ).toContainText('915 kg')
  await expect(
    dialog.getByText('Top set', { exact: true }).locator('..'),
  ).toContainText('75 kg × 7')
  await dialog.getByRole('button', { name: 'Back to logbook' }).click()

  await expect(page).toHaveURL(/\/workouts$/)
  await expect(
    page.getByRole('link').filter({ hasText: CUSTOM_TITLE }),
  ).toHaveCount(2)
})

test('searches and filters the library, creates a custom movement, and reads exercise charts', async ({
  page,
}) => {
  await page.goto('/exercises')
  const search = page.getByLabel('Search exercises')

  await search.fill('flye')
  await expect(page.getByRole('link', { name: /Dumbbell Flye/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Deadlift/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Clear search' }).click()
  await page.getByRole('button', { name: 'Chest · 6' }).click()
  await expect(
    page.getByRole('heading', { name: 'Chest', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /Dumbbell Flye/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Deadlift/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'All · 36' }).click()
  await search.fill('zzzz-no-such-exercise')
  await expect(
    page.getByRole('heading', { name: 'No exercises found' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Create an exercise' }).click()

  const createDialog = page.getByRole('dialog')
  await expect(createDialog).toBeVisible()
  await createDialog.getByLabel('Exercise name').fill('Cable Y Raise Test')
  await createDialog.getByLabel('Muscle group').selectOption('shoulders')
  await createDialog.getByLabel('Equipment').selectOption('cable')
  await createDialog
    .getByLabel('Notes (optional)')
    .fill('High pulley, thumbs up')
  await createDialog.getByRole('button', { name: 'Create exercise' }).click()
  await expect(createDialog).toBeHidden()

  await search.fill('Cable Y Raise Test')
  const customLink = page.getByRole('link', { name: /Cable Y Raise Test/ })
  await expect(customLink).toBeVisible()
  await expect(page.getByText('37 movements · 1 custom')).toBeVisible()
  await customLink.click()

  await expect(
    page.getByRole('heading', { level: 1, name: 'Cable Y Raise Test' }),
  ).toBeVisible()
  await expect(page.getByText('Custom movement')).toBeVisible()
  await expect(
    page.getByText('No completed working sets logged yet.'),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Exercise library' }).click()
  await page.getByRole('link', { name: /Dumbbell Flye/ }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Dumbbell Flye' }),
  ).toBeVisible()

  const stats = page.locator('dl')
  await expect(
    stats.getByText('Best load', { exact: true }).locator('..'),
  ).toContainText('65 kg')
  await expect(
    stats.getByText('Best reps', { exact: true }).locator('..'),
  ).toContainText('8')
  await expect(
    stats.getByText('Sessions', { exact: true }).locator('..'),
  ).toContainText('2')

  const chart = page.getByRole('img', {
    name: 'Trend chart with 2 data points',
  })
  await expect(chart).toBeVisible()
  await page
    .getByRole('button', {
      name: `${mediumDate(TODAY)}: 60 kg for 8 reps`,
    })
    .focus()
  const tooltip = page.getByTestId('chart-tooltip')
  await expect(tooltip).toBeVisible()
  await expect(tooltip.getByText('Warm-ups', { exact: true })).toBeVisible()
  await expect(tooltip.getByText('1', { exact: true })).toBeVisible()

  const range = page.getByRole('group', { name: 'Chart range' })
  await range.getByRole('button', { name: '3M' }).click()
  await expect(range.getByRole('button', { name: '3M' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(chart).toBeVisible()
  await range.getByRole('button', { name: 'All' }).click()

  // Both completed sessions are in the history, with the warm-up pill.
  await expect(page.getByText('60 kg × 8', { exact: true })).toBeVisible()
  await expect(page.getByText('65 kg × 6', { exact: true })).toBeVisible()
  await expect(page.getByText('30 kg × 12', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('link', { name: mediumDate(TODAY) }),
  ).toHaveCount(2)

  // The progress page plots the currently selected trained movement.
  await page.goto('/progress')
  await page.locator('#exercise-select').selectOption({ label: 'Dumbbell Flye' })
  await expect(page).toHaveURL(/exercise=\d+/)
  await expect(
    page.getByRole('img', { name: 'Trend chart with 2 data points' }),
  ).toBeVisible()
  await expect(stats.getByText('Best load', { exact: true }).locator('..')).toContainText(
    '65 kg',
  )
})

test('reflects the training history on the dashboard and converts global units', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByText('Sessions', { exact: true }).locator('..'),
  ).toContainText('2')
  await expect(
    page.getByText('Sets to failure', { exact: true }).locator('..'),
  ).toContainText('7')
  await expect(
    page.getByText('Movements', { exact: true }).locator('..'),
  ).toContainText('37')

  await expect(page.getByText('Recovering', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Day 2' })).toBeVisible()
  await expect(
    page.getByRole('link').filter({ hasText: CUSTOM_TITLE }),
  ).toHaveCount(2)
  await expect(
    page.getByRole('img', { name: 'Trend chart with 3 data points' }),
  ).toBeVisible()

  const unitToggle = page.getByRole('group', { name: 'Weight unit' })
  await unitToggle.getByRole('button', { name: 'lb' }).click()
  await expect(page.getByText('170', { exact: true }).first()).toBeVisible()
  await page.reload()
  await expect(page.getByText('170', { exact: true }).first()).toBeVisible()
  await unitToggle.getByRole('button', { name: 'kg' }).click()
  await expect(page.getByText('77.1', { exact: true }).first()).toBeVisible()
})

test('backfills a session, reorders/removes exercises, links supersets, and deletes it', async ({
  page,
}) => {
  await page.goto('/workouts/new')

  await page.getByLabel('Session date').fill(BACKFILL)
  await page.getByRole('button', { name: /Blank session/ }).click()
  await expect(page.getByText('Backfill · saved complete')).toBeVisible()
  await page.getByRole('button', { name: 'Start blank session' }).click()
  await expect(page).toHaveURL(/\/workouts\/\d+$/)

  await expect(page.locator('#workout-title')).toHaveValue('Custom session')
  await expect(page.getByRole('button', { name: 'Completed' })).toBeDisabled()

  await addExercise(page, 'Barbell Curl')
  await addExercise(page, 'Close-Grip Underhand Pulldown')
  await addExercise(page, 'Dumbbell Flye')
  await expect(page.locator('.card-surface h3')).toHaveText([
    'Barbell Curl',
    'Close-Grip Underhand Pulldown',
    'Dumbbell Flye',
  ])

  await exerciseCard(page, 'Barbell Curl')
    .getByRole('button', { name: 'Move exercise down' })
    .click()
  await expect(page.locator('.card-surface h3')).toHaveText([
    'Close-Grip Underhand Pulldown',
    'Barbell Curl',
    'Dumbbell Flye',
  ])
  await expect(
    exerciseCard(page, 'Close-Grip Underhand Pulldown').getByRole('button', {
      name: 'Move exercise up',
    }),
  ).toBeDisabled()

  await exerciseCard(page, 'Dumbbell Flye')
    .getByRole('button', { name: 'Remove exercise' })
    .click()
  await expect(page.locator('.card-surface h3')).toHaveCount(2)

  const pulldown = exerciseCard(page, 'Close-Grip Underhand Pulldown')
  await pulldown.getByRole('button', { name: 'Superset with next' }).click()
  await expect(pulldown).toContainText('Superset A')
  await expect(exerciseCard(page, 'Barbell Curl')).toContainText('Superset A')

  await fillWorkingSet(page, 'Close-Grip Underhand Pulldown', 50, 10)
  await fillWorkingSet(page, 'Barbell Curl', 30, 8)
  await waitForSaved(page)
  await page.reload()

  await expect(page.locator('.card-surface h3')).toHaveText([
    'Close-Grip Underhand Pulldown',
    'Barbell Curl',
  ])
  await expect(
    exerciseCard(page, 'Close-Grip Underhand Pulldown').getByLabel(
      'Working set weight in kg',
    ),
  ).toHaveValue('50')
  await expect(
    exerciseCard(page, 'Barbell Curl').getByLabel('Working set reps'),
  ).toHaveValue('8')
  await expect(
    exerciseCard(page, 'Close-Grip Underhand Pulldown'),
  ).toContainText('Superset A')

  const reloadedPulldown = exerciseCard(page, 'Close-Grip Underhand Pulldown')
  await reloadedPulldown.getByRole('button', { name: 'Unlink' }).click()
  await expect(reloadedPulldown).not.toContainText('Superset A')
  await expect(exerciseCard(page, 'Barbell Curl')).not.toContainText(
    'Superset A',
  )
  await reloadedPulldown
    .getByRole('button', { name: 'Superset with next' })
    .click()
  await waitForSaved(page)
  await page.reload()
  await expect(
    exerciseCard(page, 'Close-Grip Underhand Pulldown'),
  ).toContainText('Superset A')

  // Deleting is cancelable, then cascades to the sets and exercises.
  await page.getByRole('button', { name: 'Delete' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Delete this session?')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/workouts\/\d+$/)

  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete session' }).click()
  await expect(page).toHaveURL(/\/workouts$/)
  await expect(
    page.getByRole('link').filter({ hasText: 'Custom session' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('link').filter({ hasText: CUSTOM_TITLE }),
  ).toHaveCount(2)
})

test('uses mobile navigation and hides it inside the workout editor', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const nav = page.getByRole('navigation', { name: 'Main' })
  await expect(nav).toBeVisible()
  await expect(
    nav.getByRole('link', { name: 'Today', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Heavy Duty home' }),
  ).toBeVisible()

  await nav.getByRole('link', { name: 'Progress', exact: true }).click()
  await expect(page).toHaveURL(/\/progress$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Progress' }),
  ).toBeVisible()

  await page.getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Workouts', exact: true })
    .click()
  await expect(page).toHaveURL(/\/workouts$/)

  const row = page
    .getByRole('link')
    .filter({ hasText: CUSTOM_TITLE })
    .first()
  await row.click()
  await expect(page).toHaveURL(/\/workouts\/\d+$/)

  // The editor replaces the bottom navigation with its own action bar.
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Completed' }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Logbook' }).click()
  await expect(page).toHaveURL(/\/workouts$/)
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
})

test('frames separate superset groups independently', async ({ page }) => {
  await page.goto('/workouts/new')
  await page.getByRole('button', { name: /Blank session/ }).click()
  await page.getByRole('button', { name: 'Start blank session' }).click()
  await expect(page).toHaveURL(/\/workouts\/\d+$/)

  await addExercise(page, 'Barbell Curl')
  await addExercise(page, 'Close-Grip Underhand Pulldown')
  await addExercise(page, 'Dumbbell Flye')
  await addExercise(page, 'Incline Bench Press')
  await expect(page.locator('.card-surface h3')).toHaveCount(4)

  // Nothing starts framed until exercises are linked.
  await expect(page.locator('[data-superset-group]')).toHaveCount(0)

  await exerciseCard(page, 'Barbell Curl')
    .getByRole('button', { name: 'Superset with next' })
    .click()
  await expect(page.locator('[data-superset-group]')).toHaveCount(1)

  await exerciseCard(page, 'Dumbbell Flye')
    .getByRole('button', { name: 'Superset with next' })
    .click()

  const groups = page.locator('[data-superset-group]')
  await expect(groups).toHaveCount(2)
  await expect(groups.nth(0)).toHaveAttribute('data-superset-group', 'A')
  await expect(groups.nth(1)).toHaveAttribute('data-superset-group', 'B')
  await expect(groups.nth(0)).toContainText('Superset A')
  await expect(groups.nth(1)).toContainText('Superset B')
  await expect(groups.nth(0)).toContainText('2 exercises back-to-back')
  await expect(groups.nth(1)).toContainText('2 exercises back-to-back')

  // Group A must not swallow group B, or standalones, into one giant block.
  await expect(groups.nth(0)).toContainText('Barbell Curl')
  await expect(groups.nth(0)).toContainText('Close-Grip Underhand Pulldown')
  await expect(groups.nth(0)).not.toContainText('Dumbbell Flye')
  await expect(groups.nth(0)).not.toContainText('Incline Bench Press')
  await expect(groups.nth(1)).toContainText('Dumbbell Flye')
  await expect(groups.nth(1)).toContainText('Incline Bench Press')
  await expect(groups.nth(1)).not.toContainText('Barbell Curl')

  await waitForSaved(page)
  await page.reload()
  await expect(page.locator('[data-superset-group]')).toHaveCount(2)
})

test('preloads the previous full-body session when starting it again', async ({
  page,
}) => {
  // First use of Full Body loads the program's default list.
  await page.goto('/workouts/new')
  await page.getByRole('button', { name: /Full Body Starter/ }).click()
  await expect(page.getByText('12 exercises loaded')).toBeVisible()
  await page.getByRole('button', { name: 'Start Full body' }).click()
  await expect(page).toHaveURL(/\/workouts\/\d+$/)

  await expect(page.locator('#workout-title')).toHaveValue('Full Body Starter')
  await expect(page.locator('.card-surface h3')).toHaveText(FULL_BODY_EXERCISES)

  // Drop the last exercise so the next session has a different list.
  await exerciseCard(page, 'Triceps Pressdown')
    .getByRole('button', { name: 'Remove exercise' })
    .click()
  await expect(page.locator('.card-surface h3')).toHaveCount(11)

  await fillWorkingSet(page, 'Deadlift', 80, 5)
  await waitForSaved(page)

  await page.getByRole('button', { name: 'Finish workout' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Session logged')
  await dialog.getByRole('button', { name: 'Back to logbook' }).click()

  // Starting Full Body again preloads the previous session's list, not the
  // twelve-exercise default. The new-workout page reflects that too.
  await page.goto('/workouts/new')
  await expect(page.getByText('11 exercises loaded')).toBeVisible()
  await page.getByRole('button', { name: 'Start Full body' }).click()
  await expect(page).toHaveURL(/\/workouts\/\d+$/)
  await expect(page.locator('#workout-title')).toHaveValue('Full Body Starter')
  await expect(page.locator('.card-surface h3')).toHaveText(
    FULL_BODY_EXERCISES.filter((name) => name !== 'Triceps Pressdown'),
  )
})

test('edits an exercise and deletes one with logged history', async ({
  page,
}) => {
  // Machine Pullover has exactly one completed session (55 kg × 10) from the
  // first Chest & Back workout.
  await page.goto('/exercises')
  await page.getByRole('link', { name: /Machine Pullover/ }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Machine Pullover' }),
  ).toBeVisible()

  const stats = page.locator('dl')
  await expect(
    stats.getByText('Sessions', { exact: true }).locator('..'),
  ).toContainText('1')

  // Edit all the fields; logged history must survive the rename.
  await page.getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Exercise name').fill('Machine Pullover (New)')
  await dialog.getByLabel('Equipment').selectOption('cable')
  await dialog.getByLabel('Notes (optional)').fill('Edited during e2e run')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog).toBeHidden()

  await expect(
    page.getByRole('heading', { level: 1, name: 'Machine Pullover (New)' }),
  ).toBeVisible()
  await expect(page.getByText('Edited during e2e run')).toBeVisible()
  await expect(
    stats.getByText('Best load', { exact: true }).locator('..'),
  ).toContainText('55 kg')
  await expect(
    stats.getByText('Sessions', { exact: true }).locator('..'),
  ).toContainText('1')

  // Delete is cancelable, then cascades through the logged sets.
  await page.getByRole('button', { name: 'Delete' }).click()
  const confirm = page.getByRole('dialog')
  await expect(confirm).toBeVisible()
  await expect(confirm).toContainText('from 1 past session')
  await confirm.getByRole('button', { name: 'Cancel' }).click()
  await expect(confirm).toBeHidden()

  await page.getByRole('button', { name: 'Delete' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete exercise' })
    .click()
  await expect(page).toHaveURL(/\/exercises$/)

  await expect(
    page.getByRole('link', { name: /Machine Pullover/ }),
  ).toHaveCount(0)
  // One seeded movement fewer, the custom one from earlier is still there.
  await expect(page.getByText('36 movements · 1 custom')).toBeVisible()

  // The Chest & Back session survives without the deleted exercise.
  await page.goto('/workouts')
  const row = page
    .getByRole('link')
    .filter({ hasText: CUSTOM_TITLE })
    .first()
  await expect(row).toContainText('4 exercises')
})
