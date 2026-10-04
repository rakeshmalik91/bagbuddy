import { arrayMove } from '@dnd-kit/sortable'
import type { Bag, BagTotals, BaggageState, Item, WeightUnit } from '../types'

export type BagAction =
  | { type: 'bag/add'; bag: Bag }
  | { type: 'bag/update'; id: string; patch: Partial<Omit<Bag, 'id'>> }
  | { type: 'bag/remove'; id: string }
  | { type: 'item/add'; item: Item }
  | { type: 'item/update'; id: string; patch: Partial<Omit<Item, 'id'>> }
  | { type: 'item/remove'; id: string }
  | { type: 'item/move'; itemId: string; toBagId: string | null }
  | { type: 'item/reorder'; bagId: string | null; fromIndex: number; toIndex: number }
  | { type: 'unit/set'; unit: WeightUnit }
  | { type: 'state/reset'; state: BaggageState }

/**
 * Moves an item into `toBagId` and appends it to the end of that container so
 * the flat item array stays the single source of ordering truth.
 */
function withMovedItem(items: Item[], itemId: string, toBagId: string | null): Item[] {
  const moved = items.find((item) => item.id === itemId)
  if (!moved || moved.bagId === toBagId) return items

  const others = items.filter((item) => item.id !== itemId)
  let insertAt = -1
  for (let index = 0; index < others.length; index += 1) {
    if (others[index]!.bagId === toBagId) insertAt = index
  }
  others.splice(insertAt + 1, 0, { ...moved, bagId: toBagId })
  return others
}

/** Reorders inside one container, leaving every other item's slot untouched. */
function reorderWithin(items: Item[], bagId: string | null, from: number, to: number): Item[] {
  const container = itemsInContainer(items, bagId)
  if (from < 0 || to < 0 || from >= container.length || to >= container.length || from === to) {
    return items
  }

  const reordered = arrayMove(container, from, to)
  let cursor = 0
  return items.map((item) => (item.bagId === bagId ? reordered[cursor++]! : item))
}

/** What an item actually contributes to a bag: itself plus its accessories. */
export function itemTotalKg(item: Item): number {
  return item.weightKg + item.accessoriesKg
}

export function itemsInContainer(items: Item[], bagId: string | null): Item[] {
  return items.filter((item) => item.bagId === bagId)
}

export function bagTotals(bag: Bag, items: Item[]): BagTotals {
  let itemCount = 0
  let itemWeightKg = 0
  for (const item of items) {
    if (item.bagId !== bag.id) continue
    itemCount += 1
    itemWeightKg += itemTotalKg(item)
  }
  return {
    itemCount,
    itemWeightKg,
    accessoriesKg: bag.accessoriesKg,
    totalKg: bag.tareWeightKg + bag.accessoriesKg + itemWeightKg,
  }
}

export function totalPackedWeightKg(bags: Bag[], items: Item[]): number {
  return bags.reduce((sum, bag) => sum + bagTotals(bag, items).totalKg, 0)
}

export function isStateEmpty(state: BaggageState): boolean {
  return state.bags.length === 0 && state.items.length === 0
}

export function baggageReducer(state: BaggageState, action: BagAction): BaggageState {
  switch (action.type) {
    case 'bag/add':
      return { ...state, bags: [...state.bags, action.bag] }

    case 'bag/update':
      return {
        ...state,
        bags: state.bags.map((bag) => (bag.id === action.id ? { ...bag, ...action.patch } : bag)),
      }

    case 'bag/remove':
      // Its items fall back to the unassigned tray rather than disappearing.
      return {
        ...state,
        bags: state.bags.filter((bag) => bag.id !== action.id),
        items: state.items.map((item) =>
          item.bagId === action.id ? { ...item, bagId: null } : item,
        ),
      }

    case 'item/add':
      return { ...state, items: [...state.items, action.item] }

    case 'item/update':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id ? { ...item, ...action.patch } : item,
        ),
      }

    case 'item/remove':
      return { ...state, items: state.items.filter((item) => item.id !== action.id) }

    case 'item/move':
      return { ...state, items: withMovedItem(state.items, action.itemId, action.toBagId) }

    case 'item/reorder':
      return {
        ...state,
        items: reorderWithin(state.items, action.bagId, action.fromIndex, action.toIndex),
      }

    case 'unit/set':
      return state.unit === action.unit ? state : { ...state, unit: action.unit }

    case 'state/reset':
      return action.state
  }
}