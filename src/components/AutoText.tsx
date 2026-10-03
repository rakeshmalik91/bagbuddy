import { useEffect, useRef } from 'react'

interface AutoTextProps {
  value: string
  onChange(value: string): void
  ariaLabel: string
  placeholder: string
  className?: string
  onFocus?(): void
  onBlur?(): void
}

/**
 * A text field that wraps instead of truncating, and grows to fit what is typed.
 *
 * A plain input can only ever scroll horizontally, so a long product name like
 * "Tamron 28 200mm F/2.8-5.6" gets cut off. This is a textarea pinned to one
 * line until the text needs more, with Enter committing rather than adding a
 * line break, so it still behaves like a field.
 */
export function AutoText({
  value,
  onChange,
  ariaLabel,
  placeholder,
  className = '',
  onFocus,
  onBlur,
}: AutoTextProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const resize = () => {
      element.style.height = 'auto'
      element.style.height = `${element.scrollHeight}px`
    }

    resize()
    // Editing a row restyles its fields, and landing in a bag with a different
    // column count rewrites them, so the height is measured again on either.
    let width = element.offsetWidth
    const observer = new ResizeObserver(() => {
      if (element.offsetWidth === width) return
      width = element.offsetWidth
      resize()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [value, className])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
      className={`resize-none overflow-hidden whitespace-pre-wrap break-words outline-none ${className}`}
    />
  )
}