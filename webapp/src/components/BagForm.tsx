import { useState } from 'react'
import type { WeightUnit } from '../types'
import { SINGLE_BAG_LAYOUT } from '../lib/layout'
import { AutoText } from './AutoText'
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
  existingBagNames?: string[]
  onAdd(input: NewBagInput): void
  /** Omit for the primary call to action on the empty state, where there is nothing to cancel. */
  onCancel?(): void
}

export function BagForm({ unit, colorIndex, existingBagNames = [], onAdd, onCancel }: BagFormProps) {
  const [name, setName] = useState('')
  const [productName, setProductName] = useState('')
  const [tareWeightKg, setTareWeightKg] = useState(0)
  const [accessoriesKg, setAccessoriesKg] = useState(0)
  const [limitKg, setLimitKg] = useState(0)

  const trimmedName = name.trim()
  const isDuplicate = Boolean(
    trimmedName &&
      existingBagNames.some(
        (existing) => existing.trim().toLowerCase() === trimmedName.toLowerCase(),
      ),
  )

  function submit() {
    if (trimmedName.length === 0 || isDuplicate) return
    onAdd({
      name: trimmedName,
      productName: productName.trim(),
      tareWeightKg,
      accessoriesKg,
      limitKg: limitKg > 0 ? limitKg : null,
      colorIndex,
    })
  }

  return (
    <form
      // Weights are the app's own business, and a value like 0.12 kg is not a
      // multiple of the field's 0.05 step, which would otherwise block the form.
      noValidate
      className={`flex flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/70 ${SINGLE_BAG_LAYOUT}`}
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div>
        <AutoText
          value={name}
          onChange={setName}
          placeholder="Bag name, e.g. Cabin bag"
          ariaLabel="New bag name"
          autoFocus
          submitOnEnter
          className={`w-full rounded-lg border bg-white px-3 py-1.5 text-base font-semibold transition dark:bg-slate-900 ${
            isDuplicate
              ? 'border-rose-400 text-rose-700 ring-2 ring-rose-500/20 focus:border-rose-500 dark:border-rose-500 dark:text-rose-300'
              : 'border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:text-slate-100'
          }`}
        />
        {isDuplicate && (
          <p className="mt-1 text-xs font-medium text-rose-500 dark:text-rose-400">
            A bag named &ldquo;{trimmedName}&rdquo; already exists.
          </p>
        )}
      </div>
      <AutoText
        value={productName}
        onChange={setProductName}
        placeholder="Brand and model, used to look up its empty weight"
        ariaLabel="New bag product name"
        submitOnEnter
        className="rounded-lg border border-transparent bg-transparent px-3 py-0.5 text-xs text-slate-500 transition placeholder:text-slate-400 hover:border-slate-200 focus:border-slate-300 dark:text-slate-400"
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
          disabled={trimmedName.length === 0 || isDuplicate}
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