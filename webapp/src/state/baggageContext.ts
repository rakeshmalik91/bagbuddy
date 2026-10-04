import { createContext, useContext } from 'react'
import type { BagAction } from './baggageReducer'
import type { BaggageState } from '../types'

export interface BaggageContextValue {
  state: BaggageState
  dispatch(action: BagAction): void
  canUndo: boolean
  canRedo: boolean
  undo(): void
  redo(): void
}

export const BaggageContext = createContext<BaggageContextValue | null>(null)

export function useBaggage(): BaggageContextValue {
  const value = useContext(BaggageContext)
  if (!value) {
    throw new Error('useBaggage must be called inside <BaggageProvider>')
  }
  return value
}