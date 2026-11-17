import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { formatNumber } from '#/lib/utils'
import { niceTicks, sampleIndexes } from '#/lib/chart'

export interface TrendPoint {
  x: number
  y: number
  /** Short label rendered above the point (e.g. reps). */
  tag?: string
  /** Tooltip heading, typically the date. */
  title: string
  /** Tooltip rows. */
  details?: Array<{ label: string; value: string }>
  /** Large value in the tooltip. */
  value: string
  ariaLabel: string
}

interface TrendChartProps {
  points: TrendPoint[]
  formatX: (x: number) => string
  height?: number
  unitLabel?: string
  accent?: 'acid' | 'ember'
  emptyMessage?: string
}

export function TrendChart({
  points,
  formatX,
  height = 260,
  unitLabel,
  accent = 'acid',
  emptyMessage = 'No data yet.',
}: TrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [pinned, setPinned] = useState(false)
  const gradientId = useId()

  useEffect(() => {
    const element = containerRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width
      if (nextWidth && nextWidth > 0) setWidth(nextWidth)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const sorted = useMemo(
    () => [...points].sort((a, b) => a.x - b.x),
    [points],
  )

  const geometry = useMemo(() => {
    if (sorted.length === 0) return null

    const padding = {
      top: 26,
      right: 16,
      bottom: 30,
      left: width < 420 ? 38 : 46,
    }
    const plotWidth = Math.max(1, width - padding.left - padding.right)
    const plotHeight = Math.max(1, height - padding.top - padding.bottom)

    const yValues = sorted.map((point) => point.y)
    const yMin = Math.min(...yValues)
    const yMax = Math.max(...yValues)
    const ySpan = yMax - yMin
    const yPad = ySpan === 0 ? Math.max(Math.abs(yMax) * 0.08, 1) : ySpan * 0.12
    const ticks = niceTicks(yMin - yPad, yMax + yPad, 4)
    const domainMin = ticks[0] ?? yMin
    const domainMax = ticks[ticks.length - 1] ?? yMax
    const domainSpan = domainMax - domainMin || 1

    const xMin = sorted[0].x
    const xMax = sorted[sorted.length - 1].x
    const xSpan = xMax - xMin

    const xFor = (x: number) =>
      padding.left +
      (xSpan === 0 ? plotWidth / 2 : ((x - xMin) / xSpan) * plotWidth)
    const yFor = (y: number) =>
      padding.top + plotHeight - ((y - domainMin) / domainSpan) * plotHeight

    const plottedBase = sorted.map((point, index) => ({
      ...point,
      index,
      px: xFor(point.x),
      py: yFor(point.y),
    }))

    // Several entries can share the same day. Spread them slightly so the
    // points and their tags do not stack on top of each other.
    const sameDayCounts = new Map<number, number>()
    plottedBase.forEach((point) => {
      sameDayCounts.set(point.x, (sameDayCounts.get(point.x) ?? 0) + 1)
    })
    const sameDaySeen = new Map<number, number>()
    const plotted = plottedBase.map((point) => {
      const count = sameDayCounts.get(point.x) ?? 1
      if (count === 1) return point
      const seen = sameDaySeen.get(point.x) ?? 0
      sameDaySeen.set(point.x, seen + 1)
      const offset = (seen - (count - 1) / 2) * 9
      return {
        ...point,
        px: Math.min(
          width - padding.right,
          Math.max(padding.left, point.px + offset),
        ),
      }
    })

    const linePath = plotted
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.px},${point.py}`)
      .join(' ')

    const areaPath =
      plotted.length > 1
        ? `${linePath} L${plotted[plotted.length - 1].px},${padding.top + plotHeight} L${plotted[0].px},${padding.top + plotHeight} Z`
        : ''

    const xTickIndexes = sampleIndexes(sorted.length, width < 420 ? 3 : 4)
    const xTicks: Array<{
      x: number
      label: string
      anchor: 'start' | 'middle' | 'end'
    }> = []
    for (const index of xTickIndexes) {
      const label = formatX(sorted[index].x)
      // Sampled points can fall on the same day; label that day only once.
      if (xTicks.some((tick) => tick.label === label)) continue
      xTicks.push({
        x: xFor(sorted[index].x),
        label,
        anchor:
          index === 0
            ? 'start'
            : index === sorted.length - 1
              ? 'end'
              : 'middle',
      })
    }

    const yTicks = ticks.map((tick) => ({
      value: tick,
      y: yFor(tick),
      label: formatNumber(tick, Number.isInteger(tick) ? 0 : 1),
    }))

    return {
      padding,
      plotWidth,
      plotHeight,
      plotted,
      linePath,
      areaPath,
      xTicks,
      yTicks,
      xFor,
      yFor,
      domainMin,
      domainMax,
    }
  }, [sorted, width, height, formatX])

  if (sorted.length === 0 || !geometry) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-ink-900/40 px-4 text-center"
        style={{ height }}
      >
        <p className="text-sm text-smoke">{emptyMessage}</p>
      </div>
    )
  }

  const active = activeIndex === null ? null : geometry.plotted[activeIndex]
  const activeIsPinned = pinned && active

  const accentColor =
    accent === 'ember' ? 'var(--color-ember-500)' : 'var(--color-acid-400)'
  const accentSoft =
    accent === 'ember' ? 'rgba(244, 82, 47, 0.22)' : 'rgba(207, 247, 90, 0.18)'

  const handlePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'touch') return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * width
    let nearest = 0
    let distance = Number.POSITIVE_INFINITY
    geometry.plotted.forEach((point, index) => {
      const nextDistance = Math.abs(point.px - x)
      if (nextDistance < distance) {
        distance = nextDistance
        nearest = index
      }
    })
    setActiveIndex(nearest)
    setPinned(false)
  }

  const tooltipLeft = active
    ? Math.min(Math.max(active.px, 82), width - 82)
    : 0
  const tooltipTop = active ? active.py : 0
  const tooltipBelow = active ? active.py < 92 : false
  const showTags = sorted.length <= 14 && width >= 360

  return (
    <div ref={containerRef} className="relative w-full">
      <span
        className="pointer-events-none absolute left-0 top-0 text-[9px] font-semibold uppercase tracking-[0.16em] text-smoke"
        style={{ paddingLeft: 4 }}
      >
        {unitLabel}
      </span>

      <svg
        role="img"
        aria-label={`Trend chart with ${sorted.length} data points`}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onPointerMove={handlePointer}
        onPointerLeave={() => {
          if (!pinned) setActiveIndex(null)
        }}
        onClick={() => {
          if (activeIndex === null) return
          setPinned((value) => !value)
        }}
        className="touch-pan-y select-none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.24" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {geometry.yTicks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={geometry.padding.left}
              x2={width - geometry.padding.right}
              y1={tick.y}
              y2={tick.y}
              stroke="var(--color-line)"
              strokeDasharray="2 6"
              strokeWidth={1}
            />
            <text
              x={geometry.padding.left - 8}
              y={tick.y + 3}
              textAnchor="end"
              className="fill-smoke font-mono text-[9px]"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {geometry.xTicks.map((tick) => (
          <text
            key={`${tick.x}-${tick.label}`}
            x={tick.x}
            y={height - 9}
            textAnchor={tick.anchor}
            className="fill-smoke text-[9px] uppercase tracking-wide"
          >
            {tick.label}
          </text>
        ))}

        <path d={geometry.areaPath} fill={`url(#${gradientId})`} />
        <path
          d={geometry.linePath}
          fill="none"
          stroke={accentColor}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {active ? (
          <line
            x1={active.px}
            x2={active.px}
            y1={geometry.padding.top}
            y2={height - geometry.padding.bottom}
            stroke={accentColor}
            strokeOpacity={0.35}
            strokeDasharray="3 4"
          />
        ) : null}

        {geometry.plotted.map((point) => {
          const isActive = activeIndex === point.index
          return (
            <g key={`${point.x}-${point.index}`}>
              {showTags && point.tag ? (
                <text
                  x={point.px}
                  y={point.py - 11}
                  textAnchor="middle"
                  className="fill-ash font-mono text-[9px]"
                >
                  {point.tag}
                </text>
              ) : null}
              <circle
                cx={point.px}
                cy={point.py}
                r={isActive ? 5 : 3.5}
                fill={isActive ? accentColor : 'var(--color-ink-950)'}
                stroke={accentColor}
                strokeWidth={isActive ? 2 : 2}
                className="transition-[r]"
              />
              <circle
                cx={point.px}
                cy={point.py}
                r={14}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={point.ariaLabel}
                className="cursor-pointer outline-none"
                onFocus={() => {
                  setActiveIndex(point.index)
                  setPinned(true)
                }}
                onBlur={() => {
                  setActiveIndex(null)
                  setPinned(false)
                }}
                onPointerDown={(event) => {
                  event.stopPropagation()
                  setActiveIndex(point.index)
                  setPinned(true)
                }}
              />
            </g>
          )
        })}
      </svg>

      {active ? (
        <div
          data-testid="chart-tooltip"
          className="pointer-events-none absolute z-10 min-w-32 max-w-56 rounded-lg border border-line-strong bg-ink-800/95 px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur"
          style={{
            left: tooltipLeft,
            top: tooltipTop,
            transform: tooltipBelow
              ? 'translate(-50%, 14px)'
              : 'translate(-50%, calc(-100% - 12px))',
          }}
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-smoke">
            {active.title}
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-chalk">
            {active.value}
          </p>
          {active.details?.length ? (
            <div className="mt-1.5 space-y-0.5 border-t border-line pt-1.5">
              {active.details.map((detail) => (
                <div
                  key={detail.label}
                  className="flex items-center justify-between gap-3 text-[10px]"
                >
                  <span className="text-smoke">{detail.label}</span>
                  <span className="font-mono text-ash">{detail.value}</span>
                </div>
              ))}
            </div>
          ) : null}
          <span className="mt-1 block text-[8px] uppercase tracking-wide text-smoke">
            {activeIsPinned ? 'Tap to unpin' : 'Tap to pin'}
          </span>
        </div>
      ) : null}

      <div className="mt-1 flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-smoke">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: accentSoft, boxShadow: `0 0 0 1px ${accentColor}` }}
          />
          {accent === 'ember' ? 'Bodyweight' : 'Working set'}
        </span>
        <span className="text-[9px] uppercase tracking-[0.12em] text-smoke">
          Hover or tap for details
        </span>
      </div>
    </div>
  )
}
