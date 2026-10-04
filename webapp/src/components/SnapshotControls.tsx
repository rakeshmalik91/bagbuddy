import { useState } from 'react'
import type { LayoutSnapshot } from '../types'

interface SnapshotControlsProps {
  snapshots?: LayoutSnapshot[]
  onSave(name: string): void
  onApply(id: string): void
  onDelete(id: string): void
}

export function SnapshotControls({
  snapshots = [],
  onSave,
  onApply,
  onDelete,
}: SnapshotControlsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleOpen() {
    setSnapshotName(`Layout ${snapshots.length + 1}`)
    setError(null)
    setIsOpen(true)
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = snapshotName.trim()
    if (!trimmed) {
      setError('Please enter a name.')
      return
    }
    const isTaken = snapshots.some(
      (s) => s.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (isTaken) {
      setError('A snapshot with this name already exists.')
      return
    }
    onSave(trimmed)
    setIsOpen(false)
    setStatusMessage(`Saved "${trimmed}"`)
    setTimeout(() => setStatusMessage(null), 3000)
  }

  function handleApply(id: string) {
    if (!id) return
    setSelectedId(id)
    onApply(id)
    const target = snapshots.find((s) => s.id === id)
    setStatusMessage(`Applied "${target?.name || 'snapshot'}"`)
    setTimeout(() => setStatusMessage(null), 3000)
  }

  function handleDeleteCurrent() {
    if (!selectedId) return
    const target = snapshots.find((s) => s.id === selectedId)
    const name = target?.name || 'this snapshot'
    if (!window.confirm(`Delete snapshot "${name}"?`)) return
    onDelete(selectedId)
    setSelectedId('')
    setStatusMessage(`Deleted "${name}"`)
    setTimeout(() => setStatusMessage(null), 3000)
  }

  return (
    <div className="relative inline-flex items-center gap-1.5">
      {/* Dropdown for snapshots */}
      <div className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white/90 px-2 py-0.5 shadow-2xs transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/90 dark:hover:border-slate-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-3.5 shrink-0 text-slate-500 dark:text-slate-400"
          aria-hidden="true"
        >
          <path d="M10 3.75a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM17.25 4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 .75-.75ZM5 3.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 3.75ZM14 10a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM17.25 10.75a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 .75-.75ZM8 10a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1 0-1.5h4.5A.75.75 0 0 1 8 10ZM10 16.25a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM17.25 17a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 .75-.75ZM5 16.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75Z" />
        </svg>

        <select
          value={selectedId}
          onChange={(e) => handleApply(e.target.value)}
          aria-label="Layout snapshots"
          disabled={snapshots.length === 0}
          className="bg-transparent text-xs font-medium text-slate-700 outline-none disabled:cursor-not-allowed disabled:text-slate-400 dark:text-slate-200 dark:disabled:text-slate-500"
        >
          <option value="" disabled={snapshots.length === 0}>
            {snapshots.length === 0 ? 'No snapshots' : 'Select snapshot…'}
          </option>
          {snapshots.map((snapshot) => (
            <option key={snapshot.id} value={snapshot.id} className="dark:bg-slate-900">
              {snapshot.name}
            </option>
          ))}
        </select>

        {selectedId && (
          <button
            type="button"
            onClick={handleDeleteCurrent}
            title="Delete this snapshot"
            aria-label="Delete selected snapshot"
            className="ml-0.5 rounded-sm p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
              <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A1.25 1.25 0 0 0 9.75 2h-3.5A1.25 1.25 0 0 0 5 3.25Zm1.5.75h3v-.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25V4Zm-.25 3.75a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Zm3.5 0a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Button to add current state as snapshot */}
      {!isOpen ? (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/70 px-2 py-0.5 text-xs font-semibold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-100/70 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="size-3 shrink-0"
            aria-hidden="true"
          >
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          <span>Add snapshot</span>
        </button>
      ) : (
        <form
          onSubmit={handleSave}
          className="flex items-center gap-1 rounded-lg border border-indigo-400 bg-white p-0.5 shadow-sm dark:border-indigo-500 dark:bg-slate-900"
        >
          <input
            autoFocus
            type="text"
            value={snapshotName}
            onChange={(e) => {
              setSnapshotName(e.target.value)
              if (error) setError(null)
            }}
            placeholder="Snapshot name"
            aria-label="New snapshot name"
            className={`w-28 rounded-md bg-transparent px-1.5 py-0.5 text-xs font-medium text-slate-800 outline-none transition focus:ring-1 focus:ring-indigo-500 dark:text-slate-100 ${
              error ? 'ring-1 ring-rose-500 text-rose-600' : ''
            }`}
          />
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-indigo-500"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-md px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Floating status or error message */}
      {statusMessage && (
        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 animate-fade-in">
          ✓ {statusMessage}
        </span>
      )}
      {error && (
        <span className="text-[11px] font-medium text-rose-500 dark:text-rose-400">
          ⚠️ {error}
        </span>
      )}
    </div>
  )
}
