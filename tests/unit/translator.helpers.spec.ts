import { describe, expect, it, vi } from 'vitest'

import {
  delay,
  extractDynamicKeys,
  getISO6391Code,
  retry,
  validateDynamicKeys,
} from '~/tools/translator/src/helpers'

describe('translator helpers retry tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('should successfully complete on the second attempt', async () => {
    const func = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed on first attempt')) // First call fails
      .mockResolvedValue('Success on second attempt') // Second call succeeds

    const result = await retry(func, 2, 100)

    expect(result).toBe('Success on second attempt')
    expect(func).toHaveBeenCalledTimes(2)
  })
  it('should successfully complete on the third attempt', async () => {
    const func = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed on first attempt')) // First call fails
      .mockRejectedValueOnce(new Error('Failed on second attempt')) // Second call fails
      .mockResolvedValue('Success on third attempt') // Third call succeeds

    const result = await retry(func, 3, 100)

    expect(result).toBe('Success on third attempt')
    expect(func).toHaveBeenCalledTimes(3)
  })
  it('retry should eventually throw an error after maximum retries', async () => {
    const failingFunction = vi.fn().mockRejectedValue(new Error('Failed'))
    await expect(retry(failingFunction, 3, 100)).rejects.toThrow('Failed')
    expect(failingFunction).toHaveBeenCalledTimes(3)
  })
})

describe('translator helpers getISO6391Code tests', () => {
  it('should correctly parse standard locale formats', () => {
    expect(getISO6391Code('en-US')).toBe('en')
    expect(getISO6391Code('en-GB')).toBe('en')
    expect(getISO6391Code('el-GR')).toBe('el')
    expect(getISO6391Code('fr-FR')).toBe('fr')
  })
  it('should handle locales without a region', () => {
    expect(getISO6391Code('es')).toBe('es')
    expect(getISO6391Code('el')).toBe('el')
  })
  it('should handle case variations', () => {
    expect(getISO6391Code('En-uS')).toBe('en')
    expect(getISO6391Code('FR-fr')).toBe('fr')
    expect(getISO6391Code('EL-gr')).toBe('el')
  })
  it('should return empty string or handle appropriately for invalid input', () => {
    expect(getISO6391Code('')).toBe('')
    expect(getISO6391Code('123')).toBe('')
  })
})

describe('translator helpers extractDynamicKeys tests', () => {
  it('should extract multiple dynamic keys from a string', () => {
    const str = 'Hello %{name}, your order %{order_id} is ready.'
    expect(extractDynamicKeys(str)).toEqual(['%{name}', '%{order_id}'])
  })
  it('should return an empty array for strings without dynamic keys', () => {
    const str = 'Hello, your order is ready.'
    expect(extractDynamicKeys(str)).toEqual([])
  })
  it('should correctly ignore special characters outside dynamic keys', () => {
    const str = 'Your %{order_status} order for %{item_name}!'
    expect(extractDynamicKeys(str)).toEqual(['%{order_status}', '%{item_name}'])
  })
})

describe('translator helpers validateDynamicKeys tests', () => {
  it('should return true for strings with matching dynamic keys', () => {
    const original = 'Hello %{name}, your order %{order_id} is ready.'
    const translated = 'Hola %{name}, tu pedido %{order_id} está listo.'
    expect(validateDynamicKeys(original, translated)).toBe(true)
  })
  it('should return false for strings with mismatching dynamic keys', () => {
    const original = 'Hello %{name}, your order %{order_id} is ready.'
    const translated = 'Hola %{username}, tu pedido %{order_id} está listo.'
    expect(validateDynamicKeys(original, translated)).toBe(false)
  })
  it('should return false if the translated string has extra dynamic keys', () => {
    const original = 'Hello %{name}, your order is ready.'
    const translated = 'Hola %{name}, tu pedido %{order_id} está listo.'
    expect(validateDynamicKeys(original, translated)).toBe(false)
  })
  it('should return true for strings without dynamic keys', () => {
    const original = 'Hello, your order is ready.'
    const translated = 'Hola, tu pedido está listo.'
    expect(validateDynamicKeys(original, translated)).toBe(true)
  })
  it('should return false if dynamic keys are in a different order', () => {
    const original = 'Hello %{name}, your order %{order_id} is ready.'
    const translated = 'Hola %{order_id}, tu pedido %{name} está listo.'
    expect(validateDynamicKeys(original, translated)).toBe(false)
  })
})

describe('translator helpers delay tests', () => {
  it('should delay for the specified time', async () => {
    const start = Date.now()
    await delay(500)
    const end = Date.now()
    expect(end - start).toBeGreaterThanOrEqual(500 - 10) // Allow for 10ms error
  })
})
