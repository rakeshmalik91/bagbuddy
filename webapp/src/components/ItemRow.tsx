import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toDragId } from '../lib/dnd'
import { formatWeight } from '../lib/units'
import type { Item, ItemKind, WeightUnit } from '../types'
import { AutoText } from './AutoText'
import { PlusIcon } from './PlusIcon'
import { WeightInput } from './WeightInput'

interface ItemRowProps {
  item: Item
  containerId: string
  unit: WeightUnit
  /** Stacked layout for narrow columns, where a side-by-side row does not fit. */
  compact: boolean
  /** Background tint from how full the bag is. */
  tone: string
  /** Inside a bag the delete control takes the item out rather than removing it. */
  inBag: boolean
  /** How many items this pouch carries, and what they come to. */
  contentsCount: number
  contentsKg: number
  /** True while a dragged item is hovering this pouch, waiting to be dropped in. */
  isDropTarget: boolean
  /** The contents list, rendered inside the pouch row. */
  children?: ReactNode
  otherItemNames?: string[]
  onRename(name: string): void
  onProductName(productName: string): void
  onWeight(weightKg: number): void
  onAccessoriesWeight(accessoriesKg: number): void
  onAccessoriesNote(accessoriesNote: string): void
  onConvertKind(kind: ItemKind): void
  onRemove(): void
  onLookup(): void
}

/**
 * One item.
 *
 * The whole row is the drag handle, with the fields and buttons inside it kept
 * out of the way of that: a button click stays a click, and a field only drags
 * when it is not already holding a text selection.
 *
 * Collapsed it is just the name and the weight, which is what you read while
 * packing, plus the accessories row when there is something in it. Selecting it
 * opens the rest: the lookup and delete buttons, the product name and the
 * accessories fields.
 *
 * A pouch carries a one line summary of what is inside it, and its contents
 * nested underneath, because that is how it is counted: the pouch's own weight
 * plus everything in it.
 */
