import { useState } from 'react'
import { useCloud } from '../state/cloudSyncContext'
import type { SyncStatus } from '../state/cloudSyncContext'

const STATUS_STYLE: Record<SyncStatus, { dot: string; label: string }> = {
  'local-only': { dot: 'bg-slate-400', label: 'Local only' },
  connecting: { dot: 'bg-amber-500 animate-pulse', label: 'Signing in…' },
  choosing: { dot: 'bg-indigo-500', label: 'Choose a copy' },
  syncing: { dot: 'bg-amber-500 animate-pulse', label: 'Syncing…' },
  synced: { dot: 'bg-emerald-500', label: 'Synced' },
  error: { dot: 'bg-rose-500', label: 'Sync problem' },
}

function syncedLabel(lastSyncedAt: number | null): string {
  if (!lastSyncedAt) return 'not synced yet'
  return `at ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

export function AccountMenu() {
  const cloud = useCloud()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const style = STATUS_STYLE[cloud.status]

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (email.trim().length === 0 || password.length === 0) return
    await cloud.signIn(email, password)
    setPassword('')
  }

  return (
    <div className="relative">
      {cloud.userEmail ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <span className={`size-2 rounded-full ${style.dot}`} aria-hidden="true" />
            <span className="max-w-40 truncate text-slate-600 dark:text-slate-300">
              {cloud.userEmail}
            </span>
          </button>

          {open && (
            <>
              <button
                type="button"
                aria-label="Close account menu"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-20 cursor-default"
              />
              <div className="absolute top-full right-0 z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {cloud.userEmail}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {style.label} {cloud.status === 'synced' && syncedLabel(cloud.lastSyncedAt)}
                </p>

                {cloud.message && (
                  <p className="mt-2 rounded-lg bg-rose-50 px-2 py-1.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                    {cloud.message}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => void cloud.syncNow()}
                    className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500"
                  >
                    Sync now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      void cloud.signOut()
                    }}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span className={`size-2 rounded-full ${style.dot}`} aria-hidden="true" />
            Sign in to sync
          </button>

          {open && (
            <>
              <button
                type="button"
                aria-label="Close sign in panel"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-20 cursor-default"
              />
              <form
                onSubmit={submit}
                className="absolute top-full right-0 z-30 mt-2 flex w-72 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  Save your bags across devices
                </p>
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email address"
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  aria-label="Password"
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />

                {cloud.message && (
                  <p className="rounded-lg bg-rose-50 px-2 py-1.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                    {cloud.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={cloud.status === 'connecting'}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition enabled:hover:bg-indigo-500 disabled:opacity-50"
                >
                  {cloud.status === 'connecting' ? 'Signing in…' : 'Sign in'}
                </button>
                <p className="text-[11px] text-slate-400">
                  Works offline without an account — signing in only copies your bags to Firebase
                  Storage so you can move between devices.
                </p>
              </form>
            </>
          )}
        </>
      )}
    </div>
  )
}