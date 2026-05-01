import { useContext } from 'react'
import { SystemSelectionContext } from '../context/system-selection-context.js'

export function useSystemSelection() {
  const ctx = useContext(SystemSelectionContext)
  if (!ctx) throw new Error('useSystemSelection must be used within SystemSelectionProvider')
  return ctx
}
