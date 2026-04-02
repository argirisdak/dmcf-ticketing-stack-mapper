import { createContext, useContext, useState, useMemo, useCallback } from 'react'

const SelectionContext = createContext(null)

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

export function useSelection() {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider')
  return ctx
}
