import { useEffect, useRef } from 'react'

interface AutoTextProps {
  value: string
  onChange(value: string): void
  ariaLabel: string
  placeholder: string
  className?: string
  /** Inside a form, Enter commits by submitting it instead of just leaving the field. */
  submitOnEnter?: boolean
  autoFocus?: boolean
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
  submitOnEnter = false,
  autoFocus = false,
  onFocus,
  onBlur,
}: AutoTextProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let frame = 0
    const resize = () => {
      const applied = element.style.height
      // Measuring means clearing the height first, and doing that inside the
      // observer's own delivery would resize what is being observed, so it
      // waits for the next frame and only writes when the result differs.
      element.style.height = 'auto'
      const measured = `${element.scrollHeight}px`
      if (measured !== applied) element.style.height = measured
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(resize)
    }

    schedule()

    // Editing a row restyles its fields, and landing in a bag with a different
    // column count rewrites them, so the height is measured again on either.
    let width = element.offsetWidth
    const observer = new ResizeObserver(() => {
      if (element.offsetWidth === width) return
      width = element.offsetWidth
      schedule()
    })
    observer.observe(element)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [value, className])

  return (
    <textarea
      ref={ref}
      rows={1}
      autoFocus={autoFocus}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          if (submitOnEnter) event.currentTarget.form?.requestSubmit()
          else event.currentTarget.blur()
        }
      }}
      className={`resize-none overflow-hidden whitespace-pre-wrap break-words outline-none ${className}`}
    />
  )
}