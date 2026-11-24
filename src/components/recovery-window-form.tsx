import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/field'
import { setRecoveryHours, useRecoveryHours } from '#/lib/preferences'
import { RECOVERY_HOURS_MAX, RECOVERY_HOURS_MIN } from '#/lib/recovery'
import { cn } from '#/lib/utils'

export function RecoveryWindowForm({ className }: { className?: string }) {
  const windowHours = useRecoveryHours()
  const [value, setValue] = useState(String(windowHours))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = Number(value)
    if (
      !Number.isInteger(parsed) ||
      parsed < RECOVERY_HOURS_MIN ||
      parsed > RECOVERY_HOURS_MAX
    ) {
      setError(
        `Use a whole number of hours between ${RECOVERY_HOURS_MIN} and ${RECOVERY_HOURS_MAX.toLocaleString('en-GB')}.`,
      )
      return
    }
    setRecoveryHours(parsed)
    setError(null)
    setSaved(true)
  }

  return (
    // noValidate: the JS check below produces the in-page error message.
    <form onSubmit={submit} noValidate className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <div className="relative flex-1 sm:max-w-[9rem]">
          <Input
            type="number"
            inputMode="numeric"
            min={RECOVERY_HOURS_MIN}
            max={RECOVERY_HOURS_MAX}
            step={1}
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setSaved(false)
              setError(null)
            }}
            aria-label="Recovery window in hours"
            className="pr-9 font-mono tabular-nums"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider text-smoke">
            h
          </span>
        </div>
        <Button type="submit" variant="secondary">
          Save
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-ember-400">{error}</p>
      ) : saved ? (
        <p className="text-xs text-acid-400">Recovery window saved.</p>
      ) : null}
    </form>
  )
}
