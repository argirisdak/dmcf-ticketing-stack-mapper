import { useEffect, useState } from 'react'

/**
 * @template T
 * @param {T} value
 * @param {number} delayMs — non-finite or non-number values are treated as 0 (immediate update).
 * @returns {T}
 */
export function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value)
  const delay =
    typeof delayMs === 'number' && Number.isFinite(delayMs) ? Math.max(0, delayMs) : 0

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])

  return debounced
}
