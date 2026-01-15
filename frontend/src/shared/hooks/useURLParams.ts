import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'

interface UseURLParamsConfig<T> {
  defaults: T
  serialize: (state: T) => URLSearchParams
  deserialize: (params: URLSearchParams) => Partial<T>
}

/**
 * Hook to synchronize component state with URL search parameters.
 * Handles bidirectional sync: URL -> state (browser navigation) and state -> URL (user actions).
 * Prevents infinite loops using ref-based sync detection.
 */
export function useURLParams<T extends Record<string, any>>(
  config: UseURLParamsConfig<T>
): [T, (updates: Partial<T>) => void] {
  const { defaults, serialize, deserialize } = config
  const [searchParams, setSearchParams] = useSearchParams()
  const isSyncingFromUrlRef = useRef(false)

  // Initialize state from URL params or defaults
  const [state, setState] = useState<T>(() => {
    const urlParams = deserialize(searchParams)
    return { ...defaults, ...urlParams } as T
  })

  // Sync state from URL params when they change (e.g., browser back/forward)
  useEffect(() => {
    const urlParams = deserialize(searchParams)
    const currentState = state

    // Check if any values need updating
    const needsUpdate = Object.keys(urlParams).some(key => {
      const urlValue = urlParams[key as keyof T]
      const currentValue = currentState[key as keyof T]
      return urlValue !== currentValue
    })

    if (!needsUpdate) {
      return
    }

    // Set flag BEFORE updating state to prevent other effects from running
    isSyncingFromUrlRef.current = true

    // Merge URL params with defaults and update state
    setState(prev => ({ ...prev, ...urlParams } as T))

    // Reset the flag after state updates and effects complete
    setTimeout(() => {
      isSyncingFromUrlRef.current = false
    }, 100)
  }, [searchParams, defaults, deserialize])

  // Update URL params when state changes
  useEffect(() => {
    // Don't update URL if we're currently syncing from URL
    if (isSyncingFromUrlRef.current) {
      return
    }

    const params = serialize(state)

    // Only update if params actually changed to avoid infinite loops
    const currentParams = searchParams.toString()
    const newParams = params.toString()

    if (currentParams !== newParams) {
      setSearchParams(params, { replace: true })
    }
  }, [state, serialize, searchParams, setSearchParams])

  // Update function that merges partial updates
  const updateState = (updates: Partial<T>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  return [state, updateState]
}
