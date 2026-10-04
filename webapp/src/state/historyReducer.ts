import type { BaggageState } from '../types'
import type { BagAction } from './baggageReducer'
import { baggageReducer } from './baggageReducer'

const HISTORY_LIMIT = 60

export interface HistoryState {
  past: BaggageState[]
  present: BaggageState
  future: BaggageState[]
  /** Used to merge a burst of edits to the same field into one undo step. */
  last: BagAction | null
}

export type HistoryAction = BagAction | { type: 'history/undo' } | { type: 'history/redo' }

export const initialHistory = (present: BaggageState): HistoryState => ({
  past: [],
  present,
  future: [],
  last: null,
})

function isHistoryAction(action: HistoryAction): action is { type: 'history/undo' } | { type: 'history/redo' } {
  return action.type === 'history/undo' || action.type === 'history/redo'
}

function patchKeys(patch: object): string {
  return Object.keys(patch).sort().join(',')
}

/**
 * Typing should be one undo step, not one per keystroke, so consecutive edits
 * to the same field of the same thing are merged.
 */
function mergesWith(previous: BagAction | null, next: BagAction): boolean {
  if (!previous || previous.type !== next.type) return false
  if (next.type === 'item/update') {
    const before = previous as Extract<BagAction, { type: 'item/update' }>
    const after = next as Extract<BagAction, { type: 'item/update' }>
    return before.id === after.id && patchKeys(before.patch) === patchKeys(after.patch)
  }
  if (next.type === 'bag/update') {
    const before = previous as Extract<BagAction, { type: 'bag/update' }>
    const after = next as Extract<BagAction, { type: 'bag/update' }>
    return before.id === after.id && patchKeys(before.patch) === patchKeys(after.patch)
  }
  return false
}

export function canUndo(state: HistoryState): boolean {
  return state.past.length > 0
}

export function canRedo(state: HistoryState): boolean {
  return state.future.length > 0
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (isHistoryAction(action)) {
    if (action.type === 'history/undo') {
      const previous = state.past[state.past.length - 1]
      if (!previous) return state
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        last: null,
      }
    }

    const next = state.future[0]
    if (!next) return state
    return {
      past: [...state.past, state.present].slice(-HISTORY_LIMIT),
      present: next,
      future: state.future.slice(1),
      last: null,
    }
  }

  const present = baggageReducer(state.present, action)
  if (present === state.present) return state

  if (mergesWith(state.last, action)) {
    return { ...state, present, future: [] }
  }

  return {
    past: [...state.past, state.present].slice(-HISTORY_LIMIT),
    present,
    future: [],
    last: action,
  }
}