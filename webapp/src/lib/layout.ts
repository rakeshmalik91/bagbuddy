/**
 * Card sizing for the bag grid, in complete literal class strings so Tailwind
 * can see every variant.
 *
 * More item columns means each item gets less width, so a bag needs to be wider
 * to stay readable. Explicit max-widths prevent 1-column bags (and empty bags/sleeves)
 * from ballooning across the screen when few bags share a row.
 */
export const SINGLE_BAG_LAYOUT = 'min-w-80 max-w-[380px] flex-[1_1_320px] basis-[320px]'
const TWO_COLUMNS = 'min-w-[520px] max-w-[740px] flex-[1_1_520px] basis-[520px]'
const THREE_COLUMNS = 'min-w-[720px] max-w-[1100px] flex-[1_1_720px] basis-[720px]'

export function bagCardLayout(columns: number): string {
  if (columns >= 3) return THREE_COLUMNS
  if (columns === 2) return TWO_COLUMNS
  return SINGLE_BAG_LAYOUT
}