export function ItemRow({
  item,
  containerId,
  unit,
  compact,
  tone,
  inBag,
  contentsCount,
  contentsKg,
  isDropTarget,
  children,
  otherItemNames = [],
  onRename,
  onProductName,
  onWeight,
  onAccessoriesWeight,
  onAccessoriesNote,
  onConvertKind,
  onRemove,
  onLookup,
}: ItemRowProps) {
  const [selected, setSelected] = useState(false)
  const cardRef = useRef<HTMLLIElement>(null)

  const trimmedItemName = item.name.trim()
  const isDuplicate = Boolean(
    trimmedItemName &&
      otherItemNames.some(
        (other) => other.trim().toLowerCase() === trimmedItemName.toLowerCase(),
      ),
  )

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: toDragId(item.id),
    data: { item, containerId },
    // The row keeps its place in the list for screen readers; dnd-kit only needs
    // a focusable node to lift it from the keyboard.
    attributes: { role: 'listitem' },
  })

  useEffect(() => {
    if (!selected) return
    const onPointerDown = (event: PointerEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) setSelected(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [selected])

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  }

  const estimated = item.weightSource !== 'manual'
  const hasAccessories = item.accessoriesKg > 0 || item.accessoriesNote.trim().length > 0
  const isPouch = item.kind === 'pouch'
  // The rows under the title stop short of the weight field, so the product
  // name cannot read as if it belongs to the weight column.
  const gutter = compact ? 'pr-[72px]' : 'pr-[88px]'

  function selectFrom(event: React.MouseEvent) {
    // Typing in a field should not re-open the card that is already open.
    if ((event.target as HTMLElement).closest('input, button')) return
    setSelected(true)
  }

  const startMouseDrag = listeners?.onMouseDown
  const startTouchDrag = listeners?.onTouchStart
  const startKeyboardDrag = listeners?.onKeyDown

  function dragFrom(event: React.MouseEvent<HTMLLIElement> | React.TouchEvent<HTMLLIElement>) {
    // Buttons and number fields own their own pointer behaviour, and a field
    // that already holds a selection is being selected, not dragged.
    if (isControlTarget(event.target) || holdsTextSelection(event.target)) return
    const start = event.type === 'touchstart' ? startTouchDrag : startMouseDrag
    start?.(event)
  }

  function dragFromKeyboard(event: React.KeyboardEvent<HTMLLIElement>) {
    // Keys belong to the field or button they were pressed in; only the row
    // itself lifts, so typing a space in a field still types a space.
    if (event.target !== event.currentTarget) return
    startKeyboardDrag?.(event)
  }

  // One control on the left of the row, in the same spot either way: taking the
  // item out of its bag, or deleting it once it is selected.
  const sideAction = inBag ? (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Take ${item.name || 'item'} out of this bag`}
      title="Take out of this bag"
      className="shrink-0 self-center rounded-md p-1.5 text-slate-400 transition hover:bg-white/70 hover:text-slate-700 dark:hover:bg-slate-700/70 dark:hover:text-slate-200"
    >
      <UnassignIcon />
    </button>
  ) : (
    selected && (
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.name || 'item'}`}
        title="Remove item"
        className="shrink-0 self-center rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
      >
        <TrashIcon />
      </button>
    )
  )

  return (
    <li
      ref={(node) => {
        cardRef.current = node
        setNodeRef(node)
      }}
      style={style}
      {...attributes}
      onClick={selectFrom}
      onFocus={() => setSelected(true)}
      onMouseDown={dragFrom}
      onTouchStart={dragFrom}
      onKeyDown={dragFromKeyboard}
      className={`flex cursor-grab touch-manipulation gap-2 rounded-xl border px-2 py-1.5 shadow-xs transition-colors active:cursor-grabbing ${tone} ${
        isDropTarget
          ? 'border-indigo-400 ring-2 ring-indigo-500/40 dark:border-indigo-400'
          : selected
            ? 'border-indigo-300 ring-2 ring-indigo-500/20 dark:border-indigo-500/60'
            : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
      } ${isDragging ? 'opacity-40 select-none' : ''}`}
    >
      {sideAction}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <AutoText
            value={item.name}
            onChange={onRename}
            ariaLabel={`Name of item ${item.name || ''}`}
            placeholder="Item name"
            className={`min-w-0 flex-1 rounded-md px-1 font-semibold leading-tight outline-none transition ${
              isDuplicate
                ? 'border border-rose-400 bg-rose-50/50 text-rose-700 ring-2 ring-rose-500/20 dark:border-rose-500 dark:bg-rose-950/30 dark:text-rose-300'
                : 'bg-transparent text-slate-800 focus:bg-slate-100 dark:text-slate-50 dark:focus:bg-slate-800'
            } ${compact ? 'text-sm' : 'text-base'}`}
          />

          <WeightInput
            valueKg={item.weightKg}
            unit={unit}
            onChange={onWeight}
            label={`${isPouch ? 'Empty weight' : 'Weight'} of ${item.name || 'item'}`}
            className={compact ? 'w-16 shrink-0' : 'w-20 shrink-0'}
          />

          {/* Any item can be a pouch, so an existing one can become one here. */}
          {selected && (
            <button
              type="button"
              onClick={() => onConvertKind(isPouch ? 'item' : 'pouch')}
              aria-pressed={isPouch}
              aria-label={`${isPouch ? 'Stop treating' : 'Treat'} ${item.name || 'item'} as a pouch`}
              title="Pouch: other items can be packed inside this one"
              className={`shrink-0 rounded-md p-1.5 transition ${
                isPouch
                  ? 'text-indigo-500 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10'
                  : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500 dark:text-slate-600 dark:hover:bg-slate-800'
              }`}
            >
              <PouchIcon />
            </button>
          )}
        </div>

        {isDuplicate && (
          <p className="mt-0.5 text-xs font-medium text-rose-500 dark:text-rose-400">
            An item named &ldquo;{trimmedItemName}&rdquo; already exists
          </p>
        )}

        {isPouch && (
          <p className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="text-slate-300 dark:text-slate-600">
              <PouchIcon />
            </span>
            {contentsCount === 0 ? (
              <span className="italic text-slate-400">empty, drag items in</span>
            ) : (
              <span className="tabular-nums">
                {contentsCount} item{contentsCount === 1 ? '' : 's'} ·{' '}
                {formatWeight(contentsKg, unit)} {unit}
              </span>
            )}
          </p>
        )}

        {/* Blank rows stay out of the way; the placeholder only appears once the
            card is open, so a packed bag reads as name, weight and nothing else.
            Edit mode gives this row more height and puts the lookup beside it. */}
        {(selected || item.productName.trim().length > 0) && (
          <div className={`flex items-center gap-1.5 ${gutter}`}>
            {selected && (
              <button
                type="button"
                onClick={onLookup}
                aria-label={`Look up the weight of ${item.name || 'item'}`}
                title="Look up weight"
                className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
              >
                <SearchIcon />
              </button>
            )}
            <AutoText
              value={item.productName}
              onChange={onProductName}
              ariaLabel={`Product name of ${item.name || 'item'}`}
              placeholder={selected ? 'Product, used to look up a weight' : 'product'}
              className={`min-w-0 flex-1 rounded-md bg-transparent px-1 text-slate-500 outline-none transition placeholder:text-slate-300 focus:bg-white/60 dark:text-slate-400 dark:placeholder:text-slate-600 dark:focus:bg-slate-800/60 ${
                selected ? 'py-1 text-xs' : 'py-0 text-[11px] leading-tight opacity-80'
              }`}
            />
          </div>
        )}

        {(selected || hasAccessories) && (
          <div className="flex items-center gap-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-0.5">
              <PlusIconMarker />
              <AutoText
                value={item.accessoriesNote}
                onChange={onAccessoriesNote}
                ariaLabel={`Accessories note of ${item.name || 'item'}`}
                placeholder={hasAccessories ? 'sleeve, strap…' : 'extras'}
                className="min-w-0 flex-1 rounded-md bg-transparent px-1 text-[11px] leading-tight text-slate-500 outline-none transition placeholder:text-slate-300 focus:bg-slate-100 dark:text-slate-400 dark:placeholder:text-slate-600 dark:focus:bg-slate-800"
              />
            </div>
            <WeightInput
              valueKg={item.accessoriesKg}
              unit={unit}
              onChange={onAccessoriesWeight}
              label={`Accessories weight of ${item.name || 'item'}`}
              className={compact ? 'w-16 shrink-0' : 'w-20 shrink-0'}
            />
            {estimated && (
              <span
                title={`Weight set by ${item.weightSource}`}
                className="w-14 shrink-0 text-right text-[10px] text-slate-400"
              >
                via {item.weightSource}
              </span>
            )}
          </div>
        )}

        {children}
      </div>
    </li>
  )
}

function isControlTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('button, input, select') !== null
}

function holdsTextSelection(target: EventTarget | null): boolean {
  return target instanceof HTMLTextAreaElement && target.selectionStart !== target.selectionEnd
}

function PouchIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="none" stroke="currentColor">
      <path
        d="M6.5 6V4.8A1.8 1.8 0 0 1 8.3 3h3.4a1.8 1.8 0 0 1 1.8 1.8V6"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M4.5 6h11l.7 9.2a1.6 1.6 0 0 1-1.6 1.8H5.4a1.6 1.6 0 0 1-1.6-1.8L4.5 6Z"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor">
      <circle cx="9" cy="9" r="5.5" strokeWidth="1.7" />
      <path d="m13.5 13.5 3 3" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor">
      <path
        d="M4.5 6h11M8 6V4.5h4V6m-6 0 .7 9.2A1.5 1.5 0 0 0 8.2 16.5h3.6a1.5 1.5 0 0 0 1.5-1.3L14 6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlusIconMarker() {
  return (
    <span
      aria-hidden="true"
      title="Extras: things that travel with this item"
      className="flex shrink-0 items-center text-slate-300 dark:text-slate-600"
    >
      <PlusIcon />
    </span>
  )
}

function UnassignIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor">
      <path
        d="M8 4.5H5.5A1.5 1.5 0 0 0 4 6v8a1.5 1.5 0 0 0 1.5 1.5H8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M11 7.5 14 10l-3 2.5M14 10H8.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DragPreview({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none rounded-xl border border-indigo-400 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-lg dark:border-indigo-500 dark:bg-slate-800 dark:text-slate-50">
      {children}
    </div>
  )
}