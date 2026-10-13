import { describe, expect, it, vi } from 'vitest'
import {
  MAX_CLIENT_ERROR_REPORTS,
  MAX_ERROR_MESSAGE_LENGTH,
  MAX_ERROR_STACK_FRAMES,
  createClientErrorReporter,
  isChunkLoadError,
  serializeClientError,
} from '~/utils/clientErrors'
import type { ClientErrorLevel, ClientErrorReport } from '~/utils/clientErrors'

function sender() {
  return vi.fn<(level: ClientErrorLevel, report: ClientErrorReport) => void>()
}

/**
 * Browser errors reach the logs once each, with their content: one error
 * can hit several hooks, a failing render repeats, a page must not spend
 * the ingest route's rate limit on one fault, and a native Error is `{}`
 * once JSON-encoded unless it is turned into plain data first.
 */
describe('serializeClientError', () => {
  it('keeps the name, message and stack of a native Error', () => {
    const serialized = serializeClientError(new TypeError('cart is undefined'))

    expect(serialized).toMatchObject({ name: 'TypeError', message: 'cart is undefined' })
    expect(serialized.stack).toContain('cart is undefined')
    expect(JSON.parse(JSON.stringify(serialized))).toEqual(serialized)
  })

  it('bounds the stack to the first frames', () => {
    const error = new Error('deep')
    error.stack = ['Error: deep', ...Array.from({ length: 50 }, (_, i) => `    at fn${i} (https://x.test/a.js:1:${i})`)].join('\n')

    const lines = serializeClientError(error).stack!.split('\n')

    expect(lines).toHaveLength(MAX_ERROR_STACK_FRAMES + 1)
    expect(lines.at(-1)).toContain(`fn${MAX_ERROR_STACK_FRAMES - 1}`)
  })

  it('bounds the message', () => {
    expect(serializeClientError(new Error('x'.repeat(10_000))).message).toHaveLength(MAX_ERROR_MESSAGE_LENGTH)
  })

  it('keeps the status of a NuxtError-like error and nothing else', () => {
    const error = Object.assign(new Error('Page not found'), { statusCode: 404, statusMessage: 'Not Found', data: { secret: 'x' } })

    const serialized = serializeClientError(error)

    expect(serialized).toMatchObject({ message: 'Page not found', statusCode: 404, statusMessage: 'Not Found' })
    expect(serialized).not.toHaveProperty('data')
  })

  it('reads a plain error-like object (a hydrated payload error)', () => {
    expect(serializeClientError({ message: 'Boom', statusCode: 500 })).toEqual({ message: 'Boom', statusCode: 500 })
  })

  it('wraps a string', () => {
    expect(serializeClientError('network down')).toEqual({ message: 'network down' })
  })

  it('describes an unknown object and a nullish value', () => {
    expect(serializeClientError({ code: 7 })).toEqual({ message: '{"code":7}' })
    expect(serializeClientError(undefined)).toEqual({ message: 'undefined' })
  })

  it('survives a circular object', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular

    const serialized = serializeClientError(circular)

    expect(serialized.message).toBe('[object Object]')
    expect(() => JSON.stringify(serialized)).not.toThrow()
  })

  it('drops query strings and fragments from URLs in the message and stack', () => {
    const error = new Error('Failed to load https://shop.test/api/cart?token=abc123#frag now')
    error.stack = 'Error: x\n    at f (https://shop.test/_nuxt/a.js?v=secret:1:2)'

    const serialized = serializeClientError(error)

    expect(serialized.message).toBe('Failed to load https://shop.test/api/cart now')
    expect(serialized.stack).toBe('Error: x\n    at f (https://shop.test/_nuxt/a.js:1:2)')
  })
})

describe('isChunkLoadError', () => {
  it.each([
    ['Chrome', 'Failed to fetch dynamically imported module: https://webside.gr/_nuxt/_n9QJarV-bb04afbc.js'],
    ['Firefox', 'error loading dynamically imported module: https://webside.gr/_nuxt/a.js'],
    ['Safari', 'Importing a module script failed.'],
    ['Vite CSS preload', 'Unable to preload CSS for /_nuxt/entry.css'],
    ['webpack', 'Loading chunk 12 failed.'],
  ])('recognises %s', (_browser, message) => {
    expect(isChunkLoadError({ message })).toBe(true)
  })

  it('recognises a ChunkLoadError by name', () => {
    expect(isChunkLoadError({ name: 'ChunkLoadError', message: 'anything' })).toBe(true)
  })

  it('does not treat ordinary errors as chunk errors', () => {
    expect(isChunkLoadError({ name: 'TypeError', message: 'cart is undefined' })).toBe(false)
    expect(isChunkLoadError({ message: 'Failed to fetch' })).toBe(false)
  })
})

describe('createClientErrorReporter', () => {
  it('sends a plain-data report tagged with where the error surfaced, with Vue hint', () => {
    const send = sender()

    createClientErrorReporter(send)('vue-error', new TypeError('cart is undefined'), 'render function')

    expect(send).toHaveBeenCalledExactlyOnceWith('error', {
      action: 'client:vue-error',
      error: expect.objectContaining({ name: 'TypeError', message: 'cart is undefined' }),
      info: 'render function',
    })
  })

  it('reports a real error at error level, whichever hook', () => {
    const send = sender()
    const report = createClientErrorReporter(send)

    report('window-error', new Error('a'))
    report('unhandled-rejection', 'b')
    report('app-error', { message: 'c', statusCode: 500 })

    expect(send.mock.calls.map(([level]) => level)).toEqual(['error', 'error', 'error'])
  })

  it('reports a chunk download failure at warn level, from any hook', () => {
    const send = sender()
    const report = createClientErrorReporter(send)

    report('chunk-error', new Error('boom'))
    report('vue-error', new TypeError('Failed to fetch dynamically imported module: https://x.test/a.js'), 'https://vuejs.org/error-reference/#runtime-13')
    report('app-error', { message: 'Importing a module script failed.', statusCode: 500 })

    expect(send.mock.calls.map(([level]) => level)).toEqual(['warn', 'warn', 'warn'])
  })

  it('reports the same error once, whichever hooks it reaches', () => {
    const send = sender()
    const report = createClientErrorReporter(send)
    const error = new Error('mount failed')

    report('vue-error', error)
    report('app-error', error)
    report('vue-error', error)

    expect(send).toHaveBeenCalledOnce()
  })

  it('treats errors with different messages as distinct', () => {
    const send = sender()
    const report = createClientErrorReporter(send)

    report('window-error', new Error('first'))
    report('window-error', new Error('second'))
    report('unhandled-rejection', 'network down')

    expect(send.mock.calls.map(([, entry]) => entry.action)).toEqual([
      'client:window-error',
      'client:window-error',
      'client:unhandled-rejection',
    ])
  })

  it('stops after the per-page cap of distinct reports', () => {
    const send = sender()
    const report = createClientErrorReporter(send)

    for (let i = 0; i < MAX_CLIENT_ERROR_REPORTS + 5; i++) {
      report('window-error', new Error(`error ${i}`))
    }

    expect(send).toHaveBeenCalledTimes(MAX_CLIENT_ERROR_REPORTS)
  })
})
