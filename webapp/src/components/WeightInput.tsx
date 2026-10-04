import { useState } from 'react'
import { formatWeightInput, toKg } from '../lib/units'
import type { WeightUnit } from '../types'

interface WeightInputProps {
  valueKg: number
  unit: WeightUnit
  onChange(weightKg: number): void
  id?: string
  label: string
  className?: string
  placeholder?: string
}

/**
 * Weight field that stores kilograms but edits in the display unit. The raw text
 * is only held while the field has focus, so unit switches and programmatic
 * updates (a lookup result, clearing a bag) always win once the user leaves.
 *
 * An empty field shows `0` as a placeholder rather than as a value, and focusing
 * selects whatever is there, so typing `1` never turns a stale `0` into `10`.
 */
export function WeightInput({
  valueKg,
  unit,
  onChange,
  id,
  label,
  className = '',
  placeholder = '0',
}: WeightInputProps) {
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const empty = valueKg === 0
  const display = focused ? draft : empty ? '' : formatWeightInput(valueKg, unit)

  function handleChange(value: string) {
    setDraft(value)
    const parsed = Number.parseFloat(value)
    onChange(Number.isFinite(parsed) && parsed > 0 ? toKg(parsed, unit) : 0)
  }

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.05"
        value={display}
        placeholder={placeholder}
        aria-label={label}
        onFocus={(event) => {
          setDraft(empty ? '' : formatWeightInput(valueKg, unit))
          setFocused(true)
          if (!empty) event.currentTarget.select()
        }}
        onBlur={() => setFocused(false)}
        onChange={(event) => handleChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white py-0.5 pr-7 pl-2 text-sm tabular-nums text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[11px] font-medium text-slate-400 select-none"
      >
        {unit}
      </span>
    </div>
  )
}