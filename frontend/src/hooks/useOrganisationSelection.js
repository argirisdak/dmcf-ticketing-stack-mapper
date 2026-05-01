import { useContext } from 'react'
import { OrganisationSelectionContext } from '../context/organisation-selection-context.js'

export function useOrganisationSelection() {
  const ctx = useContext(OrganisationSelectionContext)
  if (!ctx) throw new Error('useOrganisationSelection must be used within OrganisationSelectionProvider')
  return ctx
}
