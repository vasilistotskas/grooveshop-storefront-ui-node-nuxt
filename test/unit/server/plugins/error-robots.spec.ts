/**
 * @nuxtjs/robots sets `X-Robots-Tag` by path before the render, so an
 * error page for an indexable path carried `index, follow` and no
 * robots meta. Nuxt renders the error page as an internal
 * `/__nuxt_error` request and copies that response's headers onto the
 * outer one, so the plugin marks the INTERNAL render with the module's
 * disabled value (header + meta) on `render:html`.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { getResponseHeader } from 'h3'
import plugin, { isNuxtErrorRender } from '~~/server/plugins/error-robots'
import { createTestEvent, runNitroPlugin, setRuntimeConfig } from '~~/test/helpers/nitro'
import type { TestNitroApp, TestRequest } from '~~/test/helpers/nitro'

let nitroApp: TestNitroApp

async function render(req: TestRequest) {
  const html = { head: [] as string[] }
  const event = createTestEvent(req)
  await nitroApp.hooks.callHook('render:html', html, { event })
  return { head: html.head, header: getResponseHeader(event, 'X-Robots-Tag') }
}

describe('server/plugins/error-robots', () => {
  beforeEach(async () => {
    setRuntimeConfig({ 'nuxt-robots': { header: true, robotsDisabledValue: 'noindex, nofollow' } })
    nitroApp = await runNitroPlugin(plugin)
  })

  it('marks the internal error render with the module disabled value', async () => {
    expect(await render({ url: '/__nuxt_error?url=/blog/post/99999/nope' })).toEqual({
      head: ['<meta name="robots" content="noindex, nofollow">'],
      header: 'noindex, nofollow',
    })
  })

  it('recognises the error render by its request marker too', async () => {
    expect((await render({ url: '/blog/post/99999/nope', headers: { 'x-nuxt-error': 'true' } })).head).toHaveLength(1)
  })

  it('uses whatever the module is configured with, never a value of its own', async () => {
    setRuntimeConfig({ 'nuxt-robots': { robotsDisabledValue: 'none' } })

    expect(await render({ url: '/__nuxt_error' })).toEqual({
      head: ['<meta name="robots" content="none">'],
      header: 'none',
    })
  })

  it('leaves ordinary page renders untouched', async () => {
    expect(await render({ url: '/products' })).toEqual({ head: [], header: undefined })
  })

  it('keeps the meta but skips the header when the module has the header off', async () => {
    setRuntimeConfig({ 'nuxt-robots': { header: false } })

    expect(await render({ url: '/__nuxt_error' })).toEqual({
      head: ['<meta name="robots" content="noindex, nofollow">'],
      header: undefined,
    })
  })

  it('does nothing when the module exposes no disabled value', async () => {
    setRuntimeConfig({ 'nuxt-robots': { robotsDisabledValue: '' } })

    expect(await render({ url: '/__nuxt_error' })).toEqual({ head: [], header: undefined })
  })
})

describe('isNuxtErrorRender', () => {
  it.each([
    ['/__nuxt_error?url=%2Fx', true],
    ['/__nuxt_island/x', false],
    ['/', false],
  ])('%s → %s', (url, expected) => {
    expect(isNuxtErrorRender(createTestEvent({ url }))).toBe(expected)
  })
})
