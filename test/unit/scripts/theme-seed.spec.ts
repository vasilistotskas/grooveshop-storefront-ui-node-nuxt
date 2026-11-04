import { describe, expect, it } from 'vitest'
import { seedThemes } from '~~/scripts/theme-seed.mjs'
import { seedThemeSettings } from '~~/shared/theme/seed'

const fields = (schemaName: string) => ({
  schemaName,
  themePreset: 'default',
  primaryColor: 'neutral',
  neutralColor: 'zinc',
  accentHex: '#003DFF',
  successHex: '#16a34a',
  warningHex: '#ca8a04',
  errorHex: '#dc2626',
  infoHex: '#2563eb',
  themeMetadata: null,
})

describe('theme-seed', () => {
  it('writes each store of the export its seeded theme, by its schema', () => {
    const themes = seedThemes({ stores: [{ schema: 'webside', fields: fields('webside') }, { schema: 'demo', fields: fields('demo') }] })

    expect(themes).toEqual({
      stores: [
        { schema: 'webside', settings: seedThemeSettings(fields('webside')) },
        { schema: 'demo', settings: seedThemeSettings(fields('demo')) },
      ],
    })
  })

  it('stops on a store whose fields name another store', () => {
    expect(() => seedThemes({ stores: [{ schema: 'demo', fields: fields('webside') }] })).toThrow('demo: its fields name the store "webside"')
  })

  it('stops on an export that is not one, writing nothing for any store', () => {
    expect(() => seedThemes({ stores: [{ schema: 'demo', fields: { schemaName: 'demo' } }] })).toThrow()
    expect(() => seedThemes({ stores: [] })).toThrow()
  })
})
