import { useMemo, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ClipboardList, Plus } from 'lucide-react'
import { PageHeader } from '#/components/ui/page-header'
import { Card } from '#/components/ui/card'
import { Segmented } from '#/components/ui/segmented'
import { buttonClass } from '#/components/ui/button'
import { WorkoutRow } from '#/components/workout-row'
import { listWorkoutsFn } from '#/server/api'
import { formatMonth, todayISO } from '#/lib/dates'
import type { WorkoutStatus } from '#/lib/types'

export const Route = createFileRoute('/workouts/')({
  loader: () => listWorkoutsFn(),
  head: () => ({ meta: [{ title: 'Workouts — Heavy Duty' }] }),
  component: WorkoutsPage,
})

type Filter = 'all' | WorkoutStatus

function WorkoutsPage() {
  const workouts = Route.useLoaderData()
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? workouts
        : workouts.filter((workout) => workout.status === filter),
    [workouts, filter],
  )

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const workout of filtered) {
      const key = workout.date.slice(0, 7)
      const list = map.get(key) ?? []
      list.push(workout)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [filtered])

  const thisMonth = workouts.filter(
    (workout) => workout.date.slice(0, 7) === todayISO().slice(0, 7),
  ).length
  const workingSets = workouts.reduce(
    (total, workout) => total + workout.workingSetCount,
    0,
  )

  return (
    <div>
      <PageHeader
        eyebrow="Logbook"
        title="Workouts"
        description="Every session on record. Open a session to edit sets, review notes, or repeat it."
        actions={
          <Link
            to="/workouts/new"
            className={buttonClass('primary', 'md')}
          >
            <Plus className="h-4 w-4" />
            New workout
          </Link>
        }
      />

      {workouts.length > 0 ? (
        <>
          <div className="mb-5 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-ink-850/60">
            <div className="px-4 py-3">
              <p className="font-mono text-lg font-semibold tabular-nums text-chalk">
                {workouts.length}
              </p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-smoke">
                Sessions
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="font-mono text-lg font-semibold tabular-nums text-chalk">
                {thisMonth}
              </p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-smoke">
                This month
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="font-mono text-lg font-semibold tabular-nums text-chalk">
                {workingSets}
              </p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-smoke">
                Working sets
              </p>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between gap-3">
            <Segmented
              ariaLabel="Filter workouts"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'completed', label: 'Completed' },
                { value: 'in_progress', label: 'In progress' },
              ]}
            />
            <span className="font-mono text-[10px] text-smoke">
              {filtered.length} shown
            </span>
          </div>
        </>
      ) : null}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-ink-900/40 px-6 py-16 text-center">
          <ClipboardList className="mb-4 h-6 w-6 text-smoke" />
          <h2 className="font-display text-lg uppercase tracking-tight">
            {workouts.length === 0 ? 'No sessions yet' : 'Nothing here'}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-ash">
            {workouts.length === 0
              ? 'Start with a Heavy Duty program or build a blank session and add your own exercises.'
              : 'No workouts match this filter. Switch back to all sessions.'}
          </p>
          {workouts.length === 0 ? (
            <Link
              to="/workouts/new"
              className={buttonClass('primary', 'md', 'mt-5')}
            >
              <Plus className="h-4 w-4" />
              Start a workout
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([month, items]) => (
            <section key={month}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-smoke">
                  {formatMonth(`${month}-01`)}
                </h2>
                <span className="font-mono text-[9px] text-smoke">
                  {items.length}
                </span>
              </div>
              <Card className="divide-y divide-line overflow-hidden">
                {items.map((workout) => (
                  <WorkoutRow key={workout.id} workout={workout} />
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
