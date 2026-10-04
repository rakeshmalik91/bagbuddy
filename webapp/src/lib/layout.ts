/**
 * Card sizing for the bag grid, in complete literal class strings so Tailwind
 * can see every variant.
 *
 * More item columns means each item gets less width, so a bag needs to be wider
 * to stay readable. One bag per row is a better trade than five items squeezed
 * into 110px.
 */
const ONE_COLUMN = 'min-w-80 max-w-[640px] flex-[1_1_300px] basis-[300px]'
const TWO_COLUMNS = 'min-w-[520px] max-w-[900px] flex-[1_1_520px] basis-[520px]'
const THREE_COLUMNS = 'min-w-[720px] max-w-none flex-[1_1_720px] basis-[720px]'

export function bagCardLayout(columns: number): string {
  if (columns >= 3) return THREE_COLUMNS
  if (columns === 2) return TWO_COLUMNS
  return ONE_COLUMN
}
