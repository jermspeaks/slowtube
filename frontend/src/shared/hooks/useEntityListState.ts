import { useState, useCallback } from 'react'

interface UseEntityListStateOptions<T extends { id: number }> {
  onStateChange?: (updated: T) => void | Promise<void>
}

/**
 * Hook to manage a list of entities with selected item state.
 * Provides handlers for updating items in the list and syncing with selected item.
 */
export function useEntityListState<T extends { id: number }>(
  options?: UseEntityListStateOptions<T>
) {
  const { onStateChange } = options || {}
  const [items, setItems] = useState<T[]>([])
  const [selectedItem, setSelectedItem] = useState<T | null>(null)

  const handleItemUpdated = useCallback(
    (updated: T) => {
      setItems(prev => prev.map(item => item.id === updated.id ? updated : item))
      if (selectedItem?.id === updated.id) {
        setSelectedItem(updated)
      }
    },
    [selectedItem]
  )

  const handleStateChange = useCallback(
    async (updated: T) => {
      // Update the item in the list
      setItems(prev => prev.map(item => item.id === updated.id ? updated : item))
      // If the item is selected, update it too
      if (selectedItem?.id === updated.id) {
        setSelectedItem(updated)
      }
      // Call optional callback (e.g., to reload data)
      if (onStateChange) {
        await onStateChange(updated)
      }
    },
    [selectedItem, onStateChange]
  )

  return {
    items,
    setItems,
    selectedItem,
    setSelectedItem,
    handleItemUpdated,
    handleStateChange,
  }
}
