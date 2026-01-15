import { useState, useCallback } from 'react'

interface UseTableSelectionOptions<T extends { id: number }> {
  items: T[]
  initialSelection?: Set<number>
}

/**
 * Hook to manage table row selection state
 */
export function useTableSelection<T extends { id: number }>(
  options: UseTableSelectionOptions<T>
) {
  const { items, initialSelection = new Set() } = options
  const [selectedIds, setSelectedIds] = useState<Set<number>>(initialSelection)

  const isSelected = useCallback(
    (id: number) => selectedIds.has(id),
    [selectedIds]
  )

  const allSelected = items.length > 0 && items.every(item => isSelected(item.id))
  const someSelected = items.some(item => isSelected(item.id))

  const handleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(item => item.id)))
    }
  }, [allSelected, items])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  return {
    selectedIds,
    setSelectedIds,
    isSelected,
    allSelected,
    someSelected,
    handleSelect,
    handleSelectAll,
    clearSelection,
  }
}
