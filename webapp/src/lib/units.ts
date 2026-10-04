import type { WeightUnit } from '../types'

/** International avoirdupois pound. */
const KG_PER_LB = 0.45359237

const DISPLAY_PRECISION = 2
const INPUT_PRECISION = 3

export function toKg(value: number, from: WeightUnit): number {
  return from === 'kg' ? value : value * KG_PER_LB
}

export function fromKg(weightKg: number, to: WeightUnit): number {
  return to === 'kg' ? weightKg : weightKg / KG_PER_LB
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  return from === to ? value : fromKg(toKg(value, from), to)
}

function round(value: number, precision: number): number {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

/** Fixed-point weight for totals, e.g. `12.4` or `3.05`. */
export function formatWeight(weightKg: number, unit: WeightUnit): string {
  const value = round(fromKg(weightKg, unit), DISPLAY_PRECISION)
  return value.toFixed(DISPLAY_PRECISION)
}

/** Trailing-zero-free weight for editable inputs, e.g. `12.4` or `3`. */
export function formatWeightInput(weightKg: number, unit: WeightUnit): string {
  return String(round(fromKg(weightKg, unit), INPUT_PRECISION))
}

export const UNIT_LABEL: Record<WeightUnit, string> = { kg: 'kg', lb: 'lb' }