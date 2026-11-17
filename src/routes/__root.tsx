import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'
import appCss from '../styles.css?url'
import { AppShell } from '#/components/app-shell'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { name: 'theme-color', content: '#08080a' },
      { title: 'Heavy Duty — Training Log' },
      {
        name: 'description',
        content:
          'A single-user training log for Mike Mentzer’s Heavy Duty program: one working set to failure, long recovery, progressive overload.',
      },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RootError,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-acid-400">
        Error 404
      </p>
      <h1 className="mt-3 font-display text-4xl uppercase leading-none tracking-tight">
        Off the bar path
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-ash">
        That page does not exist. Head back to today’s session or review your
        training log.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-acid-400 px-5 text-xs font-semibold uppercase tracking-[0.08em] text-ink-950 transition-colors hover:bg-acid-300"
      >
        Back to today
      </Link>
    </div>
  )
}

function RootError({ error }: { error: unknown }) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'An unexpected error occurred while loading this page.'
  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-ember-500/40 bg-ember-500/10">
        <TriangleAlert className="h-5 w-5 text-ember-400" />
      </div>
      <h1 className="mt-5 font-display text-3xl uppercase leading-none tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-ash">
        {message}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-acid-400 px-5 text-xs font-semibold uppercase tracking-[0.08em] text-ink-950 transition-colors hover:bg-acid-300"
      >
        Reload page
      </button>
    </div>
  )
}
