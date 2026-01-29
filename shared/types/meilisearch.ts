/**
 * Meilisearch facet helper types
 *
 * These types provide proper typing for facetDistribution
 * which is returned as `unknown` in the auto-generated OpenAPI types.
 *
 * Note: The main ProductMeiliSearchResponse and ProductMeiliSearchResult types
 * come from auto-generated OpenAPI types in shared/openapi/types.gen.ts
 * FacetStats is also auto-generated from OpenAPI.
 */

/**
 * Meilisearch facet distribution types
 * Maps facet field names to their value counts
 *
 * @example
 * {
 *   category: {
 *     'Electronics': 45,
 *     'Clothing': 32
 *   }
 * }
 */
export interface FacetDistribution {
  category?: {
    [categoryId: string]: number
  }
  [facetName: string]: {
    [facetValue: string]: number
  } | undefined
}
