import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearBuilderRecovery, keepBuilderRecovery, readBuilderRecovery } from '~/utils/builderRecovery'

/** A browser storage, as `localStorage` behaves. */
function memoryStorage(): Storage {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: key => items.get(key) ?? null,
    key: index => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key)
    },
    setItem: (key, value) => {
      items.set(key, value)
    },
  }
}

const recovery = {
  revision: 4,
  copy: { draft: { sections: { hero: { type: 'hero_banner@1', settings: { heading: 'Γεια' } } }, order: ['hero'] }, i18n: {} },
  keptAt: '2026-11-02T15:00:00.000Z',
}

describe('the recovery copy', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
  })

  it('keeps a document\'s unsaved changes per store and document, and gives them back', () => {
    keepBuilderRecovery('shop.test', 'template:home', recovery)

    expect(readBuilderRecovery('shop.test', 'template:home')).toEqual(recovery)
    expect(readBuilderRecovery('other.test', 'template:home')).toBeUndefined()
    expect(readBuilderRecovery('shop.test', 'page:about')).toBeUndefined()
  })

  it('forgets them', () => {
    keepBuilderRecovery('shop.test', 'template:home', recovery)

    clearBuilderRecovery('shop.test', 'template:home')

    expect(readBuilderRecovery('shop.test', 'template:home')).toBeUndefined()
  })

  it.each(['not json', JSON.stringify({ revision: 'x' }), JSON.stringify({ ...recovery, copy: { draft: { sections: {}, order: ['gone'] }, i18n: {} } })])(
    'reads nothing from a stored value it cannot use (%s)',
    (stored) => {
      localStorage.setItem('builder-recovery:shop.test:template:home', stored)

      expect(readBuilderRecovery('shop.test', 'template:home')).toBeUndefined()
    },
  )

  it('keeps nothing, and throws nothing, where the browser refuses storage', () => {
    vi.stubGlobal('localStorage', { ...memoryStorage(), setItem: () => {
      throw new DOMException('quota', 'QuotaExceededError')
    }, getItem: () => {
      throw new DOMException('denied', 'SecurityError')
    } })

    expect(() => keepBuilderRecovery('shop.test', 'template:home', recovery)).not.toThrow()
    expect(readBuilderRecovery('shop.test', 'template:home')).toBeUndefined()
  })
})
