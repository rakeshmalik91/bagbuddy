import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { loadState, saveState } from '../lib/storage'
import type { BaggageState } from '../types'
import { BaggageContext } from './baggageContext'
import type { BagAction } from './baggageReducer'
import { canRedo, canUndo, historyReducer, initialHistory } from './historyReducer'

function loadInitialState(): BaggageState {
  return loadState() ?? { bags: [], items: [], unit: 'kg' }
}

export function BaggageProvider({ children }: { children: ReactNode }) {
  const [history, dispatch] = useReducer(historyReducer, undefined, () =>
    initialHistory(loadInitialState()),
  )

  const state = history.present

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key !== 'z' && key !== 'y') return

      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))) {
        return
      }

      event.preventDefault()
      dispatch({ type: key === 'y' ? 'history/redo' : 'history/undo' })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const undo = useCallback(() => dispatch({ type: 'history/undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'history/redo' }), [])
  const send = useCallback((action: BagAction) => dispatch(action), [])

  const value = useMemo(
    () => ({
      state,
      dispatch: send,
      canUndo: canUndo(history),
      canRedo: canRedo(history),
      undo,
      redo,
    }),
    [history, redo, send, state, undo],
  )

  return <BaggageContext.Provider value={value}>{children}</BaggageContext.Provider>
}