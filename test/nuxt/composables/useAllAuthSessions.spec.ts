import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
const { onResponse, onResponseError } = vi.hoisted(() => ({
  onResponse: vi.fn((..._args: unknown[]) => Promise.resolve()),
  onResponseError: vi.fn((..._args: unknown[]) => Promise.resolve()),
}))

mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('onAllAuthResponse', () => onResponse)
mockNuxtImport('onAllAuthResponseError', () => onResponseError)

const OK = { status: 200, _data: { status: 200, data: [] } }
const GONE = { status: 410, _data: { data: { status: 410 } } }

/**
 * ofetch calls `onResponse` / `onResponseError` itself; the mock plays
 * that part so a spec can see what the wrapper forwards from each.
 */
function answerWithHooks(body: unknown) {
  api.mockImplementation(async (_url, options) => {
    await options?.onResponse?.({ response: OK })
    await options?.onResponseError?.({ response: GONE })
    return body
  })
}

type Sessions = ReturnType<typeof useAllAuthSessions>

describe('useAllAuthSessions', () => {
  beforeEach(() => {
    answerWithHooks({ status: 200, data: [] })
  })

  it.each<[string, (s: Sessions) => Promise<unknown>, string, Record<string, unknown>]>([
    ['getSessions', s => s.getSessions(), 'GET', {}],
    ['deleteSession', s => s.deleteSession({ sessions: [123] }), 'DELETE', { body: { sessions: [123] } }],
  ])('%s sends %s /auth/sessions and hands allauth\'s answers to the auth pipeline', async (_name, call, method, extra) => {
    const body = { status: 200, data: [{ id: 1 }] }
    answerWithHooks(body)

    const result = await call(useAllAuthSessions())

    expect(api.callsTo('/api/_allauth/app/v1/auth/sessions')).toEqual([
      { url: '/api/_allauth/app/v1/auth/sessions', options: expect.objectContaining({ method, ...extra }) },
    ])
    expect(result).toEqual(body)
    expect(onResponse).toHaveBeenCalledWith(OK)
    expect(onResponseError).toHaveBeenCalledWith(GONE)
  })

  it('rejects with the request error after the error hook has seen it', async () => {
    const failure = new Error('Not Found')
    api.mockImplementation(async (_url, options) => {
      await options?.onResponseError?.({ response: GONE })
      throw failure
    })

    await expect(useAllAuthSessions().deleteSession({ sessions: [999] })).rejects.toBe(failure)
    expect(onResponseError).toHaveBeenCalledWith(GONE)
  })
})
