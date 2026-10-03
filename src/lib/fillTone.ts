/**
 * Background tint for an item, from how much of its bag's weight limit that one
 * item accounts for. A camera body sitting in a 7 kg cabin bag is the thing you
 * want to notice, and the tint makes the heavy hitters in a bag obvious without
 * adding another number. Anything past 30% of the limit is red: at that point a
 * single item is deciding whether the bag flies.
 *
 * Deliberately faint: it is a glanceable hint, not a status light, and the text
 * still has to read comfortably on top of it.
 *
 * Every class string is written out in full so Tailwind can generate them.
 */
export function fillTone(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return 'bg-white dark:bg-slate-900'
  if (share < 0.08) return 'bg-emerald-50/50 dark:bg-emerald-500/[0.04]'
  if (share < 0.15) return 'bg-emerald-50 dark:bg-emerald-500/[0.07]'
  if (share < 0.22) return 'bg-lime-50 dark:bg-lime-500/[0.07]'
  if (share < 0.3) return 'bg-amber-50 dark:bg-amber-500/[0.09]'
  if (share < 0.6) return 'bg-rose-50 dark:bg-rose-500/[0.12]'
  return 'bg-rose-100 dark:bg-rose-500/[0.2]'
}
