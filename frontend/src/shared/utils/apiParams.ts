/**
 * Utility function to build query parameters object, filtering out undefined/null values
 */
export function buildQueryParams(
  params: Record<string, string | number | boolean | string[] | undefined | null>
): Record<string, string | number | boolean | string[]> {
  const result: Record<string, string | number | boolean | string[]> = {}
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      result[key] = value
    }
  }
  
  return result
}
