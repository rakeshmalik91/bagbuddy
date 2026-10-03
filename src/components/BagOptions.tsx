import { useEffect, useRef, useState } from 'react'
import { BAG_COLORS, bagColor } from '../lib/bagColors'
import type { ItemColumnCount } from '../types'

interface BagOptionsProps {
  bagName: string
  colorIndex: number
  itemColumns: ItemColumnCount
  extrasEnabled: boolean
  onColor(colorIndex: number): void
  onColumns(itemColumns: ItemColumnCount): void
  onExtrasEnabled(enabled: boolean): void
}

/** Colour, column layout and the bag extras row, tucked behind one menu. */
export function BagOptions({
  bagName,
  colorIndex,
  itemColumns,
  extrasEnabled,
  onColor,
  onColumns,
  onExtrasEnabled,
}: BagOptionsProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Options for ${bagName}`}
        title="Bag options"
        className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/70 hover:text-slate-700 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
      >
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="currentColor">
          <circle cx="10" cy="4.5" r="1.4" />
          <circle cx="10" cy="10" r="1.4" />
          <circle cx="10" cy="15.5" r="1.4" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-30 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        >
          <p className="px-1 pb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            Columns
          </p>
          <div className="flex gap-1 pb-2">
            {([1, 2, 3] as ItemColumnCount[]).map((count) => (
              <button
                key={count}
                type="button"
                role="menuitemradio"
                aria-checked={itemColumns === count}
                onClick={() => onColumns(count)}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                  itemColumns === count
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {count}
              </button>
            ))}
          </div>

          <p className="border-t border-slate-100 px-1 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase dark:border-slate-800">
            Colour
          </p>
          <div className="flex flex-wrap gap-1.5 px-1 pb-1">
            {BAG_COLORS.map((swatch, index) => (
              <button
                key={swatch.name}
                type="button"
                role="menuitemradio"
                aria-checked={colorIndex === index}
                aria-label={swatch.name}
                title={swatch.name}
                onClick={() => onColor(index)}
                className={`size-5 rounded-full transition ${swatch.dot} ${
                  colorIndex === index
                    ? 'ring-2 ring-slate-500 ring-offset-1 dark:ring-slate-300'
                    : 'opacity-60 hover:opacity-100'
                }`}
              />
            ))}
          </div>

          <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
            <Toggle
              label="Bag extras row"
              checked={extrasEnabled}
              onChange={onExtrasEnabled}
            />
          </div>
          <p className="sr-only">{bagColor(colorIndex).name}</p>
        </div>
      )}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange(checked: boolean): void
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1.5 text-left text-xs text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={`flex h-4 w-7 items-center rounded-full p-0.5 transition ${
          checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`size-3 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-3' : ''
          }`}
        />
      </span>
    </button>
  )
}