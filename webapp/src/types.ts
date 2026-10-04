/**
 * Every weight in the app is stored in kilograms. The display unit is a view
 * concern only, converted on the way in and out via `lib/units`.
 */
export type WeightUnit = 'kg' | 'lb'

/** How many columns this bag's items are arranged in. */
export type ItemColumnCount = 1 | 2 | 3

/**
 * What an item is. A pouch is still an item, with its own weight, but other
 * items can be packed inside it, so it gains a contents list.
 */
export type ItemKind = 'item' | 'pouch'

export interface Bag {
  id: string
  /** Short display label, e.g. "Camera bag". Shown large. */
  name: string
  /**
   * Optional specific product, e.g. "Lowepro Pro 600 AW". Shown small, and used
   * as the query when inferring the empty weight of the bag itself.
   */
  productName: string
  /** Empty / tare weight of the bag itself. */
  tareWeightKg: number
  /** Extras that travel with the bag: rain cover, lock, luggage strap. */
  accessoriesKg: number
  /** Optional note describing those extras. */
  accessoriesNote: string
  /** Whether the extras row is shown. Turned on from the bag's options menu. */
  extrasEnabled: boolean
  /** Optional carried-airline limit; drives the capacity meter. */
  limitKg: number | null
  /** Layout preference for this bag's item list. */
  itemColumns: ItemColumnCount
  /** Index into `BAG_COLORS`. */
  colorIndex: number
  /** Whether the bag is parked below the line (not travelling on this trip). */
  parked?: boolean
}

export interface Item {
  id: string
  /** Short display label, e.g. "Toiletry bag". Shown large. */
  name: string
  /**
   * Optional specific product, e.g. "Sony WH-1000XM5". Shown small, and used as
   * the query when inferring a weight, where a generic label would be useless.
   */
  productName: string
  weightKg: number
  /** Extras that travel with the item: sleeve, strap, the charger in the box. */
  accessoriesKg: number
  /** Optional note describing those extras. */
  accessoriesNote: string
  kind: ItemKind
  /** `null` while the item sits unassigned in the tray. */
  bagId: string | null
  /** Set when the item is packed inside a pouch rather than loose in a bag. */
  pouchId: string | null
  /** Where the weight came from, e.g. `manual` or `openfoodfacts`. */
  weightSource: string
}

export interface ItemPlacement {
  itemId: string
  itemName?: string
  bagId: string | null
  bagName?: string | null
  pouchId: string | null
}

export interface LayoutSnapshot {
  id: string
  name: string
  createdAt: number
  placements: ItemPlacement[]
}

export interface BaggageState {
  bags: Bag[]
  items: Item[]
  unit: WeightUnit
  snapshots?: LayoutSnapshot[]
}

export interface BagTotals {
  itemCount: number
  itemWeightKg: number
  accessoriesKg: number
  totalKg: number
}