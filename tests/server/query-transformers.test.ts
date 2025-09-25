import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { createQueryCoercionSchema } from '../../server/utils/query-transformers'

describe('Query Transformers', () => {
  it('should coerce string numbers to numbers', () => {
    const originalSchema = z.object({
      pageSize: z.number(),
      page: z.number(),
      name: z.string(),
    })

    const coercedSchema = createQueryCoercionSchema(originalSchema)

    const query = {
      pageSize: '10',
      page: '1',
      name: 'test',
    }

    const result = coercedSchema.parse(query)

    expect(result.pageSize).toBe(10)
    expect(result.page).toBe(1)
    expect(result.name).toBe('test')
  })

  it('should coerce string booleans to booleans', () => {
    const originalSchema = z.object({
      active: z.boolean(),
      featured: z.boolean(),
      name: z.string(),
    })

    const coercedSchema = createQueryCoercionSchema(originalSchema)

    const query = {
      active: 'true',
      featured: 'false',
      name: 'test',
    }

    const result = coercedSchema.parse(query)

    expect(result.active).toBe(true)
    expect(result.featured).toBe(false)
    expect(result.name).toBe('test')
  })

  it('should handle optional fields', () => {
    const originalSchema = z.object({
      pageSize: z.number().optional(),
      name: z.string(),
    })

    const coercedSchema = createQueryCoercionSchema(originalSchema)

    const query = {
      pageSize: '10',
      name: 'test',
    }

    const result = coercedSchema.parse(query)

    expect(result.pageSize).toBe(10)
    expect(result.name).toBe('test')
  })

  it('should handle optional schema wrapper', () => {
    const originalSchema = z.optional(z.object({
      pageSize: z.number(),
      name: z.string(),
    }))

    const coercedSchema = createQueryCoercionSchema(originalSchema)

    const query = {
      pageSize: '10',
      name: 'test',
    }

    const result = coercedSchema.parse(query)

    expect(result.pageSize).toBe(10)
    expect(result.name).toBe('test')
  })

  it('should handle the auto-generated schema structure', () => {
    // This mimics the actual auto-generated schema structure
    const originalSchema = z.optional(z.object({
      page: z.optional(z.number()),
      pageSize: z.optional(z.number()),
      search: z.optional(z.string()),
    }))

    const coercedSchema = createQueryCoercionSchema(originalSchema)

    const query = {
      page: '2',
      pageSize: '10',
      search: 'test',
    }

    const result = coercedSchema.parse(query)

    expect(result.page).toBe(2)
    expect(result.pageSize).toBe(10)
    expect(result.search).toBe('test')
  })

  it('should handle empty query', () => {
    const originalSchema = z.optional(z.object({
      page: z.optional(z.number()),
      pageSize: z.optional(z.number()),
    }))

    const coercedSchema = createQueryCoercionSchema(originalSchema)

    const result = coercedSchema.parse({})

    expect(result).toEqual({})
  })

  it('should handle undefined query', () => {
    const originalSchema = z.optional(z.object({
      page: z.optional(z.number()),
      pageSize: z.optional(z.number()),
    }))

    const coercedSchema = createQueryCoercionSchema(originalSchema)

    const result = coercedSchema.parse(undefined)

    expect(result).toBeUndefined()
  })
})
