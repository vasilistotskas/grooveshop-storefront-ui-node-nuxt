import { describe, expect, it } from 'vitest'
import { isChunkLoadMessage, isNoResponseMessage } from '~~/shared/utils/connectionFailure'

describe('shared/utils/connectionFailure', () => {
  it.each(['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.', 'A network error occurred.', '  load failed  '])(
    'reads "%s" as a fetch with no response',
    (message) => {
      expect(isNoResponseMessage(message)).toBe(true)
    },
  )

  it('wants the whole message, not a mention of one', () => {
    expect(isNoResponseMessage('cart: Failed to fetch the totals')).toBe(false)
  })

  it.each([
    'Failed to fetch dynamically imported module: https://shop.test/_nuxt/a.js',
    'error loading dynamically imported module',
    'Importing a module script failed.',
    'Unable to preload CSS for /_nuxt/a.css',
    'Loading chunk 42 failed.',
  ])('reads "%s" as a chunk download failure', (message) => {
    expect(isChunkLoadMessage(message)).toBe(true)
  })

  it('does not read a plain bug as a connection failure', () => {
    const message = 'Cannot read properties of undefined (reading \'id\')'

    expect(isNoResponseMessage(message)).toBe(false)
    expect(isChunkLoadMessage(message)).toBe(false)
  })
})
