import { useCallback, useMemo, useState } from 'react'
import { SystemSelectionContext } from './system-selection-context.js'

export function SystemSelectionProvider({ children }) {
  const [selectedIds, setSelectedIds] = useState([])

  const toggleSelection = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }, [])

  const clearSelection = useCallback(() => setSelectedIds([]), [])

  const value = useMemo(
    () => ({ selectedIds, toggleSelection, clearSelection }),
    [selectedIds, toggleSelection, clearSelection]
  )

  return (
    <SystemSelectionContext.Provider value={value}>
      {children}
    </SystemSelectionContext.Provider>
  )
}
