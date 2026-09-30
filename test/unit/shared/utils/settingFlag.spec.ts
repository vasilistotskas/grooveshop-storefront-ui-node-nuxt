import { describe, expect, it } from 'vitest'
import { parseSettingFlag } from '~~/shared/utils/settingFlag'

describe('parseSettingFlag', () => {
  it.each([
    ['True', true],
    ['true', true],
    ['  TRUE ', true],
    ['1', true],
    ['yes', true],
    ['Yes', true],
    ['False', false],
    ['0', false],
    ['no', false],
    ['', false],
    ['on', false],
  ])('reads %j as %s whatever the fallback', (raw, expected) => {
    expect(parseSettingFlag(raw, true)).toBe(expected)
    expect(parseSettingFlag(raw, false)).toBe(expected)
  })

  it.each([true, false])('returns the caller\'s fallback (%s) when there is no row', (fallback) => {
    expect(parseSettingFlag(undefined, fallback)).toBe(fallback)
  })
})
