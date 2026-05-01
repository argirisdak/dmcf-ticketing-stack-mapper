import { useCallback, useMemo, useState } from 'react'
import { OrganisationSelectionContext } from './organisation-selection-context.js'

export function OrganisationSelectionProvider({ children }) {
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
    <OrganisationSelectionContext.Provider value={value}>
      {children}
    </OrganisationSelectionContext.Provider>
  )
}
