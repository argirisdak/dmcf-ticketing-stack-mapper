import { useCallback, useMemo, useState } from 'react'
import { SelectionContext } from './selection-context.js'

export function SelectionProvider({ children }) {
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
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  )
}
