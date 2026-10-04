import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { POOL_ID } from '../lib/dnd'
import type { Item, WeightUnit } from '../types'
import { ItemForm } from './ItemForm'
import type { NewItemInput } from './ItemForm'
import { ItemList } from './ItemList'

interface ItemPoolProps {
  items: Item[]
  unit: WeightUnit
  columns: number
  /** True while a dragged item is hovering this tray. */
  isActive: boolean
  onAdd(input: NewItemInput): void
  onRename(id: string, name: string): void
  onProductName(id: string, productName: string): void
  onWeight(id: string, weightKg: number): void
  onAccessoriesWeight(id: string, accessoriesKg: number): void
  onAccessoriesNote(id: string, accessoriesNote: string): void
  onRemove(id: string): void
  onLookup(id: string): void
  onLookupFromForm(name: string, productName: string, settled: () => void): void
}

export function ItemPool({
  items,
  unit,
  columns,
  isActive,
  onAdd,
  onRename,
  onProductName,
  onWeight,
  onAccessoriesWeight,
  onAccessoriesNote,
  onRemove,
  onLookup,
  onLookupFromForm,
}: ItemPoolProps) {
  const [adding, setAdding] = useState(false)
  const { setNodeRef, isOver } = useDroppable({ id: POOL_ID })

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-slate-700 uppercase dark:text-slate-300">
          Items
        </h2>
        <p className="text-xs text-slate-400">
          {items.length} unassigned · drag into a bag
        </p>
      </header>

      {adding ? (
        <ItemForm
          unit={unit}
          onAdd={(input) => {
            onAdd(input)
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
          onLookup={(name, productName) => onLookupFromForm(name, productName, () => setAdding(false))}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/60 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
        >
          + Add item
        </button>
      )}

      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-col rounded-2xl border-2 border-dashed p-2 transition-colors ${
          isOver || isActive
            ? 'border-indigo-400 bg-indigo-50/70 dark:border-indigo-500 dark:bg-indigo-500/10'
            : 'border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-900/40'
        }`}
      >
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-slate-400">
            Nothing waiting to be packed. Add an item, or drag one back out of a bag.
          </p>
        ) : (
          <ItemList
            items={items}
            containerId={POOL_ID}
            unit={unit}
            columns={columns}
            limitKg={null}
            inBag={false}
            onRename={onRename}
            onProductName={onProductName}
            onWeight={onWeight}
            onAccessoriesWeight={onAccessoriesWeight}
            onAccessoriesNote={onAccessoriesNote}
            onRemove={onRemove}
            onLookup={onLookup}
          />
        )}
      </div>
    </section>
  )
}