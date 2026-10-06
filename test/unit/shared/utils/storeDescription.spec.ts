import { describe, expect, it } from 'vitest'

import { localizedStoreDescription } from '../../../../shared/utils/storeDescription'

const DEFAULT = 'Η περιγραφή του καταστήματος'

describe('localizedStoreDescription', () => {
  it('returns the locale\'s own text when the map carries it', () => {
    expect(localizedStoreDescription({ storeDescription: DEFAULT, storeDescriptionI18n: { en: 'The store\'s description' } }, 'en'))
      .toBe('The store\'s description')
  })

  it('falls back to the default text for a locale the map lacks', () => {
    expect(localizedStoreDescription({ storeDescription: DEFAULT, storeDescriptionI18n: { en: 'English' } }, 'de'))
      .toBe(DEFAULT)
  })

  it('falls back to the default text when there is no map', () => {
    expect(localizedStoreDescription({ storeDescription: DEFAULT }, 'en')).toBe(DEFAULT)
  })

  it('falls back to the default text for a blank entry', () => {
    expect(localizedStoreDescription({ storeDescription: DEFAULT, storeDescriptionI18n: { en: '' } }, 'en')).toBe(DEFAULT)
  })

  it('returns the default text for the default locale, which the map never holds', () => {
    expect(localizedStoreDescription({ storeDescription: DEFAULT, storeDescriptionI18n: { en: 'English' } }, 'el')).toBe(DEFAULT)
  })
})
