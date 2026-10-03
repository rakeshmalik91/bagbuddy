import { useDroppable } from '@dnd-kit/core'
import { bagContainerId } from '../lib/dnd'
import { bagColor } from '../lib/bagColors'
import { bagCardLayout } from '../lib/layout'
import { itemsInContainer, bagTotals } from '../state/baggageReducer'
import type { Bag, Item, ItemColumnCount, WeightUnit } from '../types'
import { formatWeight } from '../lib/units'
import { AutoText } from './AutoText'
import { BagOptions } from './BagOptions'
import { ItemList } from './ItemList'
import { PlusIcon } from './PlusIcon'
import { WeightInput } from './WeightInput'

interface BagCardProps {
  bag: Bag
  items: Item[]
  unit: WeightUnit
  /** True while a dragged item is hovering this bag. */
  isActive: boolean
  onRename(name: string): void
  onProductName(productName: string): void
  onLookup(): void
  onTareWeight(weightKg: number): void
  onAccessoriesWeight(accessoriesKg: number): void
  onAccessoriesNote(accessoriesNote: string): void
  onLimitWeight(weightKg: number | null): void
  onColumns(itemColumns: ItemColumnCount): void
  onExtrasEnabled(enabled: boolean): void
  onColor(colorIndex: number): void
  onRemove(): void
  onRenameItem(id: string, name: string): void
  onItemProductName(id: string, productName: string): void
  onItemWeight(id: string, weightKg: number): void
  onItemAccessoriesWeight(id: string, accessoriesKg: number): void
  onItemAccessoriesNote(id: string, accessoriesNote: string): void
  onRemoveItem(id: string): void
  onLookupItem(id: string): void
}

