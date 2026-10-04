import { useDroppable } from '@dnd-kit/core'
import { PARKING_LINE_ZONE } from '../lib/dnd'

interface ParkingLineProps {
  /** How many bags currently sit below this line. */
  parkedCount: number
  /** True when a dragged bag is hovering over or active in the parking zone. */
  isOver?: boolean
}

/**
 * A dividing line on the board separating active bags (above) from parked bags (below).
 * Bags placed below this line are preserved with their contents but excluded from trip
 * weight limits and packed totals.
 */
export function ParkingLine({ parkedCount, isOver: propIsOver }: ParkingLineProps) {
  const { setNodeRef, isOver: droppableIsOver } = useDroppable({
    id: PARKING_LINE_ZONE,
    data: { type: 'parking-line' },
  })

  const isOver = propIsOver || droppableIsOver

  return (
    <div
      ref={setNodeRef}
      className={`relative my-4 flex items-center justify-center transition-all ${
        isOver ? 'scale-[1.01]' : ''
      }`}
    >
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div
          className={`w-full border-t-2 transition-colors ${
            isOver
              ? 'border-indigo-500 dark:border-indigo-400'
              : 'border-dashed border-slate-300 dark:border-slate-700'
          }`}
        />
      </div>

      <div
        className={`relative flex flex-wrap items-center justify-center gap-2 rounded-full border px-4 py-1.5 text-xs transition-all shadow-xs ${
          isOver
            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-4 ring-indigo-500/20 dark:border-indigo-400 dark:bg-slate-900 dark:text-indigo-300'
            : 'border-slate-200 bg-slate-100/90 text-slate-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300'
        }`}
      >
        <span
          className={`flex size-4.5 items-center justify-center rounded-full text-[10px] font-bold text-white transition-colors ${
            isOver ? 'bg-indigo-600' : 'bg-slate-500 dark:bg-slate-600'
          }`}
          aria-hidden="true"
        >
          P
        </span>
        <span className="font-semibold tracking-wide uppercase">
          {isOver ? 'Drop here to park bag' : 'Parking Line'}
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          — bags below this line are parked {parkedCount > 0 ? `(${parkedCount})` : ''}
        </span>
      </div>
    </div>
  )
}
