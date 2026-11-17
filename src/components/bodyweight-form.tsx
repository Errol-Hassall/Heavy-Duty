import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/field'
import { saveBodyMetricFn } from '#/server/api'
import { todayISO } from '#/lib/dates'
import { useUnit } from '#/lib/preferences'
import { toKg } from '#/lib/units'
import { cn } from '#/lib/utils'

export function BodyweightForm({
  withDate = false,
  className,
  onSaved,
}: {
  withDate?: boolean
  className?: string
  onSaved?: () => void
}) {
  const router = useRouter()
  const unit = useUnit()
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(todayISO())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = Number.parseFloat(weight)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid bodyweight.')
      return
    }
    const weightKg = toKg(parsed, unit)
    if (weightKg < 20 || weightKg > 500) {
      setError('That seems out of range. Check the number and unit.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await saveBodyMetricFn({
        data: {
          date,
          weightKg: Math.round(weightKg * 100) / 100,
          bodyFatPct: null,
          notes: null,
        },
      })
      await router.invalidate()
      setWeight('')
      setSaved(true)
      onSaved?.()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save the entry. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className={cn('space-y-2', className)}>
      <div className={cn('flex gap-2', withDate && 'flex-col sm:flex-row')}>
        {withDate ? (
          <Input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(event) => {
              setDate(event.target.value)
              setSaved(false)
            }}
            aria-label="Date"
            className="sm:w-40"
          />
        ) : null}
        <div className="relative flex-1">
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={weight}
            onChange={(event) => {
              setWeight(event.target.value)
              setSaved(false)
              setError(null)
            }}
            placeholder="Bodyweight"
            aria-label={`Bodyweight in ${unit}`}
            className="pr-12 font-mono tabular-nums"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider text-smoke">
            {unit}
          </span>
        </div>
        <Button type="submit" variant="secondary" disabled={busy}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Log
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-ember-400">{error}</p>
      ) : saved ? (
        <p className="text-xs text-acid-400">Bodyweight saved.</p>
      ) : null}
    </form>
  )
}
