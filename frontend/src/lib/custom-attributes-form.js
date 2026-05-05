import { isValidSourceUrl } from './source-url-validation.js'

/** @typedef {{ _key: string; label: string; value: string; sourceReference: string }} CustomAttributeRow */

/**
 * @param {CustomAttributeRow[]} rows
 * @returns {{ label: string; value: string; sourceReference: string }[]}
 */
export function buildCustomAttributesPayload(rows) {
  return rows
    .map(({ label, value, sourceReference }) => ({
      label: String(label ?? ''),
      value: String(value ?? ''),
      sourceReference: String(sourceReference ?? ''),
    }))
    .filter((row) => !(row.label.trim() === '' && row.value.trim() === ''))
}

/**
 * @param {CustomAttributeRow} row
 * @param {{ labelMax: number; valueMax: number; urlMax: number }} limits
 */
export function customAttributeRowHasErrors(row, limits) {
  const label = String(row.label ?? '')
  const value = String(row.value ?? '')
  const sourceReference = String(row.sourceReference ?? '')
  if (label.length > limits.labelMax || value.length > limits.valueMax) return true
  if (sourceReference.length > limits.urlMax) return true
  if (String(sourceReference ?? '').trim() !== '' && !isValidSourceUrl(sourceReference)) return true
  return false
}

/**
 * @param {CustomAttributeRow[]} rows
 * @param {{ labelMax: number; valueMax: number; urlMax: number }} limits
 */
export function customAttributesEditorHasErrors(rows, limits) {
  return rows.some((row) => customAttributeRowHasErrors(row, limits))
}
