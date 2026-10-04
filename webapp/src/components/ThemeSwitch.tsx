import { useTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

export function ThemeSwitch() {
  const [theme, setTheme] = useTheme()

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={theme === option.value}
          title={`${option.label} theme`}
          onClick={() => setTheme(option.value)}
          className={`px-2.5 py-1.5 text-sm font-medium transition ${
            theme === option.value
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          {option.value === 'light' ? <SunIcon /> : option.value === 'dark' ? <MoonIcon /> : <AutoIcon />}
        </button>
      ))}
    </div>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor">
      <circle cx="10" cy="10" r="3.5" strokeWidth="1.6" />
      <path
        d="M10 2.5v1.6M10 15.9v1.6M17.5 10h-1.6M4.1 10H2.5M15.3 4.7l-1.1 1.1M5.8 14.2l-1.1 1.1M15.3 15.3l-1.1-1.1M5.8 5.8 4.7 4.7"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor">
      <path
        d="M16 12.3A6.8 6.8 0 0 1 7.7 4a6.8 6.8 0 1 0 8.3 8.3Z"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AutoIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor">
      <rect x="2.5" y="4" width="15" height="10" rx="1.5" strokeWidth="1.5" />
      <path d="M7 17h6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}