import { arrayMove } from '@dnd-kit/sortable'
import type { ContainerRef } from '../lib/dnd'
import { createId } from '../lib/id'
import type { Bag, BagTotals, BaggageState, Item, LayoutSnapshot, WeightUnit } from '../types'

export type BagAction =
  | { type: 'bag/add'; bag: Bag }
  | { type: 'bag/update'; id: string; patch: Partial<Omit<Bag, 'id'>> }
  | { type: 'bag/remove'; id: string }
  | {
      type: 'bag/reorder'
      fromId: string
      toId: string | null
      targetParked?: boolean
      position?: 'before' | 'after'
    }
  | { type: 'item/add'; item: Item }
  | { type: 'item/update'; id: string; patch: Partial<Omit<Item, 'id'>> }
  | { type: 'item/remove'; id: string }
  | { type: 'item/move'; itemId: string; to: ContainerRef }
  | { type: 'item/reorder'; container: ContainerRef; fromIndex: number; toIndex: number }
  | { type: 'snapshot/add'; name: string }
  | { type: 'snapshot/apply'; id: string }
  | { type: 'snapshot/remove'; id: string }
  | { type: 'snapshot/rename'; id: string; name: string }
  | { type: 'unit/set'; unit: WeightUnit }
  | { type: 'state/reset'; state: BaggageState }

/** True when the item sits in that container, contents of a pouch included. */
function inContainer(item: Item, container: ContainerRef): boolean {
  if (container.kind === 'pool') return item.bagId === null && item.pouchId === null
  if (container.kind === 'bag') return item.bagId === container.bagId && item.pouchId === null
  return item.pouchId === container.pouchId
}

/**
 * Moves an item to `to` and appends it to the end of that container so the flat
 * item array stays the single source of ordering truth. A pouch takes its
 * contents with it, and an item dropped into a pouch lands wherever the pouch
 * is.
 */
function withMovedItem(items: Item[], itemId: string, to: ContainerRef): Item[] {
  const moved = items.find((item) => item.id === itemId)
  if (!moved) return items

  const pouch = to.kind === 'pouch' ? items.find((item) => item.id === to.pouchId) : undefined
  if (to.kind === 'pouch' && (!pouch || pouch.kind !== 'pouch')) return items
  // Pouches are one level deep, so what goes inside one is a plain item, and
  // never the pouch itself.
  if (pouch && (pouch.id === moved.id || moved.kind === 'pouch')) return items

  const pouchId = pouch ? pouch.id : null
  const bagId = to.kind === 'bag' ? to.bagId : pouch
    ? pouch.bagId
    : null
  if (moved.bagId === bagId && moved.pouchId === pouchId) return items

  const rest = items
    .filter((item) => item.id !== itemId)
    // A pouch carries its contents, so they follow it to the new container.
    .map((item) => (item.pouchId === itemId ? { ...item, bagId } : item))

  let insertAt = -1
  for (let index = 0; index < rest.length; index += 1) {
    if (inContainer(rest[index]!, to)) insertAt = index
  }
  rest.splice(insertAt + 1, 0, { ...moved, bagId, pouchId })
  return rest
}

/** Reorders inside one container, leaving every other item's slot untouched. */
function reorderWithin(items: Item[], container: ContainerRef, from: number, to: number): Item[] {
  const siblings = items.filter((item) => inContainer(item, container))
  if (from < 0 || to < 0 || from >= siblings.length || to >= siblings.length || from === to) {
    return items
  }

  const reordered = arrayMove(siblings, from, to)
  let cursor = 0
  return items.map((item) => (inContainer(item, container) ? reordered[cursor++]! : item))
}

/** What an item actually contributes to a bag: itself plus its accessories. */
export function itemTotalKg(item: Item): number {
  return item.weightKg + item.accessoriesKg
}

/** The items listed directly in a bag or the tray, ignoring pouch contents. */
export function itemsInContainer(items: Item[], bagId: string | null): Item[] {
  return items.filter((item) => item.bagId === bagId && item.pouchId === null)
}

/** The items packed inside one pouch, in display order. */
export function pouchContents(items: Item[], pouchId: string): Item[] {
  return items.filter((item) => item.pouchId === pouchId)
}

export interface PouchTotals {
  itemCount: number
  /** What the contents come to. The pouch's own weight is separate. */
  totalKg: number
}

