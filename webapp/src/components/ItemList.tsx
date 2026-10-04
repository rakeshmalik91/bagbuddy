import type { ReactNode } from 'react'
import { rectSortingStrategy, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { pouchContainerId, toDragIds } from '../lib/dnd'
import { fillTone } from '../lib/fillTone'
import { itemTotalKg, pouchContents, pouchTotals } from '../state/baggageReducer'
import type { Item, ItemKind, WeightUnit } from '../types'
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

/** Contents are always one column, however many columns the bag itself uses. */
const CONTENTS_CLASS =
  'mt-1.5 flex flex-col gap-1.5 border-l-2 border-dashed border-slate-200 pl-2 dark:border-slate-700'

const SORTING_STRATEGY = {
  1: 'vertical',
  2: 'rect',
  3: 'rect',
} as const

interface ItemListProps {
  /** The items listed in this container, in display order. */
  items: Item[]
  /** Every item, so a pouch in this list can find what is inside it. */
  allItems: Item[]
  containerId: string
  unit: WeightUnit
  columns: number
  /** The bag's weight limit, used to tint each item by its share of it. */
  limitKg: number | null
  /** Inside a bag the delete control takes the item out rather than removing it. */
  inBag: boolean
  /** The container a drag is currently over, used to light up a pouch. */
  hoverContainerId: string | null
  onRename(id: string, name: string): void
  onProductName(id: string, productName: string): void
  onWeight(id: string, weightKg: number): void
  onAccessoriesWeight(id: string, accessoriesKg: number): void
  onAccessoriesNote(id: string, accessoriesNote: string): void
  onConvertKind(id: string, kind: ItemKind): void
  onRemove(id: string): void
  onLookup(id: string): void
}

/**
 * The item list inside a bag, the tray, or a pouch. With more than one column the
 * items flow like newspaper columns, so a bag with many items stays short. A
 * pouch renders its contents as a nested list, so a packed pouch still reads as
 * one card, with what it carries listed underneath it.
 */
export function ItemList({
  items,
  allItems,
  containerId,
  unit,
  columns,
  limitKg,
  inBag,
  hoverContainerId,
  onRename,
  onProductName,
  onWeight,
  onAccessoriesWeight,
  onAccessoriesNote,
  onConvertKind,
  onRemove,
  onLookup,
}: ItemListProps) {
  const strategy =
    SORTING_STRATEGY[columns === 1 ? 1 : 2] === 'rect'
      ? rectSortingStrategy
      : verticalListSortingStrategy

  /**
   * One row, plus the contents nested under it when it is a pouch. Contents are
   * plain items by construction, so this never nests a second level.
   */
  function renderRow(item: Item, ownerId: string): ReactNode {
    const contents = item.kind === 'pouch' ? pouchContents(allItems, item.id) : []
    const carried = pouchTotals(allItems, item.id)
    const otherItemNames = allItems
      .filter((other) => other.id !== item.id)
      .map((other) => other.name)

    return (
      <ItemRow
        key={item.id}
        item={item}
        containerId={ownerId}
        unit={unit}
        compact={columns > 1}
        tone={fillTone(limitKg ? itemTotalKg(item) / limitKg : 0)}
        inBag={inBag}
        contentsCount={carried.itemCount}
        contentsKg={carried.totalKg}
        isDropTarget={item.kind === 'pouch' && hoverContainerId === pouchContainerId(item.id)}
        otherItemNames={otherItemNames}
        onRename={(name) => onRename(item.id, name)}
        onProductName={(productName) => onProductName(item.id, productName)}
        onWeight={(weightKg) => onWeight(item.id, weightKg)}
        onAccessoriesWeight={(accessoriesKg) => onAccessoriesWeight(item.id, accessoriesKg)}
        onAccessoriesNote={(accessoriesNote) => onAccessoriesNote(item.id, accessoriesNote)}
        onConvertKind={(kind) => onConvertKind(item.id, kind)}
        onRemove={() => onRemove(item.id)}
        onLookup={() => onLookup(item.id)}
      >
        {contents.length > 0 && (
          <SortableContext items={toDragIds(contents)} strategy={verticalListSortingStrategy}>
            <ul className={CONTENTS_CLASS}>
              {contents.map((child) => renderRow(child, pouchContainerId(item.id)))}
            </ul>
          </SortableContext>
        )}
      </ItemRow>
    )
  }

  return (
    <SortableContext items={toDragIds(items)} strategy={strategy}>
      <ul className={LIST_CLASS[columns] ?? LIST_CLASS[1]}>
        {items.map((item) => renderRow(item, containerId))}
      </ul>
    </SortableContext>
  )
}