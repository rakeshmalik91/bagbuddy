import { useState } from 'react'
import type { ItemKind, WeightUnit } from '../types'
import { AutoText } from './AutoText'
import { WeightInput } from './WeightInput'

export interface NewItemInput {
  name: string
  productName: string
  weightKg: number
  accessoriesKg: number
  kind: ItemKind
}

interface ItemFormProps {
  unit: WeightUnit
  submitLabel?: string
  existingItemNames?: string[]
  onAdd(input: NewItemInput): void
  onCancel(): void
  onLookup(name: string, productName: string, kind: ItemKind): void
}

export function ItemForm({
  unit,
  submitLabel = 'Add',
  existingItemNames = [],
  onAdd,
  onCancel,
  onLookup,
}: ItemFormProps) {
  const [name, setName] = useState('')
  const [productName, setProductName] = useState('')
  const [weightKg, setWeightKg] = useState(0)
  const [accessoriesKg, setAccessoriesKg] = useState(0)
  const [kind, setKind] = useState<ItemKind>('item')

  const trimmedName = name.trim()
  const isDuplicate = Boolean(
    trimmedName &&
      existingItemNames.some(
        (existing) => existing.trim().toLowerCase() === trimmedName.toLowerCase(),
      ),
  )

  function submit() {
    if (trimmedName.length === 0 || isDuplicate) return
    onAdd({ name: trimmedName, productName: productName.trim(), weightKg, accessoriesKg, kind })
    setName('')
    setProductName('')
    setWeightKg(0)
    setAccessoriesKg(0)
    setKind('item')
  }

  return (
    <form
      // A weight like 0.08 kg is not a multiple of the field's 0.05 step, and the
      // browser would refuse to submit rather than let the app store it.
      noValidate
      className="flex flex-col gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-2 dark:border-slate-700 dark:bg-slate-900/60"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <AutoText
            value={name}
            onChange={setName}
            placeholder="What are you packing?"
            ariaLabel="New item name"
            autoFocus
            submitOnEnter
            className={`w-full rounded-lg border bg-white px-2 py-1.5 text-base font-semibold transition dark:bg-slate-900 ${
              isDuplicate
                ? 'border-rose-400 text-rose-700 ring-2 ring-rose-500/20 focus:border-rose-500 dark:border-rose-500 dark:text-rose-300'
                : 'border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:text-slate-100'
            }`}
          />
          {isDuplicate && (
            <p className="text-xs font-medium text-rose-500 dark:text-rose-400">
              An item named &ldquo;{trimmedName}&rdquo; already exists.
            </p>
          )}
          <AutoText
            value={productName}
            onChange={setProductName}
            placeholder="Product, used to look up a weight"
            ariaLabel="New item product name"
            submitOnEnter
            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-0.5 text-xs text-slate-500 transition placeholder:text-slate-300 hover:border-slate-200 focus:border-slate-300 dark:text-slate-400 dark:placeholder:text-slate-600"
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
          onClick={() => onLookup(name.trim(), productName.trim(), kind)}
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
            disabled={trimmedName.length === 0 || isDuplicate}
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

<div className="flex flex-wrap items-center gap-1.5 pl-1 text-xs text-slate-500">
        Accessories
        <WeightInput
          valueKg={accessoriesKg}
          unit={unit}
          onChange={setAccessoriesKg}
          label="Accessories weight of the new item"
          className="w-20"
        />
        <span className="text-[11px] text-slate-400">optional extras that travel with it</span>

        <button
          type="button"
          aria-pressed={kind === 'pouch'}
          onClick={() => setKind((value) => (value === 'pouch' ? 'item' : 'pouch'))}
          title="A pouch holds other items, which are added on top of its own weight"
          className={`ml-auto shrink-0 rounded-md border px-1.5 py-1 text-[11px] font-medium transition ${
            kind === 'pouch'
              ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-300'
              : 'border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-600 dark:hover:border-indigo-500 dark:hover:text-indigo-300'
          }`}
        >
          {kind === 'pouch' ? 'Pouch' : 'Make it a pouch'}
        </button>
      </div>
      {kind === 'pouch' && (
        <p className="px-1 text-[11px] text-slate-400">
          The weight above is the pouch itself. Drag other items onto it to pack them in.
        </p>
      )}
    </form>
  )
}