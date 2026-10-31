import { createApp, createError, createRouter, defineEventHandler, setResponseHeader, toPlainHandler } from 'h3'
import type { H3Event } from 'h3'
import { createHooks } from 'hookable'
import { describe, expect, it, vi } from 'vitest'
import plugin from '~~/server/plugins/redirect-errors'

/**
 * nuxt-ai-ready answers a `.md` request whose page redirects by setting
 * `Location` and returning `createError({ statusCode: 301 })`. That is a
 * redirect: answered as one, with no error body, and never reported to
 * Nitro's error capture (which is what logs a server error).
 */
async function answer(handler: (event: H3Event) => unknown, path = '/page.md') {
  const handleError = vi.fn(() => 'the error page')
  const app = createApp({ onError: handleError })
  await plugin({ hooks: createHooks(), h3App: app } as never)
  const router = createRouter()
  router.add('/page.md', defineEventHandler(handler))
  app.use(router)

  const response = await toPlainHandler(app)({ method: 'GET', path, headers: {} })
  return { response, handleError }
}

const redirectingTo = (location: string, statusCode: number) => (event: H3Event) => {
  setResponseHeader(event, 'location', location)
  // As the module does: the internal fetch's `statusText` is empty.
  return createError({ statusCode, statusMessage: '' })
}

describe('server/plugins/redirect-errors', () => {
  it.each([301, 302, 307, 308])('answers a %s carried as an error as the redirect it is', async (statusCode) => {
    const { response, handleError } = await answer(redirectingTo('/blog/post/10/canonical.md?page=2', statusCode))

    expect(response.status).toBe(statusCode)
    expect(new Headers(response.headers).get('location')).toBe('/blog/post/10/canonical.md?page=2')
    expect(String(response.body)).not.toContain('Internal Server Error')
    expect(String(response.body)).not.toContain('"error"')
    // Never handed to Nitro's error capture: the hook that logs a server error.
    expect(handleError).not.toHaveBeenCalled()
  })

  it('carries the query of the request over to a redirect that names none', async () => {
    const { response } = await answer(redirectingTo('/blog/post/10/canonical.md', 301), '/page.md?page=2&ref=a')

    expect(new Headers(response.headers).get('location')).toBe('/blog/post/10/canonical.md?page=2&ref=a')
  })

  it('keeps the query a redirect names itself', async () => {
    const { response } = await answer(redirectingTo('/blog/post/10/canonical.md?lang=en', 301), '/page.md?page=2')

    expect(new Headers(response.headers).get('location')).toBe('/blog/post/10/canonical.md?lang=en')
  })

  it('never copies the query of the request to an off-site location', async () => {
    const { response, handleError } = await answer(redirectingTo('https://elsewhere.test/landing', 301), '/page.md?token=secret&page=2')

    expect(response.status).toBe(301)
    expect(new Headers(response.headers).get('location')).toBe('https://elsewhere.test/landing')
    expect(handleError).not.toHaveBeenCalled()
  })

  it('hands a Location that is not a URL to the error handler unchanged', async () => {
    const { handleError } = await answer(redirectingTo('http://', 301))

    expect(handleError).toHaveBeenCalledOnce()
  })

  it('keeps a same-site absolute location absolute', async () => {
    const { response } = await answer(redirectingTo('http://localhost/blog/post/10/canonical.md', 301), '/page.md?page=2')

    expect(new Headers(response.headers).get('location')).toBe('http://localhost/blog/post/10/canonical.md?page=2')
  })

  it('leaves a client error to the error handler', async () => {
    const { handleError } = await answer(() => createError({ statusCode: 404 }))

    expect(handleError).toHaveBeenCalledOnce()
  })

  it('leaves a server error to the error handler, even with a Location header', async () => {
    const { handleError } = await answer((event) => {
      setResponseHeader(event, 'location', '/elsewhere')
      return createError({ statusCode: 502 })
    })

    expect(handleError).toHaveBeenCalledOnce()
  })

  it('leaves a 3xx with no Location to the error handler', async () => {
    const { handleError } = await answer(() => createError({ statusCode: 301 }))

    expect(handleError).toHaveBeenCalledOnce()
  })
})
