import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { parseDataAs } from '../../../../server/utils/parser'

describe('Server Utils - Parser', () => {
  beforeEach(() => {
    // Clear any mocks
  })

  describe('parseDataAs', () => {
    const testSchema = z.object({
      id: z.number(),
      name: z.string(),
      email: z.string().email(),
    })

    describe('Success Cases', () => {
      it('should parse valid data', async () => {
        const data = {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
        }

        const result = await parseDataAs(data, testSchema)

        expect(result).toEqual(data)
      })

      it('should parse data from promise', async () => {
        const dataPromise = Promise.resolve({
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
        })

        const result = await parseDataAs(dataPromise, testSchema)

        expect(result).toEqual({
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
        })
      })

      it('should coerce types when possible', async () => {
        const data = {
          id: '1', // String that can be coerced to number
          name: 'John Doe',
          email: 'john@example.com',
        }

        const coerceSchema = z.object({
          id: z.coerce.number(),
          name: z.string(),
          email: z.string().email(),
        })

        const result = await parseDataAs(data, coerceSchema)

        expect(result.id).toBe(1)
        expect(typeof result.id).toBe('number')
      })

      it('should handle nested objects', async () => {
        const nestedSchema = z.object({
          user: z.object({
            id: z.number(),
            name: z.string(),
          }),
          metadata: z.object({
            created: z.string(),
          }),
        })

        const data = {
          user: {
            id: 1,
            name: 'John',
          },
          metadata: {
            created: '2024-01-01',
          },
        }

        const result = await parseDataAs(data, nestedSchema)

        expect(result).toEqual(data)
      })

      it('should handle arrays', async () => {
        const arraySchema = z.array(z.object({
          id: z.number(),
          name: z.string(),
        }))

        const data = [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ]

        const result = await parseDataAs(data, arraySchema)

        expect(result).toEqual(data)
      })

      it('should strip unknown fields by default', async () => {
        const data = {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          unknownField: 'should be removed',
        }

        const result = await parseDataAs(data, testSchema)

        expect(result).toEqual({
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
        })
        expect(result).not.toHaveProperty('unknownField')
      })
    })

    describe('Error Cases', () => {
      it('should throw error for invalid data type', async () => {
        const data = {
          id: 'not a number',
          name: 'John Doe',
          email: 'john@example.com',
        }

        await expect(parseDataAs(data, testSchema)).rejects.toThrow()
      })

      it('should throw error for missing required field', async () => {
        const data = {
          id: 1,
          name: 'John Doe',
          // email is missing
        }

        await expect(parseDataAs(data, testSchema)).rejects.toThrow()
      })

      it('should throw error for invalid email format', async () => {
        const data = {
          id: 1,
          name: 'John Doe',
          email: 'not-an-email',
        }

        await expect(parseDataAs(data, testSchema)).rejects.toThrow()
      })

      it('should throw error with custom status code', async () => {
        const data = { invalid: 'data' }

        try {
          await parseDataAs(data, testSchema, 400, 'Bad Request')
          expect.fail('Should have thrown an error')
        }
        catch (error: any) {
          expect(error.statusCode).toBe(400)
          expect(error.statusMessage).toBe('Bad Request')
        }
      })

      it('should throw error with default status code 422', async () => {
        const data = { invalid: 'data' }

        try {
          await parseDataAs(data, testSchema)
          expect.fail('Should have thrown an error')
        }
        catch (error: any) {
          expect(error.statusCode).toBe(422)
        }
      })

      it('should throw error with default message', async () => {
        const data = { invalid: 'data' }

        try {
          await parseDataAs(data, testSchema)
          expect.fail('Should have thrown an error')
        }
        catch (error: any) {
          expect(error.statusMessage).toBe('Data parsing failed')
        }
      })

      it('should include validation errors in error data', async () => {
        const data = {
          id: 'not a number',
          name: 123, // Should be string
          email: 'invalid-email',
        }

        try {
          await parseDataAs(data, testSchema)
          expect.fail('Should have thrown an error')
        }
        catch (error: any) {
          expect(error.data).toBeDefined()
          expect(error.data.issues).toBeDefined()
          expect(error.data.issues.length).toBeGreaterThan(0)
        }
      })

      it('should handle rejected promise', async () => {
        const dataPromise = Promise.reject(new Error('Fetch failed'))

        await expect(parseDataAs(dataPromise, testSchema)).rejects.toThrow('Fetch failed')
      })
    })

    describe('Edge Cases', () => {
      it('should handle null data', async () => {
        const nullableSchema = z.object({
          id: z.number(),
        }).nullable()

        const result = await parseDataAs(null, nullableSchema)

        expect(result).toBeNull()
      })

      it('should handle empty object', async () => {
        const emptySchema = z.object({})

        const result = await parseDataAs({}, emptySchema)

        expect(result).toEqual({})
      })

      it('should handle optional fields', async () => {
        const optionalSchema = z.object({
          id: z.number(),
          name: z.string().optional(),
        })

        const data = { id: 1 }

        const result = await parseDataAs(data, optionalSchema)

        expect(result).toEqual({ id: 1 })
      })

      it('should handle default values', async () => {
        const defaultSchema = z.object({
          id: z.number(),
          status: z.string().default('active'),
        })

        const data = { id: 1 }

        const result = await parseDataAs(data, defaultSchema)

        expect(result).toEqual({
          id: 1,
          status: 'active',
        })
      })

      it('should handle union types', async () => {
        const unionSchema = z.object({
          value: z.union([z.string(), z.number()]),
        })

        const stringData = { value: 'test' }
        const numberData = { value: 123 }

        const stringResult = await parseDataAs(stringData, unionSchema)
        const numberResult = await parseDataAs(numberData, unionSchema)

        expect(stringResult.value).toBe('test')
        expect(numberResult.value).toBe(123)
      })

      it('should handle enum types', async () => {
        const enumSchema = z.object({
          status: z.enum(['active', 'inactive', 'pending']),
        })

        const data = { status: 'active' }

        const result = await parseDataAs(data, enumSchema)

        expect(result.status).toBe('active')
      })

      it('should reject invalid enum value', async () => {
        const enumSchema = z.object({
          status: z.enum(['active', 'inactive', 'pending']),
        })

        const data = { status: 'invalid' }

        await expect(parseDataAs(data, enumSchema)).rejects.toThrow()
      })
    })

    describe('Complex Schemas', () => {
      it('should handle deeply nested objects', async () => {
        const deepSchema = z.object({
          level1: z.object({
            level2: z.object({
              level3: z.object({
                value: z.string(),
              }),
            }),
          }),
        })

        const data = {
          level1: {
            level2: {
              level3: {
                value: 'deep',
              },
            },
          },
        }

        const result = await parseDataAs(data, deepSchema)

        expect(result.level1.level2.level3.value).toBe('deep')
      })

      it('should handle array of objects', async () => {
        const arraySchema = z.object({
          items: z.array(z.object({
            id: z.number(),
            name: z.string(),
          })),
        })

        const data = {
          items: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
          ],
        }

        const result = await parseDataAs(data, arraySchema)

        expect(result.items).toHaveLength(2)
        expect(result.items[0].id).toBe(1)
      })

      it('should handle discriminated unions', async () => {
        const discriminatedSchema = z.discriminatedUnion('type', [
          z.object({ type: z.literal('user'), userId: z.number() }),
          z.object({ type: z.literal('admin'), adminId: z.number() }),
        ])

        const userData = { type: 'user', userId: 123 }
        const adminData = { type: 'admin', adminId: 456 }

        const userResult = await parseDataAs(userData, discriminatedSchema)
        const adminResult = await parseDataAs(adminData, discriminatedSchema)

        expect(userResult.type).toBe('user')
        expect(adminResult.type).toBe('admin')
      })
    })
  })
})