export function pouchTotals(items: Item[], pouchId: string): PouchTotals {
  let itemCount = 0
  let totalKg = 0
  for (const item of items) {
    if (item.pouchId !== pouchId) continue
    itemCount += 1
    totalKg += itemTotalKg(item)
  }
  return { itemCount, totalKg }
}

export function bagTotals(bag: Bag, items: Item[]): BagTotals {
  let itemCount = 0
  let itemWeightKg = 0
  for (const item of items) {
    if (item.bagId !== bag.id) continue
    // Everything in the bag weighs into the total, contents included, but the
    // count is what the list shows, and contents live inside their pouch row.
    if (item.pouchId === null) itemCount += 1
    itemWeightKg += itemTotalKg(item)
  }
  return {
    itemCount,
    itemWeightKg,
    accessoriesKg: bag.accessoriesKg,
    totalKg: bag.tareWeightKg + bag.accessoriesKg + itemWeightKg,
  }
}

/**
 * Reorders bags, within active or parked bags, or across the parking line.
 * Keeps active bags first and parked bags second in state, preserving order within each.
 */
export function reorderBags(
  bags: Bag[],
  fromId: string,
  toId: string | null,
  targetParked?: boolean,
  position: 'before' | 'after' = 'before',
): Bag[] {
  const fromBag = bags.find((bag) => bag.id === fromId)
  if (!fromBag) return bags

  const toBag = toId ? bags.find((bag) => bag.id === toId) : null
  const nextParked =
    targetParked !== undefined
      ? targetParked
      : toBag
        ? Boolean(toBag.parked)
        : Boolean(fromBag.parked)

  const activeBags = bags.filter((bag) => !bag.parked)
  const parkedBags = bags.filter((bag) => Boolean(bag.parked))

  // Case 1: Reordering within the same section
  if (Boolean(fromBag.parked) === nextParked) {
    if (toId === fromId) return bags
    const sectionBags = nextParked ? parkedBags : activeBags
    const fromIndex = sectionBags.findIndex((bag) => bag.id === fromId)
    if (fromIndex === -1) return bags

    let toIndex: number
    if (!toId) {
      toIndex = sectionBags.length - 1
    } else {
      const baseIndex = sectionBags.findIndex((bag) => bag.id === toId)
      if (baseIndex === -1) return bags
      if (position === 'after') {
        toIndex = fromIndex < baseIndex ? baseIndex : baseIndex + 1
      } else {
        toIndex = fromIndex > baseIndex ? baseIndex : baseIndex - 1
      }
      toIndex = Math.max(0, Math.min(toIndex, sectionBags.length - 1))
    }

    if (fromIndex === toIndex) return bags
    const reordered = arrayMove(sectionBags, fromIndex, toIndex)
    return nextParked ? [...activeBags, ...reordered] : [...reordered, ...parkedBags]
  }

  // Case 2: Crossing between active and parked
  const updatedFromBag: Bag = { ...fromBag, parked: nextParked }

  if (nextParked) {
    // Moving from active to parked
    const remainingActive = activeBags.filter((bag) => bag.id !== fromId)
    const baseIndex = toId ? parkedBags.findIndex((bag) => bag.id === toId) : -1
    const insertIndex =
      baseIndex === -1
        ? parkedBags.length
        : position === 'after'
          ? baseIndex + 1
          : baseIndex

    const newParked = [
      ...parkedBags.slice(0, insertIndex),
      updatedFromBag,
      ...parkedBags.slice(insertIndex),
    ]
    return [...remainingActive, ...newParked]
  } else {
    // Moving from parked to active
    const remainingParked = parkedBags.filter((bag) => bag.id !== fromId)
    const baseIndex = toId ? activeBags.findIndex((bag) => bag.id === toId) : -1
    const insertIndex =
      baseIndex === -1
        ? activeBags.length
        : position === 'after'
          ? baseIndex + 1
          : baseIndex

    const newActive = [
      ...activeBags.slice(0, insertIndex),
      updatedFromBag,
      ...activeBags.slice(insertIndex),
    ]
    return [...newActive, ...remainingParked]
  }
}

export function totalPackedWeightKg(bags: Bag[], items: Item[]): number {
  return bags
    .filter((bag) => !bag.parked)
    .reduce((sum, bag) => sum + bagTotals(bag, items).totalKg, 0)
}

