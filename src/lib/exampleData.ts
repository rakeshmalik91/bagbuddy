import type { Bag, BaggageState, Item, ItemColumnCount } from '../types'
import { createId } from './id'

interface ItemSeed {
  name: string
  productName?: string
  weightKg: number
  accessoriesKg?: number
  accessoriesNote?: string
  bagId: string | null
}

function seedItem(seed: ItemSeed): Item {
  return {
    id: createId('item'),
    name: seed.name,
    productName: seed.productName ?? '',
    weightKg: seed.weightKg,
    accessoriesKg: seed.accessoriesKg ?? 0,
    accessoriesNote: seed.accessoriesNote ?? '',
    bagId: seed.bagId,
    weightSource: 'manual',
  }
}

function seedBag(
  name: string,
  productName: string,
  tareWeightKg: number,
  accessoriesKg: number,
  accessoriesNote: string,
  extrasEnabled: boolean,
  limitKg: number | null,
  itemColumns: ItemColumnCount,
  colorIndex: number,
): Bag {
  return {
    id: createId('bag'),
    name,
    productName,
    tareWeightKg,
    accessoriesKg,
    accessoriesNote,
    extrasEnabled,
    limitKg,
    itemColumns,
    colorIndex,
  }
}

/** Small demo payload offered from the empty state, so the app is explorable at a glance. */
export function createExampleState(): BaggageState {
  const cabin = seedBag('Cabin bag', 'Samsonite Tectonic 67', 3.4, 0.25, 'liquids bag, passport wallet', true, 8, 1, 0)
  const hold = seedBag('Hold suitcase', 'Delsey Helium 76', 5.2, 0.4, 'rain cover, TSA lock', true, 23, 1, 1)

  return {
    bags: [cabin, hold],
    items: [
      seedItem({
        name: 'Laptop',
        productName: 'MacBook Air 14" M3',
        weightKg: 1.51,
        accessoriesKg: 0.35,
        accessoriesNote: 'sleeve, 65 W charger',
        bagId: cabin.id,
      }),
      seedItem({ name: 'Headphones', weightKg: 0.25, bagId: cabin.id }),
      seedItem({ name: 'Passport', weightKg: 0.05, bagId: cabin.id }),
      seedItem({ name: 'T-shirt', weightKg: 0.2, bagId: hold.id }),
      seedItem({ name: 'Jeans', weightKg: 0.55, bagId: hold.id }),
      seedItem({ name: 'Shoes', productName: 'running shoes, size 43', weightKg: 0.9, bagId: hold.id }),
      seedItem({
        name: 'Toiletry bag',
        weightKg: 0.7,
        accessoriesKg: 0.1,
        accessoriesNote: 'travel bottles',
        bagId: hold.id,
      }),
      seedItem({ name: 'Travel adapter', weightKg: 0.12, bagId: null }),
      seedItem({ name: 'Paperback book', weightKg: 0.35, bagId: null }),
    ],
    unit: 'kg',
  }
}