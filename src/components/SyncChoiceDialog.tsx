import { useCloud } from '../state/cloudSyncContext'

function when(timestamp: number | null): string {
  if (!timestamp) return 'at an unknown time'
  return new Date(timestamp).toLocaleString()
}

export function SyncChoiceDialog() {
  const cloud = useCloud()
  if (!cloud.choice) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cloud.dismissChoice()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose which copy of your bags to keep"
        className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl dark:bg-slate-900"
      >
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Which copy should win?
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your account already has bags saved in the cloud, saved {when(cloud.choice.remoteUpdatedAt)}.
          {cloud.choice.localIsEmpty
            ? ' Nothing is stored on this device yet.'
            : ' This device also has bags, so choose carefully — one copy replaces the other.'}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void cloud.useRemoteCopy()}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Use the cloud copy
          </button>
          <button
            type="button"
            onClick={() => void cloud.overwriteRemote()}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Keep this device and replace the cloud copy
          </button>
          <button
            type="button"
            onClick={cloud.dismissChoice}
            className="rounded-lg px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}