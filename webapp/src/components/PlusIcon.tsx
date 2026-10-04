export function PlusIcon({ className = 'size-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="none" stroke="currentColor">
      <path d="M10 4.5v11M4.5 10h11" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}