export function totalParkedWeightKg(bags: Bag[], items: Item[]): number {
  return bags
    .filter((bag) => Boolean(bag.parked))
    .reduce((sum, bag) => sum + bagTotals(bag, items).totalKg, 0)
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

    case 'bag/reorder':
      return {
        ...state,
        bags: reorderBags(
          state.bags,
          action.fromId,
          action.toId,
          action.targetParked,
          action.position,
        ),
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
      return {
        ...state,
        items: state.items
          .filter((item) => item.id !== action.id)
          // Anything packed inside a removed pouch moves out to wherever the
          // pouch was, rather than disappearing with it.
          .map((item) => (item.pouchId === action.id ? { ...item, pouchId: null } : item)),
      }

    case 'item/move':
      return { ...state, items: withMovedItem(state.items, action.itemId, action.to) }

    case 'item/reorder':
      return {
        ...state,
        items: reorderWithin(state.items, action.container, action.fromIndex, action.toIndex),
      }

    case 'unit/set':
      return state.unit === action.unit ? state : { ...state, unit: action.unit }

    case 'snapshot/add': {
      const name = action.name.trim() || `Snapshot ${(state.snapshots?.length ?? 0) + 1}`
      const newSnapshot: LayoutSnapshot = {
        id: createId('snap'),
        name,
        createdAt: Date.now(),
        placements: state.items.map((item) => {
          const bag = item.bagId ? state.bags.find((b) => b.id === item.bagId) : null
          return {
            itemId: item.id,
            itemName: item.name,
            bagId: item.bagId,
            bagName: bag ? bag.name : null,
            pouchId: item.pouchId,
          }
        }),
      }
      return {
        ...state,
        snapshots: [...(state.snapshots ?? []), newSnapshot],
      }
    }

    case 'snapshot/apply': {
      const target = state.snapshots?.find((s) => s.id === action.id)
      if (!target) return state
      return {
        ...state,
        items: applySnapshotPlacements(state, target),
      }
    }

    case 'snapshot/remove': {
      return {
        ...state,
        snapshots: (state.snapshots ?? []).filter((s) => s.id !== action.id),
      }
    }

    case 'snapshot/rename': {
      const name = action.name.trim()
      if (!name) return state
      return {
        ...state,
        snapshots: (state.snapshots ?? []).map((s) =>
          s.id === action.id ? { ...s, name } : s
        ),
      }
    }

    case 'state/reset':
      return action.state
  }
}

/**
 * Restores item assignments to bags and pouches from a snapshot.
 * Preserves the rule: presets only store which items were in which bag;
 * any item or bag that doesn't exist anymore is ignored (items fall back to pool).
 */
export function applySnapshotPlacements(
  state: BaggageState,
  snapshot: LayoutSnapshot,
): Item[] {
  const existingBagIds = new Set(state.bags.map((b) => b.id))
  const bagByName = new Map(state.bags.map((b) => [b.name.trim().toLowerCase(), b.id]))
  const existingPouchIds = new Set(
    state.items.filter((i) => i.kind === 'pouch').map((i) => i.id)
  )

  return state.items.map((item) => {
    // Match placement by ID, or fallback by item name
    const placement =
      snapshot.placements.find((p) => p.itemId === item.id) ??
      snapshot.placements.find(
        (p) => p.itemName && p.itemName.trim().toLowerCase() === item.name.trim().toLowerCase()
      )

    // 1. If this item was not in the snapshot, keep it exactly where it currently is on the board
    if (!placement) {
      return item
    }

    // 2. If the snapshot had the item assigned to a bag:
    if (placement.bagId !== null || placement.bagName) {
      let targetBagId: string | null = null
      if (placement.bagId && existingBagIds.has(placement.bagId)) {
        targetBagId = placement.bagId
      } else if (placement.bagName && bagByName.has(placement.bagName.trim().toLowerCase())) {
        targetBagId = bagByName.get(placement.bagName.trim().toLowerCase())!
      }

      // If the target bag does not exist on board anymore, ignore and keep item in its current position
      if (!targetBagId) {
        return item
      }

      // 3. If the snapshot had the item inside a pouch:
      let targetPouchId: string | null = null
      if (placement.pouchId && existingPouchIds.has(placement.pouchId)) {
        targetPouchId = placement.pouchId
        // The item travels with that pouch's bag
        const pouch = state.items.find((i) => i.id === targetPouchId)
        if (pouch?.bagId) {
          targetBagId = pouch.bagId
        }
      }

      return {
        ...item,
        bagId: targetBagId,
        pouchId: targetPouchId,
      }
    }

    // 4. Snapshot explicitly had the item unassigned in the pool
    return {
      ...item,
      bagId: null,
      pouchId: null,
    }
  })
}