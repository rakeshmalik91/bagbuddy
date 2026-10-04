import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { BagCard } from './components/BagCard'
import { BagForm } from './components/BagForm'
import type { NewBagInput } from './components/BagForm'
import { ParkingLine } from './components/ParkingLine'
import { AccountMenu } from './components/AccountMenu'
import { HistoryControls } from './components/HistoryControls'
import { ThemeSwitch } from './components/ThemeSwitch'
import { DragPreview } from './components/ItemRow'
import { ItemPool } from './components/ItemPool'
import type { NewItemInput } from './components/ItemForm'
import { SnapshotControls } from './components/SnapshotControls'
import { SyncChoiceDialog } from './components/SyncChoiceDialog'
import { WeightLookupDialog } from './components/WeightLookupDialog'
import { BAG_COLORS, bagColor } from './lib/bagColors'
import { clearStoredState } from './lib/storage'
import {
  ACTIVE_BAGS_ZONE,
  ADD_BAG_ZONE,
  PARKED_BAGS_ZONE,
  PARKING_LINE_ZONE,
  containerKey,
  containerOf,
  dropTargetCollision,
  isBagDragId,
  isBagDropTarget,
  isItemDragId,
  resolveContainer,
  sameContainer,
  toBagDragIds,
  toBagId,
  toItemId,
} from './lib/dnd'
import { createExampleState } from './lib/exampleData'
import { createId } from './lib/id'
import { SINGLE_BAG_LAYOUT } from './lib/layout'
import { formatWeight } from './lib/units'
import {
  isStateEmpty,
  bagTotals,
  itemTotalKg,
  itemsInContainer,
  pouchContents,
  pouchTotals,
  totalPackedWeightKg,
  totalParkedWeightKg,
} from './state/baggageReducer'
import { useBaggage } from './state/baggageContext'
import type { WeightCandidate } from './services/lookup/types'
import type { Bag, Item, ItemKind, WeightUnit } from './types'

interface LookupTarget {
  initialQuery: string
  fallbackQuery?: string
  apply(candidate: WeightCandidate): void
  /** Runs when the dialog closes, however it closed. */
  settled?(): void
}

