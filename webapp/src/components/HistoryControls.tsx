interface HistoryControlsProps {
  canUndo: boolean
  canRedo: boolean
  onUndo(): void
  onRedo(): void
}

export function HistoryControls({ canUndo, canRedo, onUndo, onRedo }: HistoryControlsProps) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo"
        title="Undo (Ctrl+Z)"
        className="px-2 py-1.5 text-slate-600 transition enabled:hover:bg-slate-100 disabled:opacity-35 dark:text-slate-300 dark:enabled:hover:bg-slate-800"
      >
        <UndoIcon />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo"
        title="Redo (Ctrl+Shift+Z)"
        className="border-l border-slate-300 px-2 py-1.5 text-slate-600 transition enabled:hover:bg-slate-100 disabled:opacity-35 dark:border-slate-700 dark:text-slate-300 dark:enabled:hover:bg-slate-800"
      >
        <RedoIcon />
      </button>
    </div>
  )
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor">
      <path d="M7 6.5 3.5 10 7 13.5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 10h8.2a4.3 4.3 0 0 1 0 8.6H9" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor">
      <path d="M13 6.5 16.5 10 13 13.5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 10H8.3a4.3 4.3 0 0 0 0 8.6H11" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}