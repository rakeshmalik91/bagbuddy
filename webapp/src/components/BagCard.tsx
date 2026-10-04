import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { bagContainerId, toBagDragId } from '../lib/dnd'
import { bagColor } from '../lib/bagColors'
import { bagCardLayout } from '../lib/layout'
import { itemsInContainer, bagTotals } from '../state/baggageReducer'
import type { Bag, Item, ItemColumnCount, ItemKind, WeightUnit } from '../types'
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
  /** The container a drag is currently over. */
  hoverContainerId: string | null
  otherBagNames?: string[]
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
  onToggleParked(): void
  onRemove(): void
  onRenameItem(id: string, name: string): void
  onItemProductName(id: string, productName: string): void
  onItemWeight(id: string, weightKg: number): void
  onItemAccessoriesWeight(id: string, accessoriesKg: number): void
  onItemAccessoriesNote(id: string, accessoriesNote: string): void
  onConvertItemKind(id: string, kind: ItemKind): void
  onRemoveItem(id: string): void
  onLookupItem(id: string): void
}

export function BagCard({
  bag,
  items,
  unit,
  hoverContainerId,
  otherBagNames = [],
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
  onToggleParked,
  onRemove,
  onRenameItem,
  onItemProductName,
  onItemWeight,
  onItemAccessoriesWeight,
  onItemAccessoriesNote,
  onConvertItemKind,
  onRemoveItem,
  onLookupItem,
}: BagCardProps) {
  const color = bagColor(bag.colorIndex)
  const contained = itemsInContainer(items, bag.id)
  const { setNodeRef: setBagDropRef, isOver } = useDroppable({ id: bagContainerId(bag.id) })
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: toBagDragId(bag.id),
    data: { type: 'bag', bag },
  })
  const isActive = hoverContainerId === bagContainerId(bag.id)

  const trimmedBagName = bag.name.trim()
  const isNameDuplicate = Boolean(
    trimmedBagName &&
      otherBagNames.some(
        (other) => other.trim().toLowerCase() === trimmedBagName.toLowerCase(),
      ),
  )

  const totals = bagTotals(bag, items)
  const totalKg = totals.totalKg
  const over = bag.limitKg !== null && totalKg > bag.limitKg
  const near = bag.limitKg !== null && !over && totalKg > bag.limitKg * 0.9
  const ratio = bag.limitKg !== null && bag.limitKg > 0 ? totalKg / bag.limitKg : 0

  return (
    <article
      ref={setSortableRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : undefined,
      }}
      className={`flex ${bagCardLayout(bag.itemColumns)} flex-col gap-3 rounded-2xl border bg-white/80 shadow-sm ring-2 transition dark:bg-slate-900/70 ${
        over ? 'border-rose-400' : 'border-slate-200 dark:border-slate-800'
      } ${isOver || isActive ? `${color.ring} ring-2` : 'ring-transparent'}`}
    >
      <header className={`flex flex-col gap-2 rounded-t-2xl px-3 py-2.5 ${color.tint}`}>
        <div className="flex items-start gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            title="Drag to reorder bag or drag across parking line"
            aria-label={`Drag to reorder ${bag.name}`}
            className="mt-1 -ml-1 cursor-grab rounded p-1 text-slate-400 transition hover:bg-black/5 hover:text-slate-600 active:cursor-grabbing dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-300"
          >
            <svg className="size-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="3" r="1.5" />
              <circle cx="11" cy="3" r="1.5" />
              <circle cx="5" cy="8" r="1.5" />
              <circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="13" r="1.5" />
              <circle cx="11" cy="13" r="1.5" />
            </svg>
          </button>
          <span className={`mt-2 size-2.5 shrink-0 rounded-full ${color.dot}`} aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2">
              <AutoText
                value={bag.name}
                ariaLabel={`Name of ${bag.name}`}
                placeholder="Bag name"
                onChange={onRename}
                className={`min-w-0 flex-1 rounded-md px-1 py-0.5 text-base font-semibold transition ${
                  isNameDuplicate
                    ? 'border border-rose-400 bg-rose-50/50 text-rose-700 ring-2 ring-rose-500/20 dark:border-rose-500 dark:bg-rose-950/30 dark:text-rose-300'
                    : 'bg-transparent text-slate-800 focus:bg-white/70 dark:text-slate-100 dark:focus:bg-slate-800/70'
                }`}
              />
              {bag.parked && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300/80 bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <span className="flex size-3 items-center justify-center rounded-xs bg-slate-500 text-[8px] font-bold text-white dark:bg-slate-600">
                    P
                  </span>
                  Parked
                </span>
              )}
            </div>
            {isNameDuplicate && (
              <p className="mt-0.5 text-xs font-medium text-rose-500 dark:text-rose-400">
                A bag named &ldquo;{trimmedBagName}&rdquo; already exists
              </p>
            )}
            <AutoText
              value={bag.productName}
              ariaLabel={`Product name of ${bag.name}`}
              placeholder="Brand and model, used to look up its empty weight"
              onChange={onProductName}
              className="w-full rounded-md bg-transparent px-1 py-0 text-xs text-slate-500 transition placeholder:text-slate-400/70 focus:bg-white/70 dark:text-slate-400 dark:placeholder:text-slate-600 dark:focus:bg-slate-800/70"
            />
          </div>
          <BagOptions
            bagName={bag.name}
            colorIndex={bag.colorIndex}
            itemColumns={bag.itemColumns}
            extrasEnabled={bag.extrasEnabled}
            parked={Boolean(bag.parked)}
            onColor={onColor}
            onColumns={onColumns}
            onExtrasEnabled={onExtrasEnabled}
            onToggleParked={onToggleParked}
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
        ref={setBagDropRef}
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
            allItems={items}
            containerId={bagContainerId(bag.id)}
            unit={unit}
            columns={bag.itemColumns}
            limitKg={bag.limitKg}
            inBag
            hoverContainerId={hoverContainerId}
            onRename={onRenameItem}
            onProductName={onItemProductName}
            onWeight={onItemWeight}
            onAccessoriesWeight={onItemAccessoriesWeight}
            onAccessoriesNote={onItemAccessoriesNote}
            onConvertKind={onConvertItemKind}
            onRemove={onRemoveItem}
            onLookup={onLookupItem}
          />
        )}
      </div>
    </article>
  )
}