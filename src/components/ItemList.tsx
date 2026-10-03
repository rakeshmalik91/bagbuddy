import { rectSortingStrategy, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { toDragIds } from '../lib/dnd'
import { fillTone } from '../lib/fillTone'
import { itemTotalKg } from '../state/baggageReducer'
import type { Item, WeightUnit } from '../types'
import { ItemRow } from './ItemRow'

/**
 * `columns-*` only applies to a block container, so the multi-column variants
 * drop flex entirely and space the items with margins instead.
 */
const LIST_CLASS: Record<number, string> = {
  1: 'flex flex-col gap-2',
  2: 'block columns-2 column-gap-2 [&>li]:mb-2 [&>li]:break-inside-avoid',
  3: 'block columns-3 column-gap-2 [&>li]:mb-2 [&>li]:break-inside-avoid',
}

const SORTING_STRATEGY = {
  1: 'vertical',
  2: 'rect',
  3: 'rect',
} as const

interface ItemListProps {
  items: Item[]
  containerId: string
  unit: WeightUnit
  columns: number
  /** The bag's weight limit, used to tint each item by its share of it. */
  limitKg: number | null
  /** Inside a bag the delete control takes the item out rather than removing it. */
  inBag: boolean
  onRename(id: string, name: string): void
  onProductName(id: string, productName: string): void
  onWeight(id: string, weightKg: number): void
  onAccessoriesWeight(id: string, accessoriesKg: number): void
  onAccessoriesNote(id: string, accessoriesNote: string): void
  onRemove(id: string): void
  onLookup(id: string): void
}

/**
 * The item list inside a bag or the tray. With more than one column the items
 * flow like newspaper columns, so a bag with many items stays short.
 */
export function ItemList({
  items,
  containerId,
  unit,
  columns,
  limitKg,
  inBag,
  onRename,
  onProductName,
  onWeight,
  onAccessoriesWeight,
  onAccessoriesNote,
  onRemove,
  onLookup,
}: ItemListProps) {
  const strategy =
    SORTING_STRATEGY[columns === 1 ? 1 : 2] === 'rect'
      ? rectSortingStrategy
      : verticalListSortingStrategy

  return (
    <SortableContext items={toDragIds(items)} strategy={strategy}>
      <ul className={LIST_CLASS[columns] ?? LIST_CLASS[1]}>
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            containerId={containerId}
            unit={unit}
            compact={columns > 1}
            tone={fillTone(limitKg ? itemTotalKg(item) / limitKg : 0)}
            inBag={inBag}
            onRename={(name) => onRename(item.id, name)}
            onProductName={(productName) => onProductName(item.id, productName)}
            onWeight={(weightKg) => onWeight(item.id, weightKg)}
            onAccessoriesWeight={(accessoriesKg) => onAccessoriesWeight(item.id, accessoriesKg)}
            onAccessoriesNote={(accessoriesNote) => onAccessoriesNote(item.id, accessoriesNote)}
            onRemove={() => onRemove(item.id)}
            onLookup={() => onLookup(item.id)}
          />
        ))}
      </ul>
    </SortableContext>
  )
}