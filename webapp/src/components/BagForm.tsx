import { useState } from 'react'
import type { WeightUnit } from '../types'
import { WeightInput } from './WeightInput'

export interface NewBagInput {
  name: string
  productName: string
  tareWeightKg: number
  accessoriesKg: number
  limitKg: number | null
  colorIndex: number
}

interface BagFormProps {
  unit: WeightUnit
  colorIndex: number
  onAdd(input: NewBagInput): void
  /** Omit for the primary call to action on the empty state, where there is nothing to cancel. */
  onCancel?(): void
}

export function BagForm({ unit, colorIndex, onAdd, onCancel }: BagFormProps) {
  const [name, setName] = useState('')
  const [productName, setProductName] = useState('')
  const [tareWeightKg, setTareWeightKg] = useState(0)
  const [accessoriesKg, setAccessoriesKg] = useState(0)
  const [limitKg, setLimitKg] = useState(0)

  function submit() {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    onAdd({
      name: trimmed,
      productName: productName.trim(),
      tareWeightKg,
      accessoriesKg,
      limitKg: limitKg > 0 ? limitKg : null,
      colorIndex,
    })
  }

  return (
    <form
      className="flex min-w-80 flex-[1_1_300px] basis-[300px] max-w-[640px] flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/70"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Bag name, e.g. Cabin bag"
        aria-label="New bag name"
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-base font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      <input
        value={productName}
        onChange={(event) => setProductName(event.target.value)}
        placeholder="Brand and model, used to look up its empty weight"
        aria-label="New bag product name"
        className="rounded-lg border border-transparent bg-transparent px-3 py-0.5 text-xs text-slate-500 outline-none transition placeholder:text-slate-400 hover:border-slate-200 focus:border-slate-300 dark:text-slate-400"
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-slate-500">
          Empty weight
          <WeightInput
            valueKg={tareWeightKg}
            unit={unit}
            onChange={setTareWeightKg}
            label="Empty weight of the new bag"
            className="w-20"
          />
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          Extras
          <WeightInput
            valueKg={accessoriesKg}
            unit={unit}
            onChange={setAccessoriesKg}
            label="Accessories weight of the new bag"
            className="w-20"
          />
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          Limit
          <WeightInput
            valueKg={limitKg}
            unit={unit}
            onChange={setLimitKg}
            label="Weight limit for the new bag"
            className="w-20"
          />
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={name.trim().length === 0}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition enabled:hover:bg-indigo-500 disabled:opacity-40"
        >
          Add bag
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}