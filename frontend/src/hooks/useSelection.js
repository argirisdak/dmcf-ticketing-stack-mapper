import { useContext } from 'react'
import { SelectionContext } from '../context/selection-context.js'

export function useSelection() {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider')
  return ctx
}
