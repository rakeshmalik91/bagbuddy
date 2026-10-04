import { useState } from 'react'
import type { WeightUnit } from '../types'
import { WeightInput } from './WeightInput'

export interface NewItemInput {
  name: string
  productName: string
  weightKg: number
  accessoriesKg: number
}

interface ItemFormProps {
  unit: WeightUnit
  submitLabel?: string
  onAdd(input: NewItemInput): void
  onCancel(): void
  onLookup(name: string, productName: string): void
}

export function ItemForm({ unit, submitLabel = 'Add', onAdd, onCancel, onLookup }: ItemFormProps) {
  const [name, setName] = useState('')
  const [productName, setProductName] = useState('')
  const [weightKg, setWeightKg] = useState(0)
  const [accessoriesKg, setAccessoriesKg] = useState(0)

  function submit() {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    onAdd({ name: trimmed, productName: productName.trim(), weightKg, accessoriesKg })
    setName('')
    setProductName('')
    setWeightKg(0)
    setAccessoriesKg(0)
  }

  return (
    <form
      className="flex flex-col gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-2 dark:border-slate-700 dark:bg-slate-900/60"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="What are you packing?"
            aria-label="New item name"
            autoFocus
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-base font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            placeholder="Product, used to look up a weight"
            aria-label="New item product name"
            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-0.5 text-xs text-slate-500 outline-none transition placeholder:text-slate-300 hover:border-slate-200 focus:border-slate-300 dark:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>

        <WeightInput
          valueKg={weightKg}
          unit={unit}
          onChange={setWeightKg}
          label="Weight of the new item"
          className="w-24 shrink-0"
        />

        <button
          type="button"
          onClick={() => onLookup(name.trim(), productName.trim())}
          disabled={name.trim().length === 0 && productName.trim().length === 0}
          aria-label="Look up this item's weight"
          title="Look up weight"
          className="shrink-0 rounded-lg p-2 text-slate-500 transition enabled:hover:bg-indigo-50 enabled:hover:text-indigo-600 disabled:opacity-40 dark:enabled:hover:bg-indigo-500/10 dark:enabled:hover:text-indigo-300"
        >
          <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor">
            <circle cx="9" cy="9" r="5.5" strokeWidth="1.7" />
            <path d="m13.5 13.5 3 3" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="submit"
            disabled={name.trim().length === 0}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition enabled:hover:bg-indigo-500 disabled:opacity-40"
          >
            {submitLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel adding item"
            className="rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pl-1 text-xs text-slate-500">
        Accessories
        <WeightInput
          valueKg={accessoriesKg}
          unit={unit}
          onChange={setAccessoriesKg}
          label="Accessories weight of the new item"
          className="w-20 shrink-0"
        />
        <span className="text-[11px] text-slate-400">optional extras that travel with it</span>
      </div>
    </form>
  )
}