/**
 * Helper functions for handling API data transformations
 * These functions help with the transition from nested objects to ID references
 */

import type { Product, PayWayDetail, BlogCategory, BlogAuthor } from '../openapi/types.gen'

/**
 * Cache for fetched objects to avoid duplicate API calls
 */
const objectCache = new Map<string, any>()

/**
 * Helper function to fetch a PayWay by ID
 */
export async function fetchPayWayById(id: number): Promise<PayWayDetail | null> {
  const cacheKey = `payway-${id}`
  if (objectCache.has(cacheKey)) {
    return objectCache.get(cacheKey)
  }

  try {
    const payWay = await $fetch<PayWayDetail>(`/api/pay-way/${id}`)
    objectCache.set(cacheKey, payWay)
    return payWay
  }
  catch (error) {
    console.error('Failed to fetch PayWay:', error)
    return null
  }
}

/**
 * Helper function to fetch a Product by ID
 */
export async function fetchProductById(id: number): Promise<Product | null> {
  const cacheKey = `product-${id}`
  if (objectCache.has(cacheKey)) {
    return objectCache.get(cacheKey)
  }

  try {
    const product = await $fetch<Product>(`/api/products/${id}`)
    objectCache.set(cacheKey, product)
    return product
  }
  catch (error) {
    console.error('Failed to fetch Product:', error)
    return null
  }
}

/**
 * Helper function to fetch a BlogCategory by ID
 */
export async function fetchBlogCategoryById(id: number): Promise<BlogCategory | null> {
  const cacheKey = `blog-category-${id}`
  if (objectCache.has(cacheKey)) {
    return objectCache.get(cacheKey)
  }

  try {
    const category = await $fetch<BlogCategory>(`/api/blog/categories/${id}`)
    objectCache.set(cacheKey, category)
    return category
  }
  catch (error) {
    console.error('Failed to fetch BlogCategory:', error)
    return null
  }
}

/**
 * Helper function to fetch a BlogAuthor by ID
 */
export async function fetchBlogAuthorById(id: number): Promise<BlogAuthor | null> {
  const cacheKey = `blog-author-${id}`
  if (objectCache.has(cacheKey)) {
    return objectCache.get(cacheKey)
  }

  try {
    const author = await $fetch<BlogAuthor>(`/api/blog/authors/${id}`)
    objectCache.set(cacheKey, author)
    return author
  }
  catch (error) {
    console.error('Failed to fetch BlogAuthor:', error)
    return null
  }
}

/**
 * Type guard to check if a value is an ID (number) or an object
 */
export function isId(value: any): value is number {
  return typeof value === 'number'
}

/**
 * Type guard to check if a value is an object with an id property
 */
export function isObjectWithId(value: any): value is { id: number } {
  return value && typeof value === 'object' && typeof value.id === 'number'
}
