import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Timer } from 'lucide-react'
import { formatDuration } from '#/lib/dates'
import { cn } from '#/lib/utils'

const PRESETS = [90, 120, 180]

export function RestTimer({ className }: { className?: string }) {
  const [duration, setDuration] = useState(120)
  const [remaining, setRemaining] = useState(120)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    intervalRef.current = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setRunning(false)
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate?.([120, 80, 120])
          }
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
  }, [running])

  const start = (seconds = duration) => {
    setDuration(seconds)
    if (remaining === 0) setRemaining(seconds)
    setRunning(true)
  }

  const toggle = () => {
    if (running) {
      setRunning(false)
      return
    }
    if (remaining === 0) {
      setRemaining(duration)
    }
    setRunning(true)
  }

  const reset = () => {
    setRunning(false)
    setRemaining(duration)
  }

  const progress =
    duration === 0 ? 0 : ((duration - remaining) / duration) * 100

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border border-line bg-ink-900/70 px-2.5 py-2',
        className,
      )}
    >
      <Timer className="h-3.5 w-3.5 shrink-0 text-smoke" />
      <span
        className={cn(
          'font-mono text-sm font-semibold tabular-nums',
          remaining === 0 ? 'text-ember-400' : 'text-chalk',
        )}
        aria-live="off"
      >
        {formatDuration(remaining)}
      </span>
      <div className="mx-1 h-1 w-16 overflow-hidden rounded-full bg-ink-700 sm:w-24">
        <div
          className="h-full rounded-full bg-acid-400 transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-label={running ? 'Pause rest timer' : 'Start rest timer'}
        className="rounded-md border border-line bg-ink-800 p-1.5 text-ash transition-colors hover:text-chalk"
      >
        {running ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        type="button"
        onClick={reset}
        aria-label="Reset rest timer"
        className="rounded-md border border-line bg-ink-800 p-1.5 text-ash transition-colors hover:text-chalk"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
      <div className="ml-auto flex gap-1">
        {PRESETS.map((seconds) => (
          <button
            key={seconds}
            type="button"
            onClick={() => start(seconds)}
            className="rounded px-1.5 py-1 font-mono text-[9px] text-smoke transition-colors hover:bg-ink-700 hover:text-chalk"
          >
            {seconds / 60}:00
          </button>
        ))}
      </div>
    </div>
  )
}
