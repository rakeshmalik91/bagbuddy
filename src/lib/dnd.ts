import type { Item } from '../types'

export const POOL_ID = 'container:pool'

/** Droppable id of a bag's item area, kept distinct from the item ids inside it. */
export function bagContainerId(bagId: string): string {
  return `container:bag:${bagId}`
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

export interface DragData {
  item: Item
  containerId: string
}

export type ContainerRef =
  | { kind: 'pool' }
  | { kind: 'bag'; bagId: string }
  | null

/**
 * Works out which container a drop target represents. Targets are either the
 * unassigned tray, a bag's droppable area, or an item sitting in one of them.
 */
export function resolveContainer(targetId: string | null, items: Item[]): ContainerRef {
  if (!targetId) return null
  if (targetId === POOL_ID) return { kind: 'pool' }

  if (targetId.startsWith('container:bag:')) {
    const bagId = targetId.slice('container:bag:'.length)
    return bagId ? { kind: 'bag', bagId } : null
  }

  const item = items.find((entry) => entry.id === toItemId(targetId))
  if (!item) return null
  return item.bagId === null ? { kind: 'pool' } : { kind: 'bag', bagId: item.bagId }
}

export function containerKey(container: ContainerRef): string | null {
  if (!container) return null
  return container.kind === 'pool' ? POOL_ID : bagContainerId(container.bagId)
}