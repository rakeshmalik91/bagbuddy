import { closestCenter, pointerWithin } from '@dnd-kit/core'
import type { CollisionDetection, DroppableContainer } from '@dnd-kit/core'
import type { Bag, Item } from '../types'

export const POOL_ID = 'container:pool'
export const ACTIVE_BAGS_ZONE = 'zone:active-bags'
export const PARKED_BAGS_ZONE = 'zone:parked-bags'
export const PARKING_LINE_ZONE = 'zone:parking-line'

/** Droppable id of a bag's item area, kept distinct from the item ids inside it. */
export function bagContainerId(bagId: string): string {
  return `container:bag:${bagId}`
}

/** Drop target of a pouch, used to highlight it while an item hovers over it. */
export function pouchContainerId(pouchId: string): string {
  return `container:pouch:${pouchId}`
}

export function isItemDragId(id: string): boolean {
  return id.startsWith('item:')
}

export function toItemId(dragId: string): string {
  return dragId.slice('item:'.length)
}

export function toDragId(itemId: string): string {
  return `item:${itemId}`
}

/** Drag ids for a whole container, in display order. */
export function toDragIds(items: Item[]): string[] {
  return items.map((item) => toDragId(item.id))
}

export function isBagDragId(id: string): boolean {
  return id.startsWith('bag:')
}

export function toBagId(dragId: string): string {
  return dragId.slice('bag:'.length)
}

export function toBagDragId(bagId: string): string {
  return `bag:${bagId}`
}

export function toBagDragIds(bags: Bag[]): string[] {
  return bags.map((bag) => toBagDragId(bag.id))
}

export const ADD_BAG_ZONE = 'zone:add-bag'

export function isBagDropTarget(id: string): boolean {
  return (
    isBagDragId(id) ||
    id === ACTIVE_BAGS_ZONE ||
    id === PARKED_BAGS_ZONE ||
    id === PARKING_LINE_ZONE ||
    id === ADD_BAG_ZONE
  )
}

export interface DragData {
  item: Item
  containerId: string
}

/** Anywhere an item can come to rest: the tray, a bag, or the inside of a pouch. */
export type ContainerRef =
  | { kind: 'pool' }
  | { kind: 'bag'; bagId: string }
  | { kind: 'pouch'; pouchId: string }

/** Where an item lives right now, which is its pouch when it is inside one. */
export function containerOf(item: Item): ContainerRef {
  if (item.pouchId !== null) return { kind: 'pouch', pouchId: item.pouchId }
  return item.bagId === null ? { kind: 'pool' } : { kind: 'bag', bagId: item.bagId }
}

export function sameContainer(a: ContainerRef, b: ContainerRef): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'pool') return true
  if (a.kind === 'bag' && b.kind === 'bag') return a.bagId === b.bagId
  if (a.kind === 'pouch' && b.kind === 'pouch') return a.pouchId === b.pouchId
  return false
}

/**
 * Works out which container a drop target represents. Targets are the unassigned
 * tray, a bag's droppable area, or an item: a pouch row means its inside, and any
 * other item means wherever that item already is.
 */
export function resolveContainer(targetId: string | null, items: Item[]): ContainerRef | null {
  if (!targetId) return null
  if (targetId === POOL_ID) return { kind: 'pool' }

  if (targetId.startsWith('container:bag:')) {
    const bagId = targetId.slice('container:bag:'.length)
    return bagId ? { kind: 'bag', bagId } : null
  }

  if (targetId.startsWith('container:pouch:')) {
    const pouchId = targetId.slice('container:pouch:'.length)
    return pouchId ? { kind: 'pouch', pouchId } : null
  }

  const item = items.find((entry) => entry.id === toItemId(targetId))
  if (!item) return null
  if (item.kind === 'pouch') return { kind: 'pouch', pouchId: item.id }
  return containerOf(item)
}

export function containerKey(container: ContainerRef | null): string | null {
  if (!container) return null
  if (container.kind === 'pool') return POOL_ID
  if (container.kind === 'bag') return bagContainerId(container.bagId)
  return pouchContainerId(container.pouchId)
}

/** The item a droppable row belongs to, as the row registered it. */
function itemOf(containers: DroppableContainer[], id: string): Item | null {
  if (!isItemDragId(id)) return null
  const row = containers.find((container) => String(container.id) === id)
  const data = row?.data.current as { item?: Item } | undefined
  return data?.item ?? null
}

/**
 * What sits under the pointer wins, rather than whatever target happens to have
 * its centre closest, because a pouch shares space with the bag around it and a
 * tall bag's centre can be a long way from where the item actually is.
 *
 * Ranking keeps the drop predictable: a pouch row packs the item inside it, any
 * other row reorders against it, and the bag or tray around them takes it loose.
 * Keyboard drags have no pointer, so they fall back to the closest centre.
 */
export const dropTargetCollision: CollisionDetection = (args) => {
  const activeId = String(args.active.id)

  if (isBagDragId(activeId)) {
    const within = pointerWithin(args).filter((collision) =>
      isBagDropTarget(String(collision.id)),
    )
    const addBag = within.find((c) => String(c.id) === ADD_BAG_ZONE)
    if (addBag) return [addBag]

    const bagCard = within.find((c) => isBagDragId(String(c.id)))
    if (bagCard) return [bagCard]

    const line = within.find((c) => String(c.id) === PARKING_LINE_ZONE)
    if (line) return [line]

    if (within.length > 0) return [within[0]!]

    const bagContainers = args.droppableContainers.filter((container) =>
      isBagDropTarget(String(container.id)),
    )
    return closestCenter({ ...args, droppableContainers: bagContainers })
  }

  const filteredContainers = args.droppableContainers.filter(
    (container) =>
      !isBagDropTarget(String(container.id)) || String(container.id).startsWith('container:bag:'),
  )
  const itemArgs = { ...args, droppableContainers: filteredContainers }

  const within = pointerWithin(itemArgs)

  const pouch = within.find(
    (collision) => itemOf(itemArgs.droppableContainers, String(collision.id))?.kind === 'pouch',
  )
  if (pouch) return [pouch]

  const row = within.find((collision) => isItemDragId(String(collision.id)))
  if (row) return [row]

  return within.length > 0 ? [within[0]!] : closestCenter(itemArgs)
}