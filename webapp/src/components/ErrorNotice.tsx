import { useEffect, useState } from 'react'

interface AsyncError {
  id: number
  message: string
}

/**
 * Shows errors that escape outside React: unhandled promise rejections, which is
 * where failed cloud sync and failed lookups end up. The ErrorBoundary only
 * catches render crashes and would never see these.
 */
export function ErrorNotice() {
  const [errors, setErrors] = useState<AsyncError[]>([])

  useEffect(() => {
    let nextId = 1

    const record = (value: unknown) => {
      const message =
        value instanceof Error
          ? value.message
          : typeof value === 'string'
            ? value
            : 'An unexpected error occurred.'
      setErrors((current) => {
        if (current.some((entry) => entry.message === message)) return current
        return [...current.slice(-2), { id: nextId++, message }]
      })
    }

    const onRejection = (event: PromiseRejectionEvent) => record(event.reason)
    const onError = (event: ErrorEvent) => record(event.error ?? event.message)

    window.addEventListener('unhandledrejection', onRejection)
    window.addEventListener('error', onError)
    return () => {
      window.removeEventListener('unhandledrejection', onRejection)
      window.removeEventListener('error', onError)
    }
  }, [])

  if (errors.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4">
      {errors.map((error) => (
        <div
          key={error.id}
          role="alert"
          className="pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-xl border border-rose-300 bg-white px-3 py-2 shadow-lg dark:border-rose-500/40 dark:bg-slate-900"
        >
          <p className="min-w-0 flex-1 text-sm text-rose-700 dark:text-rose-300">{error.message}</p>
          <button
            type="button"
            onClick={() => setErrors((current) => current.filter((entry) => entry.id !== error.id))}
            aria-label="Dismiss"
            className="shrink-0 rounded-md px-2 py-0.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  )
}