export function BagCard({
  bag,
  items,
  unit,
  isActive,
  onRename,
  onProductName,
  onLookup,
  onTareWeight,
  onAccessoriesWeight,
  onAccessoriesNote,
  onLimitWeight,
  onColumns,
  onExtrasEnabled,
  onColor,
  onRemove,
  onRenameItem,
  onItemProductName,
  onItemWeight,
  onItemAccessoriesWeight,
  onItemAccessoriesNote,
  onRemoveItem,
  onLookupItem,
}: BagCardProps) {
  const color = bagColor(bag.colorIndex)
  const contained = itemsInContainer(items, bag.id)
  const { setNodeRef, isOver } = useDroppable({ id: bagContainerId(bag.id) })

  const totals = bagTotals(bag, items)
  const totalKg = totals.totalKg
  const over = bag.limitKg !== null && totalKg > bag.limitKg
  const near = bag.limitKg !== null && !over && totalKg > bag.limitKg * 0.9
  const ratio = bag.limitKg !== null && bag.limitKg > 0 ? totalKg / bag.limitKg : 0

  return (
    <article
      className={`flex ${bagCardLayout(bag.itemColumns)} flex-col gap-3 rounded-2xl border bg-white/80 shadow-sm ring-2 transition dark:bg-slate-900/70 ${
        over ? 'border-rose-400' : 'border-slate-200 dark:border-slate-800'
      } ${isOver || isActive ? `${color.ring} ring-2` : 'ring-transparent'}`}
    >
      <header className={`flex flex-col gap-2 rounded-t-2xl px-3 py-2.5 ${color.tint}`}>
        <div className="flex items-start gap-2">
          <span className={`mt-2 size-2.5 shrink-0 rounded-full ${color.dot}`} aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col">
            <input
              value={bag.name}
              aria-label={`Name of ${bag.name}`}
              placeholder="Bag name"
              onChange={(event) => onRename(event.target.value)}
              className="w-full rounded-md bg-transparent px-1 py-0.5 text-base font-semibold text-slate-800 outline-none transition focus:bg-white/70 dark:text-slate-100 dark:focus:bg-slate-800/70"
            />
            <input
              value={bag.productName}
              aria-label={`Product name of ${bag.name}`}
              placeholder="Brand and model, used to look up its empty weight"
              onChange={(event) => onProductName(event.target.value)}
              className="w-full rounded-md bg-transparent px-1 py-0 text-xs text-slate-500 outline-none transition placeholder:text-slate-400/70 focus:bg-white/70 dark:text-slate-400 dark:placeholder:text-slate-600 dark:focus:bg-slate-800/70"
            />
          </div>
          <BagOptions
            bagName={bag.name}
            colorIndex={bag.colorIndex}
            itemColumns={bag.itemColumns}
            extrasEnabled={bag.extrasEnabled}
            onColor={onColor}
            onColumns={onColumns}
            onExtrasEnabled={onExtrasEnabled}
          />
          <button
            type="button"
            onClick={onLookup}
            aria-label={`Look up the empty weight of ${bag.name}`}
            title="Look up the empty weight"
            className="mt-1 shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-white/70 hover:text-indigo-600 dark:hover:bg-slate-800/70 dark:hover:text-indigo-300"
          >
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor">
              <circle cx="9" cy="9" r="5.5" strokeWidth="1.7" />
              <path d="m13.5 13.5 3 3" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${bag.name}`}
            title="Remove bag"
            className="mt-1 shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-white/70 hover:text-rose-600 dark:hover:bg-slate-800/70 dark:hover:text-rose-300"
          >
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor">
              <path
                d="M4.5 6h11M8 6V4.5h4V6m-6 0 .7 9.2A1.5 1.5 0 0 0 8.2 16.5h3.6a1.5 1.5 0 0 0 1.5-1.3L14 6"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-2xl font-semibold tabular-nums text-slate-800 dark:text-slate-50">
            {formatWeight(totalKg, unit)}
            <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>
          </p>
          <p className="ml-auto text-right text-xs text-slate-500 dark:text-slate-400">
            {contained.length} item{contained.length === 1 ? '' : 's'} ·{' '}
            {formatWeight(bag.tareWeightKg, unit)} empty
            {totals.accessoriesKg > 0 && <> · {formatWeight(totals.accessoriesKg, unit)} acc</>}
          </p>
        </div>

        {bag.limitKg !== null && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={`h-full rounded-full transition-[width] ${over ? 'bg-rose-500' : color.bar}`}
                style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
              />
            </div>
            <p
              className={`text-xs font-medium tabular-nums ${
                over ? 'text-rose-600 dark:text-rose-400' : near ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
              }`}
            >
              {formatWeight(bag.limitKg, unit)} {unit} limit
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            Empty
            <WeightInput
              valueKg={bag.tareWeightKg}
              unit={unit}
              onChange={onTareWeight}
              label={`Empty weight of ${bag.name}`}
              className="w-20"
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            Limit
            <WeightInput
              valueKg={bag.limitKg ?? 0}
              unit={unit}
              onChange={(weightKg) => onLimitWeight(weightKg > 0 ? weightKg : null)}
              label={`Weight limit for ${bag.name}`}
              className="w-20"
            />
          </div>
        </div>

        {(bag.extrasEnabled || bag.accessoriesKg > 0 || bag.accessoriesNote.trim().length > 0) && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
              <PlusIcon />
            </span>
            <WeightInput
              valueKg={bag.accessoriesKg}
              unit={unit}
              onChange={onAccessoriesWeight}
              label={`Accessories weight of ${bag.name}`}
              className="w-20"
            />
            <AutoText
              value={bag.accessoriesNote}
              onChange={onAccessoriesNote}
              ariaLabel={`Accessories note of ${bag.name}`}
              placeholder="rain cover, lock…"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white/70 px-2 py-1 text-xs leading-tight text-slate-700 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
            />
          </div>
        )}
      </header>

      <div
        ref={setNodeRef}
        className={`flex min-h-20 flex-col gap-2 px-2 pb-2 ${
          isOver ? 'rounded-b-2xl bg-indigo-50/60 dark:bg-indigo-500/10' : ''
        }`}
      >
        {contained.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-slate-400">
            Drop items here to pack them in this bag.
          </p>
        ) : (
          <ItemList
            items={contained}
            containerId={bagContainerId(bag.id)}
            unit={unit}
            columns={bag.itemColumns}
            limitKg={bag.limitKg}
            inBag
            onRename={onRenameItem}
            onProductName={onItemProductName}
            onWeight={onItemWeight}
            onAccessoriesWeight={onItemAccessoriesWeight}
            onAccessoriesNote={onItemAccessoriesNote}
            onRemove={onRemoveItem}
            onLookup={onLookupItem}
          />
        )}
      </div>
    </article>
  )
}