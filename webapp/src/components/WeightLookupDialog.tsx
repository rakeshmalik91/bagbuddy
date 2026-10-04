import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { formatWeight } from '../lib/units'
import { DEFAULT_PROVIDER_ID, getLookupProvider, LOOKUP_PROVIDERS } from '../services/lookup'
import { loadLookupSettings, saveLookupSettings } from '../services/lookup/settings'
import type { LookupSettings, WeightCandidate } from '../services/lookup/types'
import { listOpenRouterModels } from '../services/lookup/openRouter'
import type { OpenRouterModel } from '../services/lookup/openRouter'
import type { WeightUnit } from '../types'

interface WeightLookupDialogProps {
  /** Item name or form query the lookup starts from. */
  initialQuery: string
  /**
   * Tried when `initialQuery` returns nothing. A specific product name is the
   * right query for a product database but useless for the offline table, so
   * the generic item name is a useful second attempt.
   */
  fallbackQuery?: string
  unit: WeightUnit
  onApply(candidate: WeightCandidate): void
  onClose(): void
}

type Status = 'idle' | 'loading' | 'done' | 'error'

const CONFIDENCE_CLASS: Record<WeightCandidate['confidence'], string> = {
  high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  low: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

export function WeightLookupDialog({
  initialQuery,
  fallbackQuery,
  unit,
  onApply,
  onClose,
}: WeightLookupDialogProps) {
  const [settings, setSettings] = useState<LookupSettings>(() => loadLookupSettings())
  const [providerId, setProviderId] = useState(DEFAULT_PROVIDER_ID)
  const [query, setQuery] = useState(initialQuery)
  const [status, setStatus] = useState<Status>('idle')
  const [candidates, setCandidates] = useState<WeightCandidate[]>([])
  const [usedQuery, setUsedQuery] = useState(initialQuery)
  const [error, setError] = useState<string | null>(null)
  const [models, setModels] = useState<OpenRouterModel[] | null>(null)
  const [modelsError, setModelsError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const hasAutoSearched = useRef(false)

  const provider = getLookupProvider(providerId) ?? LOOKUP_PROVIDERS[0]!
  const needsKey = provider.needsApiKey && settings.openRouterApiKey.length === 0
  const needsModel = provider.id === 'openrouter' && settings.openRouterModel.length === 0

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const run = useCallback(async () => {
    const trimmed = query.trim()
    if (trimmed.length === 0) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus('loading')
    setError(null)

    try {
      let results = await provider.search(trimmed, settings, controller.signal)
      let matched = trimmed

      const fallback = fallbackQuery?.trim() ?? ''
      if (results.length === 0 && fallback.length > 0 && fallback !== trimmed) {
        results = await provider.search(fallback, settings, controller.signal)
        matched = results.length > 0 ? fallback : trimmed
      }

      if (controller.signal.aborted) return
      setCandidates(results)
      setUsedQuery(matched)
      setStatus('done')
    } catch (cause) {
      if (controller.signal.aborted) return
      setCandidates([])
      setError(cause instanceof Error ? cause.message : 'The lookup failed.')
      setStatus('error')
    }
  }, [fallbackQuery, provider, query, settings])

  // Search once as soon as the dialog opens with a sensible query. The call is
  // deferred so state updates land outside the effect body, and the timer is
  // deliberately not cleared on cleanup: React's double-invoked effects would
  // otherwise cancel the very first search. `run` owns the abort controller,
  // which is torn down on unmount.
  useEffect(() => {
    if (hasAutoSearched.current || initialQuery.trim().length === 0) return
    hasAutoSearched.current = true
    window.setTimeout(() => {
      void run()
    }, 0)
  }, [initialQuery, run])

  useEffect(() => {
    if (providerId !== 'openrouter' || models !== null) return
    const controller = new AbortController()
    listOpenRouterModels(controller.signal)
      .then(setModels)
      .catch((cause: unknown) => {
        setModelsError(cause instanceof Error ? cause.message : 'Could not load the model list.')
      })
    return () => controller.abort()
  }, [models, providerId])

  function updateSettings(patch: Partial<LookupSettings>) {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveLookupSettings(next)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void run()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Find an item weight"
        className="flex max-h-[92vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl dark:bg-slate-900"
      >
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Find an item weight
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. 500 ml shampoo or 14 inch laptop"
              aria-label="Product to look up"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={status === 'loading' || query.trim().length === 0}
              className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition enabled:hover:bg-indigo-500 disabled:opacity-50"
            >
              {status === 'loading' ? 'Searching…' : 'Search'}
            </button>
          </div>

          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Source
            <select
              value={providerId}
              onChange={(event) => setProviderId(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {LOOKUP_PROVIDERS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <p className="text-xs text-slate-400">{provider.description}</p>
        </form>

        {(needsKey || needsModel) && provider.id === 'openrouter' && (
          <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50/70 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
              Bring your own OpenRouter key. It is stored in this browser only and is sent
              directly to OpenRouter.
            </p>
            <input
              type="password"
              autoComplete="off"
              value={settings.openRouterApiKey}
              onChange={(event) => updateSettings({ openRouterApiKey: event.target.value.trim() })}
              placeholder="sk-or-v1-…"
              aria-label="OpenRouter API key"
              className="rounded-lg border border-amber-300 bg-white px-2 py-1.5 font-mono text-xs outline-none focus:border-amber-500 dark:border-amber-500/40 dark:bg-slate-800 dark:text-slate-100"
            />
            <label className="flex flex-col gap-1 text-xs text-amber-800 dark:text-amber-200">
              Model
              <select
                value={settings.openRouterModel}
                onChange={(event) => updateSettings({ openRouterModel: event.target.value })}
                className="rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-amber-500 dark:border-amber-500/40 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Select a model…</option>
                {modelsError && <option value="">{modelsError}</option>}
                {(models ?? []).map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                    {model.free ? ' (free)' : ''}
                  </option>
                ))}
              </select>
            </label>
            {modelsError && (
              <button
                type="button"
                onClick={() => {
                  setModels(null)
                  setModelsError(null)
                }}
                className="self-start text-xs font-medium text-amber-700 underline dark:text-amber-300"
              >
                Retry model list
              </button>
            )}
          </div>
        )}

        {status === 'error' && error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}

        {status === 'done' && candidates.length === 0 && (
          <p className="px-1 text-sm text-slate-400">No matching weights found. Try a different name.</p>
        )}

        {status === 'done' && candidates.length > 0 && usedQuery.trim() !== query.trim() && (
          <p className="px-1 text-xs text-slate-400">
            Nothing for <span className="font-medium">{query.trim()}</span>. Showing results for{' '}
            <span className="font-medium">{usedQuery}</span> instead.
          </p>
        )}

        {candidates.length > 0 && (
          <ul className="flex flex-col gap-2">
            {candidates.map((candidate) => (
              <li
                key={candidate.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium break-words text-slate-800 dark:text-slate-100">
                    {candidate.label}
                  </p>
                  <p className="text-xs break-words text-slate-400">{candidate.detail}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${CONFIDENCE_CLASS[candidate.confidence]}`}
                >
                  {candidate.confidence}
                </span>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                  {formatWeight(candidate.weightKg, unit)}
                  <span className="ml-0.5 text-xs font-normal text-slate-400">{unit}</span>
                </p>
                <button
                  type="button"
                  onClick={() => onApply(candidate)}
                  className="shrink-0 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500"
                >
                  Use
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-slate-400">
          Results are estimates unless the source is a product database. Check anything important
          against the packaging.
        </p>
      </div>
    </div>
  )
}