import type { ISettingsParam } from 'tslog'
import { describe, expect, it } from 'vitest'

import type { Config } from '~/tools/translator/src/types'
import {
  configValidationRules,
  createRule,
  getValue,
  isRegExpArray,
  isString,
  isStringArray,
  validateConfig,
  validateISettingsParam,
  validateRules,
} from '~/tools/translator/src/validator'

describe('translator validator tests', () => {
  const sampleConfig = {
    localePath: './tests/data/locales',
    sourceFileName: 'en-US',
    translate: {
      engine: 'google',
      bundleDelay: 0,
      bundleMaxRetries: 3,
    },
  } as Config<any>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('isStringArray should return true for string arrays', () => {
    expect(isStringArray(['test'])).toBe(true)
  })
  it('isStringArray should return false for non-string arrays', () => {
    expect(isStringArray([1])).toBe(false)
  })
  it('isRegExpArray should return true for RegExp arrays', () => {
    expect(isRegExpArray([/test/])).toBe(true)
  })
  it('isRegExpArray should return false for non-RegExp arrays', () => {
    expect(isRegExpArray([1])).toBe(false)
  })
  it('createRule should create a rule object correctly', () => {
    const rule = createRule('test', [
      { validator: isString, errorMsg: 'Error' },
    ])
    expect(rule).toEqual({
      property: 'test',
      validators: [{ validator: isString, errorMsg: 'Error' }],
      optional: false,
    })
  })
  it('createRule should handle invalid validators gracefully', () => {
    const invalidRule = createRule('test', [
      { validator: null as unknown as (v: any) => boolean, errorMsg: 'Error' },
    ]) as unknown as Partial<Config<any>>
    expect(invalidRule).toEqual({
      property: 'test',
      validators: [{ validator: null, errorMsg: 'Error' }],
      optional: false,
    })
  })
  it('getValue should retrieve nested property values', () => {
    const value = getValue(sampleConfig, 'translate.engine')
    expect(value).toBe('google')
  })
  it('getValue should return undefined for non-existing properties', () => {
    const value = getValue(sampleConfig, 'non.existing.property')
    expect(value).toBeUndefined()
  })
  it('should throw an error for missing required fields', () => {
    const incompleteConfig = {
      ...sampleConfig,
      localePath: undefined,
    } as unknown as Partial<Config<any>>
    expect(() =>
      validateRules(incompleteConfig, configValidationRules),
    ).toThrow()
  })
  it('should throw an error for invalid nested property values', () => {
    const invalidNestedConfig = {
      ...sampleConfig,
      translate: { ...sampleConfig.translate, engine: 123 },
    } as unknown as Partial<Config<any>>
    expect(() =>
      validateRules(invalidNestedConfig, configValidationRules),
    ).toThrow()
  })
  it('should validate a correct configuration without errors', () => {
    expect(() =>
      validateRules(sampleConfig, configValidationRules),
    ).not.toThrow()
  })
  it('should throw an error for an incorrect configuration', () => {
    const invalidConfig = {
      ...sampleConfig,
      translate: { ...sampleConfig.translate, engine: 'invalid' },
    } as unknown as Partial<Config<any>>
    expect(() => validateRules(invalidConfig, configValidationRules)).toThrow()
  })
  it('validateConfig should validate a correct configuration', () => {
    expect(() => validateConfig(sampleConfig)).not.toThrow()
  })
  it('validateConfig should throw an error for an incorrect configuration', () => {
    const invalidConfig = {
      ...sampleConfig,
      debug: { ...sampleConfig.debug, mode: 'unknown' },
    } as unknown as Partial<Config<any>>
    expect(() => validateConfig(invalidConfig)).toThrow()
  })
  it('validateConfig should throw an error for configs missing required properties', () => {
    const missingPropsConfig = { debug: sampleConfig.debug }
    expect(() => validateConfig(missingPropsConfig)).toThrow()
  })
  it('validateISettingsParam should throw an error for invalid settings param', () => {
    const invalidSettingsParam = { type: 'invalidType' } as unknown as Partial<
      ISettingsParam<any>
    >
    expect(() => validateISettingsParam(invalidSettingsParam)).toThrow()
  })
})
