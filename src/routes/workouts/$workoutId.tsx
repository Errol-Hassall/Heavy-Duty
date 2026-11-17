import { createFileRoute, notFound } from '@tanstack/react-router'
import { WorkoutEditor } from '#/components/workout-editor'
import { getWorkoutFn, listExercisesFn } from '#/server/api'

export const Route = createFileRoute('/workouts/$workoutId')({
  loader: async ({ params }) => {
    const id = Number(params.workoutId)
    if (!Number.isInteger(id) || id <= 0) throw notFound()

    const [workout, exercises] = await Promise.all([
      getWorkoutFn({ data: { id } }),
      listExercisesFn(),
    ])
    if (!workout) throw notFound()
    return { workout, exercises }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.workout.title} — Heavy Duty`
          : 'Workout — Heavy Duty',
      },
    ],
  }),
  component: WorkoutPage,
})

function WorkoutPage() {
  const { workout, exercises } = Route.useLoaderData()
  return (
    <WorkoutEditor
      key={workout.id}
      workout={workout}
      exercises={exercises}
    />
  )
}
