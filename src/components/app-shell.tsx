import { useEffect } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  BookOpen,
  ChartLine,
  ClipboardList,
  Dumbbell,
  Flame,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { UnitToggle } from '#/components/unit-toggle'
import { hydratePreferences } from '#/lib/preferences'
import { cn } from '#/lib/utils'

interface NavItem {
  to: string
  label: string
  shortLabel: string
  icon: ReactNode
}

const NAV: NavItem[] = [
  {
    to: '/',
    label: 'Today',
    shortLabel: 'Today',
    icon: <Flame className="h-[18px] w-[18px]" />,
  },
  {
    to: '/workouts',
    label: 'Workouts',
    shortLabel: 'Workouts',
    icon: <ClipboardList className="h-[18px] w-[18px]" />,
  },
  {
    to: '/exercises',
    label: 'Exercises',
    shortLabel: 'Exercises',
    icon: <Dumbbell className="h-[18px] w-[18px]" />,
  },
  {
    to: '/progress',
    label: 'Progress',
    shortLabel: 'Progress',
    icon: <ChartLine className="h-[18px] w-[18px]" />,
  },
]

function isActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className="group inline-flex items-center gap-3"
      aria-label="Heavy Duty home"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-acid-400/30 bg-acid-400/10">
        <Dumbbell className="h-4 w-4 text-acid-400" />
      </span>
      <span className="flex flex-col">
        <span
          className={cn(
            'font-display uppercase leading-none tracking-tight text-chalk',
            compact ? 'text-base' : 'text-xl',
          )}
        >
          Heavy<span className="text-acid-400">Duty</span>
        </span>
        <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.28em] text-smoke">
          Mentzer system
        </span>
      </span>
    </Link>
  )
}

function Sidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-ink-950/80 px-5 py-6 backdrop-blur-xl md:flex">
      <Brand />

      <nav className="mt-10 flex flex-col gap-1" aria-label="Main">
        {NAV.map((item) => {
          const active = isActive(pathname, item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-ink-800 text-chalk'
                  : 'text-ash hover:bg-ink-900 hover:text-chalk',
              )}
            >
              <span
                className={cn(
                  'transition-colors',
                  active ? 'text-acid-400' : 'text-smoke group-hover:text-ash',
                )}
              >
                {item.icon}
              </span>
              {item.label}
              {active ? (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-acid-400" />
              ) : null}
            </Link>
          )
        })}
        <div className="my-2 h-px bg-line" />
        <Link
          to="/programs"
          className={cn(
            'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive(pathname, '/programs')
              ? 'bg-ink-800 text-chalk'
              : 'text-ash hover:bg-ink-900 hover:text-chalk',
          )}
        >
          <BookOpen
            className={cn(
              'h-[18px] w-[18px]',
              isActive(pathname, '/programs')
                ? 'text-acid-400'
                : 'text-smoke group-hover:text-ash',
            )}
          />
          Programs
        </Link>
      </nav>

      <div className="mt-auto space-y-4 border-t border-line pt-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-smoke">
            Units
          </span>
          <UnitToggle />
        </div>
        <p className="text-[10px] leading-relaxed text-smoke">
          No account. No cloud.
          <br />
          Your training log stays on your server.
        </p>
      </div>
    </aside>
  )
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink-950/85 px-4 py-3 backdrop-blur-xl md:hidden">
      <Brand compact />
      <UnitToggle />
    </header>
  )
}

function MobileNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  // The session editor has its own fixed action bar at the bottom.
  if (/^\/workouts\/(?!new$)[^/]+$/.test(pathname)) return null

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      aria-label="Main"
    >
      <div className="grid grid-cols-4">
        {NAV.map((item) => {
          const active = isActive(pathname, item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center gap-1.5 pb-2.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors',
                active ? 'text-acid-400' : 'text-smoke hover:text-ash',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                  active && 'bg-acid-400/10',
                )}
              >
                {item.icon}
              </span>
              {item.shortLabel}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    hydratePreferences()
  }, [])

  return (
    <div className="min-h-dvh md:pl-[248px]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-acid-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
      >
        Skip to content
      </a>
      <Sidebar />
      <MobileHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 md:px-10 md:pb-16 md:pt-10"
      >
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
