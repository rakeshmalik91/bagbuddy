import type { Bag, BaggageState, Item, ItemColumnCount } from '../types'

const STORAGE_KEY = 'bagbuddy:state:v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function readWeight(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

function readOptionalWeight(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function readColumns(value: unknown): ItemColumnCount {
  return value === 2 || value === 3 ? value : 1
}

function readId(value: unknown, prefix: string): string {
  return typeof value === 'string' && value.length > 0 ? value : `${prefix}_${crypto.randomUUID()}`
}

/**
 * Rebuilds a runnable state from an untrusted payload. Anything missing or
 * malformed falls back to a safe default so a stale or hand-edited payload can
 * never white-screen the app. Used for both `localStorage` and cloud payloads.
 */
export function normaliseBaggageState(value: unknown): BaggageState | null {
  if (!isRecord(value)) return null

  const bags: Bag[] = Array.isArray(value.bags)
    ? value.bags.flatMap((entry): Bag[] => {
        if (!isRecord(entry)) return []
      const colorIndex = entry.colorIndex
      const accessoriesKg = readWeight(entry.accessoriesKg)
      const accessoriesNote = readString(entry.accessoriesNote, '')
      return [
        {
          id: readId(entry.id, 'bag'),
          name: readString(entry.name, 'Bag'),
          productName: readString(entry.productName, ''),
          tareWeightKg: readWeight(entry.tareWeightKg),
          accessoriesKg,
          accessoriesNote,
          // Bags saved before this row became optional keep showing it when
          // they already have something in it.
          extrasEnabled:
            typeof entry.extrasEnabled === 'boolean'
              ? entry.extrasEnabled
              : accessoriesKg > 0 || accessoriesNote.length > 0,
          limitKg: readOptionalWeight(entry.limitKg),
          itemColumns: readColumns(entry.itemColumns),
          colorIndex:
            typeof colorIndex === 'number' && Number.isInteger(colorIndex) ? colorIndex : 0,
        },
      ]
      })
    : []

  const bagIds = new Set(bags.map((bag) => bag.id))

  const items: Item[] = Array.isArray(value.items)
    ? value.items.flatMap((entry): Item[] => {
        if (!isRecord(entry)) return []
        const bagId = typeof entry.bagId === 'string' && bagIds.has(entry.bagId) ? entry.bagId : null
        return [
          {
            id: readId(entry.id, 'item'),
            name: readString(entry.name, 'Item'),
            productName: readString(entry.productName, ''),
            weightKg: readWeight(entry.weightKg),
            accessoriesKg: readWeight(entry.accessoriesKg),
            accessoriesNote: readString(entry.accessoriesNote, ''),
            bagId,
            weightSource: readString(entry.weightSource, 'manual'),
          },
        ]
      })
    : []

  return { bags, items, unit: value.unit === 'lb' ? 'lb' : 'kg' }
}

export function loadState(): BaggageState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normaliseBaggageState(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveState(state: BaggageState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded or storage blocked (private mode). The session still works,
    // it just will not be remembered.
  }
}

export function clearStoredState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}