export function App() {
  const { state, dispatch, canUndo, canRedo, undo, redo } = useBaggage()
  const { bags, items, unit } = state

  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [activeBagId, setActiveBagId] = useState<string | null>(null)
  const [hoverContainer, setHoverContainer] = useState<string | null>(null)
  const [addingBag, setAddingBag] = useState(false)
  const [lookup, setLookup] = useState<LookupTarget | null>(null)

  const { setNodeRef: setActiveZoneRef, isOver: isActiveZoneOver } = useDroppable({
    id: ACTIVE_BAGS_ZONE,
    data: { type: 'zone', zone: 'active' },
  })
  const { setNodeRef: setParkedZoneRef, isOver: isParkedZoneOver } = useDroppable({
    id: PARKED_BAGS_ZONE,
    data: { type: 'zone', zone: 'parked' },
  })
  const { setNodeRef: setAddBagZoneRef, isOver: isAddBagZoneOver } = useDroppable({
    id: ADD_BAG_ZONE,
    data: { type: 'zone', zone: 'add-bag' },
  })

  // An item drags from anywhere on its row, so a touch drag has to wait for a
  // hold: the page still scrolls under a moving finger, and a press that stays
  // put picks the item up.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const activeItem = activeItemId ? items.find((item) => item.id === activeItemId) : undefined
  const activeBag = activeBagId ? bags.find((bag) => bag.id === activeBagId) : undefined

  const activeBags = bags.filter((bag) => !bag.parked)
  const parkedBags = bags.filter((bag) => Boolean(bag.parked))

  const activeBagIds = new Set(activeBags.map((bag) => bag.id))
  const pool = itemsInContainer(items, null)
  const activePackedItemCount = items.filter(
    (item) => item.bagId !== null && activeBagIds.has(item.bagId),
  ).length

  const packedKg = totalPackedWeightKg(bags, items)
  const parkedKg = totalParkedWeightKg(bags, items)

  // Bag totals count pouch contents, so the limit check has to use the same sum.
  // Parked bags are excluded from travel limits.
  const overLimitCount = activeBags.filter(
    (bag) => bag.limitKg !== null && bagTotals(bag, items).totalKg > bag.limitKg,
  ).length

  function removeItem(id: string) {
    const item = items.find((entry) => entry.id === id)
    if (!item) return
    const label = item.name || 'this item'
    if (!window.confirm(`Remove ${label}? This cannot be undone.`)) return
    dispatch({ type: 'item/remove', id })
  }

  function updateItem(id: string, patch: Partial<Omit<Item, 'id'>>) {
    dispatch({ type: 'item/update', id, patch })
  }

  function updateBag(id: string, patch: Partial<Omit<Bag, 'id'>>) {
    dispatch({ type: 'bag/update', id, patch })
  }

  function addItem(input: NewItemInput, source = 'manual') {
    let finalName = input.name.trim()
    const existingLower = new Set(items.map((entry) => entry.name.trim().toLowerCase()))
    if (existingLower.has(finalName.toLowerCase())) {
      let counter = 2
      while (existingLower.has(`${finalName} (${counter})`.toLowerCase())) {
        counter += 1
      }
      finalName = `${finalName} (${counter})`
    }

    dispatch({
      type: 'item/add',
      item: {
        id: createId('item'),
        name: finalName,
        productName: input.productName,
        weightKg: input.weightKg,
        accessoriesKg: input.accessoriesKg,
        accessoriesNote: '',
        kind: input.kind,
        bagId: null,
        pouchId: null,
        weightSource: source,
      },
    })
  }

  function addBag(input: NewBagInput) {
    dispatch({
      type: 'bag/add',
      bag: {
        id: createId('bag'),
        name: input.name,
        productName: input.productName,
        tareWeightKg: input.tareWeightKg,
        accessoriesKg: input.accessoriesKg,
        accessoriesNote: '',
        extrasEnabled: false,
        limitKg: input.limitKg,
        itemColumns: 1,
        colorIndex: input.colorIndex,
        parked: false,
      },
    })
    setAddingBag(false)
  }

  function setUnit(next: WeightUnit) {
    dispatch({ type: 'unit/set', unit: next })
  }

  function handleDragStart(event: DragStartEvent) {
    const dragId = String(event.active.id)
    if (isBagDragId(dragId)) {
      setActiveBagId(toBagId(dragId))
    } else {
      setActiveItemId(toItemId(dragId))
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event
    if (!over) {
      setHoverContainer(null)
      return
    }
    const overId = String(over.id)
    if (isBagDropTarget(overId)) {
      setHoverContainer(overId)
      return
    }
    const target = resolveContainer(overId, items)
    setHoverContainer(containerKey(target))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItemId(null)
    setActiveBagId(null)
    setHoverContainer(null)

    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (isBagDragId(activeId)) {
      const fromId = toBagId(activeId)

      let position: 'before' | 'after' = 'before'
      if (over.rect && active.rect.current.translated) {
        const activeCenterX =
          active.rect.current.translated.left +
          active.rect.current.translated.width / 2
        const overCenterX = over.rect.left + over.rect.width / 2
        if (activeCenterX > overCenterX) {
          position = 'after'
        }
      }

      if (overId === ADD_BAG_ZONE) {
        dispatch({ type: 'bag/reorder', fromId, toId: null, targetParked: false, position: 'after' })
      } else if (isBagDragId(overId)) {
        const toId = toBagId(overId)
        dispatch({ type: 'bag/reorder', fromId, toId, position })
      } else if (overId === PARKED_BAGS_ZONE || overId === PARKING_LINE_ZONE) {
        dispatch({ type: 'bag/reorder', fromId, toId: null, targetParked: true, position: 'after' })
      } else if (overId === ACTIVE_BAGS_ZONE) {
        dispatch({ type: 'bag/reorder', fromId, toId: null, targetParked: false, position: 'after' })
      }
      return
    }

    const itemId = toItemId(activeId)
    const dragged = items.find((item) => item.id === itemId)
    if (!dragged) return

    const target = resolveContainer(overId, items)
    if (!target) return
    const from = containerOf(dragged)

    if (sameContainer(from, target)) {
      const overTargetId = String(over.id)
      if (!isItemDragId(overTargetId)) return
      const siblings =
        target.kind === 'pouch'
          ? pouchContents(items, target.pouchId)
          : itemsInContainer(items, target.kind === 'bag' ? target.bagId : null)
      const fromIndex = siblings.findIndex((item) => item.id === itemId)
      const toIndex = siblings.findIndex((item) => item.id === toItemId(overTargetId))
      if (fromIndex !== -1 && toIndex !== -1) {
        dispatch({ type: 'item/reorder', container: target, fromIndex, toIndex })
      }
      return
    }

    dispatch({ type: 'item/move', itemId, to: target })
  }

  function openLookupForItem(itemId: string) {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return
    const query = item.productName.trim() || item.name.trim()
    setLookup({
      initialQuery: query,
      fallbackQuery: item.name.trim(),
      apply: (candidate) => {
        // A product database or model gives us a real product string, so keep it
        // as the item's product name when the user has not set one themselves.
        const patch =
          candidate.source !== 'typical' && item.productName.trim().length === 0
            ? { productName: candidate.label }
            : {}
        updateItem(itemId, { ...patch, weightKg: candidate.weightKg, weightSource: candidate.source })
      },
    })
  }

  function openLookupForBag(bagId: string) {
    const bag = bags.find((entry) => entry.id === bagId)
    if (!bag) return
    const query = bag.productName.trim() || bag.name.trim()
    setLookup({
      initialQuery: query,
      fallbackQuery: bag.name.trim(),
      apply: (candidate) => {
        const patch =
          candidate.source !== 'typical' && bag.productName.trim().length === 0
            ? { productName: candidate.label }
            : {}
        updateBag(bagId, { ...patch, tareWeightKg: candidate.weightKg })
      },
    })
  }

  function openLookupFromForm(name: string, productName: string, kind: ItemKind, settled: () => void) {
    const query = productName || name
    if (query.length === 0) return
    setLookup({
      initialQuery: query,
      fallbackQuery: name || undefined,
      settled,
      apply: (candidate) => {
        addItem(
          {
            name: name || candidate.label || query,
            productName: productName || (candidate.source === 'typical' ? '' : candidate.label),
            weightKg: candidate.weightKg,
            accessoriesKg: 0,
            kind,
          },
          candidate.source,
        )
      },
    })
  }

  function renderBagCard(bag: Bag) {
    return (
      <BagCard
        key={bag.id}
        bag={bag}
        items={items}
        unit={unit}
        hoverContainerId={hoverContainer}
        otherBagNames={bags.filter((b) => b.id !== bag.id).map((b) => b.name)}
        onRename={(name) => updateBag(bag.id, { name })}
        onProductName={(productName) => updateBag(bag.id, { productName })}
        onLookup={() => openLookupForBag(bag.id)}
        onTareWeight={(tareWeightKg) => updateBag(bag.id, { tareWeightKg })}
        onAccessoriesWeight={(accessoriesKg) => updateBag(bag.id, { accessoriesKg })}
        onAccessoriesNote={(accessoriesNote) => updateBag(bag.id, { accessoriesNote })}
        onLimitWeight={(limitKg) => updateBag(bag.id, { limitKg })}
        onColumns={(itemColumns) => updateBag(bag.id, { itemColumns })}
        onExtrasEnabled={(extrasEnabled) => updateBag(bag.id, { extrasEnabled })}
        onColor={(colorIndex) => updateBag(bag.id, { colorIndex })}
        onToggleParked={() => updateBag(bag.id, { parked: !bag.parked })}
        onRemove={() => dispatch({ type: 'bag/remove', id: bag.id })}
        onRenameItem={(id, name) => updateItem(id, { name })}
        onItemProductName={(id, productName) => updateItem(id, { productName })}
        onItemWeight={(id, weightKg) =>
          updateItem(id, { weightKg, weightSource: 'manual' })
        }
        onItemAccessoriesWeight={(id, accessoriesKg) =>
          updateItem(id, { accessoriesKg })
        }
        onItemAccessoriesNote={(id, accessoriesNote) =>
          updateItem(id, { accessoriesNote })
        }
        onConvertItemKind={(id, kind) => updateItem(id, { kind })}
        onRemoveItem={(id) =>
          dispatch({ type: 'item/move', itemId: id, to: { kind: 'pool' } })
        }
        onLookupItem={openLookupForItem}
      />
    )
  }

  return (
    <div className="min-h-dvh pb-10">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex w-full flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="mr-auto flex items-center gap-2.5">
            <img
              src="/bagbuddy-icon.svg"
              alt=""
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-xl"
            />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <h1 className="text-2xl leading-tight font-semibold text-slate-800 dark:text-slate-100">
                BagBuddy
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your luggage balance copilot
              </p>
            </div>
          </div>

          <div
            role="group"
            aria-label="Weight unit"
            className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700"
          >
            {(['kg', 'lb'] as WeightUnit[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={unit === option}
                onClick={() => setUnit(option)}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  unit === option
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <HistoryControls canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />

          <ThemeSwitch />

          <AccountMenu />

          {!isStateEmpty(state) && (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm('Delete every bag and item? This cannot be undone.')) return
                clearStoredState()
                dispatch({ type: 'state/reset', state: { bags: [], items: [], unit } })
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-500 transition hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:hover:border-rose-500"
            >
              Clear all
            </button>
          )}
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={dropTargetCollision}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveItemId(null)
          setHoverContainer(null)
        }}
      >
        <main className="mx-auto grid w-full grid-cols-1 gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(320px,380px)_1fr]">
          <ItemPool
            items={pool}
            allItems={items}
            unit={unit}
            columns={1}
            hoverContainerId={hoverContainer}
            onAdd={addItem}
            onRename={(id, name) => updateItem(id, { name })}
            onProductName={(id, productName) => updateItem(id, { productName })}
            onWeight={(id, weightKg) => updateItem(id, { weightKg, weightSource: 'manual' })}
            onAccessoriesWeight={(id, accessoriesKg) => updateItem(id, { accessoriesKg })}
            onAccessoriesNote={(id, accessoriesNote) => updateItem(id, { accessoriesNote })}
            onConvertKind={(id, kind) => updateItem(id, { kind })}
            onRemove={removeItem}
            onLookup={openLookupForItem}
            onLookupFromForm={(name, productName, kind, settled) =>
              openLookupFromForm(name, productName, kind, settled)
            }
          />

          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 className="text-sm font-semibold tracking-wide text-slate-700 uppercase dark:text-slate-300">
                Bags
              </h2>
              <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Packed total{' '}
                  <strong className="font-semibold text-slate-700 dark:text-slate-200">
                    {formatWeight(packedKg, unit)} {unit}
                  </strong>
                </span>
                <span>
                  Items packed{' '}
                  <strong className="font-semibold text-slate-700 dark:text-slate-200">
                    {activePackedItemCount}/{items.length}
                  </strong>
                  {parkedBags.length > 0 && (
                    <span className="ml-1 text-slate-400 dark:text-slate-500">
                      ({parkedBags.length} parked · {formatWeight(parkedKg, unit)} {unit})
                    </span>
                  )}
                </span>
                {overLimitCount > 0 && (
                  <span className="font-medium text-rose-600 dark:text-rose-400">
                    {overLimitCount} bag{overLimitCount === 1 ? '' : 's'} over the limit
                  </span>
                )}
                {/* Last in the row, so the snapshots sit against the right edge. */}
                <SnapshotControls
                  snapshots={state.snapshots}
                  onSave={(name) => dispatch({ type: 'snapshot/add', name })}
                  onApply={(id) => dispatch({ type: 'snapshot/apply', id })}
                  onDelete={(id) => dispatch({ type: 'snapshot/remove', id })}
                />
              </div>
            </div>

            {bags.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Start with an empty bag. Weigh the bag itself, type that number into “Empty
                  weight”, then drag items into it.
                </p>
                <BagForm
                  unit={unit}
                  colorIndex={0}
                  existingBagNames={bags.map((b) => b.name)}
                  onAdd={addBag}
                />
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'state/reset', state: createExampleState() })}
                  className="self-start text-sm font-medium text-indigo-600 underline hover:text-indigo-500 dark:text-indigo-400"
                >
                  Or load an example trip
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Active Bags Area (above parking line) */}
                <SortableContext items={toBagDragIds(activeBags)} strategy={rectSortingStrategy}>
                  <div
                    ref={setActiveZoneRef}
                    className={`flex flex-wrap items-start gap-4 rounded-2xl transition-all ${
                      isActiveZoneOver && activeBagId !== null
                        ? 'ring-2 ring-indigo-400/80 bg-indigo-50/20 p-2'
                        : ''
                    }`}
                  >
                    {activeBags.length === 0 ? (
                      <div
                        className={`flex min-h-24 flex-1 items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center text-xs transition ${
                          isActiveZoneOver && activeBagId !== null
                            ? 'border-indigo-500 bg-indigo-50/60 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300'
                            : 'border-slate-300/80 bg-slate-50/40 text-slate-400 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-500'
                        }`}
                      >
                        <div>
                          <p className="font-medium text-slate-600 dark:text-slate-300">
                            {isActiveZoneOver && activeBagId !== null
                              ? 'Release to activate bag'
                              : 'No active bags'}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                            Drag a bag here from below the line to include it in this trip.
                          </p>
                        </div>
                      </div>
                    ) : (
                      activeBags.map((bag) => renderBagCard(bag))
                    )}

                    {addingBag ? (
                      <BagForm
                        unit={unit}
                        colorIndex={bags.length % BAG_COLORS.length}
                        existingBagNames={bags.map((b) => b.name)}
                        onAdd={addBag}
                        onCancel={() => setAddingBag(false)}
                      />
                    ) : (
                      <button
                        ref={setAddBagZoneRef}
                        type="button"
                        onClick={() => setAddingBag(true)}
                        className={`flex min-h-24 items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-sm font-medium transition ${
                          isAddBagZoneOver && activeBagId !== null
                            ? 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-400 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'border-slate-300 text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/60 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300'
                        } ${SINGLE_BAG_LAYOUT}`}
                      >
                        {isAddBagZoneOver && activeBagId !== null ? 'Drop here to place last' : '+ Add another bag'}
                      </button>
                    )}
                  </div>
                </SortableContext>

                {/* The Parking Line separating active bags from parked bags */}
                <ParkingLine
                  parkedCount={parkedBags.length}
                  isOver={hoverContainer === PARKING_LINE_ZONE || (isParkedZoneOver && activeBagId !== null)}
                />

                {/* Parked Bags Area (below parking line) */}
                <SortableContext items={toBagDragIds(parkedBags)} strategy={rectSortingStrategy}>
                  <div
                    ref={setParkedZoneRef}
                    className={`flex flex-wrap items-start gap-4 rounded-2xl transition-all ${
                      isParkedZoneOver && activeBagId !== null
                        ? 'ring-2 ring-indigo-400/80 bg-indigo-50/20 p-2'
                        : ''
                    }`}
                  >
                    {parkedBags.length === 0 ? (
                      <div
                        className={`flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed p-6 text-center text-xs transition ${
                          isParkedZoneOver && activeBagId !== null
                            ? 'border-indigo-500 bg-indigo-50/60 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300'
                            : 'border-slate-300/80 bg-slate-50/40 text-slate-400 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-500'
                        }`}
                      >
                        <p className="font-medium text-slate-600 dark:text-slate-300">
                          {isParkedZoneOver && activeBagId !== null
                            ? 'Release to park bag here'
                            : 'No bags parked'}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Drag bags below this line to park them. Parked bags keep their contents but don't count toward travel totals.
                        </p>
                      </div>
                    ) : (
                      parkedBags.map((bag) => renderBagCard(bag))
                    )}
                  </div>
                </SortableContext>
              </div>
            )}
          </section>
        </main>

        <DragOverlay>
          {activeItem && (
            <DragPreview>
              {activeItem.name || 'Item'} · {formatWeight(itemTotalKg(activeItem), unit)} {unit}
              {activeItem.kind === 'pouch' && pouchTotals(items, activeItem.id).itemCount > 0 && (
                <> · {pouchTotals(items, activeItem.id).itemCount} inside</>
              )}
            </DragPreview>
          )}
          {activeBag && (
            <div className="w-80 rounded-2xl border-2 border-indigo-500 bg-white/95 p-4 shadow-2xl ring-4 ring-indigo-500/20 backdrop-blur rotate-1 dark:border-indigo-400 dark:bg-slate-900/95">
              <div className="flex items-center gap-2">
                <span
                  className={`size-2.5 shrink-0 rounded-full ${bagColor(activeBag.colorIndex).dot}`}
                  aria-hidden="true"
                />
                <span className="font-semibold break-words text-slate-800 dark:text-slate-100">
                  {activeBag.name}
                </span>
                {activeBag.parked && (
                  <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                    Parked
                  </span>
                )}
              </div>
              {activeBag.productName && (
                <p className="mt-0.5 text-xs break-words text-slate-400">{activeBag.productName}</p>
              )}
              <div className="mt-3 flex items-baseline justify-between">
                <p className="text-xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                  {formatWeight(bagTotals(activeBag, items).totalKg, unit)}
                  <span className="ml-1 text-xs font-normal text-slate-400">{unit}</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {itemsInContainer(items, activeBag.id).length} item
                  {itemsInContainer(items, activeBag.id).length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <footer className="mx-auto w-full px-4 pb-2 sm:px-6">
        <div className="flex flex-col gap-1 border-t border-slate-200 pt-4 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          <p>© Rakesh Malik 2026</p>
          <p>Co authored by: Spaace Bunny Alpha</p>
        </div>
      </footer>

      {lookup && (
        <WeightLookupDialog
          initialQuery={lookup.initialQuery}
          fallbackQuery={lookup.fallbackQuery}
          unit={unit}
          onApply={(candidate) => {
            lookup.apply(candidate)
            lookup.settled?.()
            setLookup(null)
          }}
          onClose={() => {
            lookup.settled?.()
            setLookup(null)
          }}
        />
      )}

      <SyncChoiceDialog />
    </div>
  )
}