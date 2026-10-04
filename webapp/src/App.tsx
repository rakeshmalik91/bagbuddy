import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { BagCard } from './components/BagCard'
import { BagForm } from './components/BagForm'
import type { NewBagInput } from './components/BagForm'
import { AccountMenu } from './components/AccountMenu'
import { HistoryControls } from './components/HistoryControls'
import { ThemeSwitch } from './components/ThemeSwitch'
import { DragPreview } from './components/ItemRow'
import { ItemPool } from './components/ItemPool'
import type { NewItemInput } from './components/ItemForm'
import { SyncChoiceDialog } from './components/SyncChoiceDialog'
import { WeightLookupDialog } from './components/WeightLookupDialog'
import { BAG_COLORS } from './lib/bagColors'
import { clearStoredState } from './lib/storage'
import { containerKey, isItemDragId, POOL_ID, resolveContainer, toDragIds, toItemId } from './lib/dnd'
import { createExampleState } from './lib/exampleData'
import { createId } from './lib/id'
import { formatWeight } from './lib/units'
import { isStateEmpty, itemTotalKg, itemsInContainer, totalPackedWeightKg } from './state/baggageReducer'
import { useBaggage } from './state/baggageContext'
import type { WeightCandidate } from './services/lookup/types'
import type { Bag, Item, WeightUnit } from './types'

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
  const [hoverContainer, setHoverContainer] = useState<string | null>(null)
  const [addingBag, setAddingBag] = useState(false)
  const [lookup, setLookup] = useState<LookupTarget | null>(null)

  // An item drags from anywhere on its row, so a touch drag has to wait for a
  // hold: the page still scrolls under a moving finger, and a press that stays
  // put picks the item up.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const activeItem = activeItemId ? items.find((item) => item.id === activeItemId) : undefined
  const pool = itemsInContainer(items, null)
  const packedKg = totalPackedWeightKg(bags, items)
  const overLimitCount = bags.filter((bag) => {
    if (bag.limitKg === null) return false
    return itemsInContainer(items, bag.id).reduce((sum, item) => sum + itemTotalKg(item), bag.tareWeightKg) >
      bag.limitKg
  }).length

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
    dispatch({
      type: 'item/add',
      item: {
        id: createId('item'),
        name: input.name,
        productName: input.productName,
        weightKg: input.weightKg,
        accessoriesKg: input.accessoriesKg,
        accessoriesNote: '',
        bagId: null,
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
      },
    })
    setAddingBag(false)
  }

  function setUnit(next: WeightUnit) {
    dispatch({ type: 'unit/set', unit: next })
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveItemId(toItemId(String(event.active.id)))
  }

  function handleDragOver(event: DragOverEvent) {
    const target = event.over ? resolveContainer(String(event.over.id), items) : null
    setHoverContainer(containerKey(target))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItemId(null)
    setHoverContainer(null)

    const { active, over } = event
    if (!over) return

    const itemId = toItemId(String(active.id))
    const dragged = items.find((item) => item.id === itemId)
    if (!dragged) return

    const target = resolveContainer(String(over.id), items)
    if (!target) return
    const toBagId = target.kind === 'bag' ? target.bagId : null

    if (toBagId === dragged.bagId) {
      const overId = String(over.id)
      if (!isItemDragId(overId)) return
      const siblingIds = toDragIds(itemsInContainer(items, dragged.bagId))
      const fromIndex = siblingIds.indexOf(String(active.id))
      const toIndex = siblingIds.indexOf(overId)
      if (fromIndex !== -1 && toIndex !== -1) {
        dispatch({ type: 'item/reorder', bagId: dragged.bagId, fromIndex, toIndex })
      }
      return
    }

    dispatch({ type: 'item/move', itemId, toBagId })
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

  function openLookupFromForm(name: string, productName: string, settled: () => void) {
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
          },
          candidate.source,
        )
      },
    })
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
        collisionDetection={closestCenter}
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
            unit={unit}
            columns={1}
            isActive={hoverContainer === POOL_ID}
            onAdd={addItem}
            onRename={(id, name) => updateItem(id, { name })}
            onProductName={(id, productName) => updateItem(id, { productName })}
            onWeight={(id, weightKg) => updateItem(id, { weightKg, weightSource: 'manual' })}
            onAccessoriesWeight={(id, accessoriesKg) => updateItem(id, { accessoriesKg })}
            onAccessoriesNote={(id, accessoriesNote) => updateItem(id, { accessoriesNote })}
            onRemove={removeItem}
            onLookup={openLookupForItem}
            onLookupFromForm={(name, productName, settled) =>
              openLookupFromForm(name, productName, settled)
            }
          />

          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 className="text-sm font-semibold tracking-wide text-slate-700 uppercase dark:text-slate-300">
                Bags
              </h2>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Packed total{' '}
                  <strong className="font-semibold text-slate-700 dark:text-slate-200">
                    {formatWeight(packedKg, unit)} {unit}
                  </strong>
                </span>
                <span>
                  Items packed{' '}
                  <strong className="font-semibold text-slate-700 dark:text-slate-200">
                    {items.length - pool.length}/{items.length}
                  </strong>
                </span>
                {overLimitCount > 0 && (
                  <span className="font-medium text-rose-600 dark:text-rose-400">
                    {overLimitCount} bag{overLimitCount === 1 ? '' : 's'} over the limit
                  </span>
                )}
              </div>
            </div>

            {bags.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Start with an empty bag. Weigh the bag itself, type that number into “Empty
                  weight”, then drag items into it.
                </p>
                <BagForm unit={unit} colorIndex={0} onAdd={addBag} />
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'state/reset', state: createExampleState() })}
                  className="self-start text-sm font-medium text-indigo-600 underline hover:text-indigo-500 dark:text-indigo-400"
                >
                  Or load an example trip
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-start gap-4">
                {bags.map((bag) => (
                  <BagCard
                    key={bag.id}
                    bag={bag}
                    items={items}
                    unit={unit}
                    isActive={hoverContainer === `container:bag:${bag.id}`}
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
                    onRemoveItem={(id) => dispatch({ type: 'item/move', itemId: id, toBagId: null })}
                    onLookupItem={openLookupForItem}
                  />
                ))}

                {addingBag ? (
                  <BagForm
                    unit={unit}
                    colorIndex={bags.length % BAG_COLORS.length}
                    onAdd={addBag}
                    onCancel={() => setAddingBag(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingBag(true)}
                    className="flex min-h-24 min-w-80 flex-[1_1_300px] basis-[300px] max-w-[640px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 px-4 py-6 text-sm font-medium text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/60 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                  >
                    + Add another bag
                  </button>
                )}
              </div>
            )}
          </section>
        </main>

        <DragOverlay>
          {activeItem && (
            <DragPreview>
              {activeItem.name || 'Item'} · {formatWeight(itemTotalKg(activeItem), unit)} {unit}
            </DragPreview>
          )}
        </DragOverlay>
      </DndContext>

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