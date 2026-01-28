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
  const lastSerializedStateRef = useRef<string>('')
  const currentStateRef = useRef<T | null>(null)
  const pendingStateUpdateRef = useRef(false)

  // Initialize state from URL params or defaults
  const [state, setState] = useState<T>(() => {
    const urlParams = deserialize(searchParams)
    const initialState = { ...defaults, ...urlParams } as T
    currentStateRef.current = initialState
    return initialState
  })

  // Sync state from URL params when they change (e.g., browser back/forward)
  useEffect(() => {
    const urlParams = deserialize(searchParams)
    const currentState = currentStateRef.current!

    // Check if URL params match what current state would serialize to
    // This prevents syncing from stale URL params during state updates
    const expectedParams = serialize(currentState)
    const expectedParamsStr = expectedParams.toString()
    const currentParamsStr = searchParams.toString()
    
    // If URL matches what current state would serialize to, don't sync (URL is up-to-date or will be updated soon)
    // Also check against last serialized state to handle race conditions
    // If there's a pending state update, don't sync from URL (user just changed state, URL hasn't caught up yet)
    if (currentParamsStr === expectedParamsStr || currentParamsStr === lastSerializedStateRef.current || pendingStateUpdateRef.current) {
      return
    }

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
    setState(prev => {
      const newState = { ...prev, ...urlParams } as T
      currentStateRef.current = newState
      return newState
    })

    // Reset the flag after state updates and effects complete
    setTimeout(() => {
      isSyncingFromUrlRef.current = false
    }, 100)
  }, [searchParams, defaults, deserialize, serialize])

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
      lastSerializedStateRef.current = newParams
      pendingStateUpdateRef.current = false
      setSearchParams(params, { replace: true })
    } else {
      // Update ref even if params didn't change (to track current state)
      lastSerializedStateRef.current = newParams
      pendingStateUpdateRef.current = false
    }
  }, [state, serialize, searchParams, setSearchParams])

  // Update function that merges partial updates
  const updateState = (updates: Partial<T>) => {
    // Mark that we have a pending state update to prevent URL sync from overriding it
    pendingStateUpdateRef.current = true
    setState(prev => {
      const newState = { ...prev, ...updates } as T
      currentStateRef.current = newState
      return newState
    })
  }

  return [state, updateState]
}
