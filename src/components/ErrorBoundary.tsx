import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Last line of defence for render crashes. Without this a thrown render error
 * unmounts the whole app and the visitor gets a blank page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('BagBuddy crashed while rendering', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-rose-300 bg-white p-5 shadow-sm dark:border-rose-500/40 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Something went wrong
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            BagBuddy hit an unexpected error. Your bags are still saved in this browser.
          </p>
          <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-slate-100 p-3 text-xs whitespace-pre-wrap text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {error.message}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null })
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }
}