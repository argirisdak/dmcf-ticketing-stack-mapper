import { useEffect, useRef, useState } from 'react'
import { useSystem } from '../hooks/useSystem.js'
import { useSystemSearch } from '../hooks/useSystemSearch.js'

const CATEGORY_TOKENS = {
  INTEGRATED: 'bg-blue-50 text-blue-700 border border-blue-200',
  TICKETING: 'bg-amber-50 text-amber-700 border border-amber-200',
  AUDIENCE_MANAGEMENT: 'bg-purple-50 text-purple-700 border border-purple-200',
}

function humaniseCategory(cat) {
  if (!cat) return ''
  return cat
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/, (c) => c.toUpperCase())
}

const INPUT_CLASS =
  'w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

/**
 * @param {{
 *   selectedId: string | null
 *   onSelect: (system: { id: string; name: string; category: string } | null) => void
 *   placeholder?: string
 *   inputId?: string
 * }} props
 */
export function SystemCombobox({
  selectedId,
  onSelect,
  placeholder = 'Search by adopted system…',
  inputId = 'filter-adopted-system',
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [mode, setMode] = useState(/** @type {'displaying' | 'searching'} */ (selectedId ? 'displaying' : 'searching'))

  const wrapperRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null))

  const { data: selectedSystemData } = useSystem(selectedId)
  const selectedName = selectedSystemData?.data?.name ?? null

  const { systems, isLoading, isError } = useSystemSearch(searchTerm)

  // When selectedId changes externally (e.g. browser back), sync mode.
  // selectedId is derived from the URL (router external state) — same pattern as OrganisationListSearchInput.
  useEffect(() => {
    if (selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- router URL is external state
      setMode('displaying')
      setSearchTerm('')
    } else {
      setMode('searching')
    }
  }, [selectedId])

  // Click-outside closes dropdown
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const inputValue = mode === 'displaying' ? (selectedName ?? '') : searchTerm

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value)
    setIsOpen(true)
    setActiveIndex(-1)
  }

  const handleInputFocus = () => {
    if (mode === 'displaying') {
      setMode('searching')
      setSearchTerm('')
    }
    setIsOpen(true)
  }

  const selectSystem = (system) => {
    onSelect({ id: system.id, name: system.name, category: system.category })
    setMode('displaying')
    setSearchTerm('')
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const clearSystem = () => {
    onSelect(null)
    setMode('searching')
    setSearchTerm('')
    setIsOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        if (mode === 'displaying') {
          setMode('searching')
          setSearchTerm('')
        }
        setIsOpen(true)
        setActiveIndex(0)
        e.preventDefault()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, systems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && systems[activeIndex]) {
        selectSystem(systems[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    } else if (e.key === 'Tab') {
      setIsOpen(false)
    }
  }

  const showDropdown = isOpen && mode === 'searching'
  const debouncedNonEmpty = searchTerm.trim().length > 0

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className={INPUT_CLASS}
          placeholder={mode === 'displaying' ? '' : placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="system-combobox-listbox"
          aria-activedescendant={
            showDropdown && activeIndex >= 0 ? `system-combobox-option-${activeIndex}` : undefined
          }
          autoComplete="off"
        />
        {selectedId && (
          <button
            type="button"
            onClick={clearSystem}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-slate-400 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Clear adopted system filter"
          >
            ×
          </button>
        )}
      </div>

      {showDropdown && (
        <ul
          id="system-combobox-listbox"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {isError && debouncedNonEmpty ? (
            <li className="px-3 py-2 text-sm text-red-700">Could not search systems. Try again.</li>
          ) : isLoading && debouncedNonEmpty ? (
            <li className="px-3 py-2 text-sm text-slate-400">Searching…</li>
          ) : systems.length === 0 && debouncedNonEmpty ? (
            <li className="px-3 py-2 text-sm text-slate-400">
              No systems found for &lsquo;{searchTerm}&rsquo;
            </li>
          ) : (
            systems.map((system, idx) => (
              <li
                key={system.id}
                id={`system-combobox-option-${idx}`}
                role="option"
                aria-selected={activeIndex === idx}
                className={`flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer ${
                  activeIndex === idx ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectSystem(system)
                }}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <span className="font-medium text-slate-900">{system.name}</span>
                {system.category && (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                      CATEGORY_TOKENS[system.category] ?? 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {humaniseCategory(system.category)}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
