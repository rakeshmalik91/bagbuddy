export interface BagColor {
  name: string
  /** Solid dot used in overviews and legends. */
  dot: string
  /** Soft card header tint. */
  tint: string
  /** Ring colour while a dragged item hovers the bag. */
  ring: string
  /** Fill colour of the capacity meter. */
  bar: string
}

export const BAG_COLORS: BagColor[] = [
  {
    name: 'Indigo',
    dot: 'bg-indigo-500',
    tint: 'bg-indigo-500/10 dark:bg-indigo-400/15',
    ring: 'ring-indigo-500',
    bar: 'bg-indigo-500',
  },
  {
    name: 'Sky',
    dot: 'bg-sky-500',
    tint: 'bg-sky-500/10 dark:bg-sky-400/15',
    ring: 'ring-sky-500',
    bar: 'bg-sky-500',
  },
  {
    name: 'Emerald',
    dot: 'bg-emerald-500',
    tint: 'bg-emerald-500/10 dark:bg-emerald-400/15',
    ring: 'ring-emerald-500',
    bar: 'bg-emerald-500',
  },
  {
    name: 'Amber',
    dot: 'bg-amber-500',
    tint: 'bg-amber-500/10 dark:bg-amber-400/15',
    ring: 'ring-amber-500',
    bar: 'bg-amber-500',
  },
  {
    name: 'Rose',
    dot: 'bg-rose-500',
    tint: 'bg-rose-500/10 dark:bg-rose-400/15',
    ring: 'ring-rose-500',
    bar: 'bg-rose-500',
  },
  {
    name: 'Teal',
    dot: 'bg-teal-500',
    tint: 'bg-teal-500/10 dark:bg-teal-400/15',
    ring: 'ring-teal-500',
    bar: 'bg-teal-500',
  },
]

export function bagColor(index: number): BagColor {
  return BAG_COLORS[index % BAG_COLORS.length] ?? BAG_COLORS[0]!
}