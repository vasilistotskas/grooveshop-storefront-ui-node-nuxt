import { describe, expect, it } from 'vitest'
import plugin from '~~/server/plugins/tenant-theme'
import { DEGRADED_RENDER_STATUS } from '~~/shared/constants/degradedRender'
import { themeCss } from '~~/shared/theme/compile'
import { themeDefaultsFor } from '~~/shared/theme/defaults'
import { backend, createTestEvent, jsonResponse, runNitroPlugin } from '~~/test/helpers/nitro'

/**
 * The store's theme reaches the page as one `<style>` block pushed last into
 * the head, compiled from the theme document of its current release. What the
 * CSS says is `themeCss`'s contract (`compile.spec.ts`); this pins where the
 * theme comes from, when the block is emitted and how.
 */
const PUBLISHED = { ...themeDefaultsFor('volt'), radius: '0.5rem' }

const summary = (settings: unknown) => ({
  release: 3,
  locale: 'el',
  theme: settings === null ? null : { key: 'theme', version: 1, sections: {}, order: [], settings },
  groups: {},
  pages: [],
})

async function render(context: Record<string, unknown>, url = '/') {
  const nitroApp = await runNitroPlugin(plugin)
  const html = { head: ['<meta charset="utf-8">'] }
  const event = createTestEvent({ context, url })
  await nitroApp.hooks.callHook('render:html', html, { event })
  return { head: html.head, event }
}

const STORE = { schemaName: 'shop' }

describe('server/plugins/tenant-theme', () => {
  it('appends the published theme\'s stylesheet after everything else in the head', async () => {
    backend.reply(summary(PUBLISHED))

    const { head } = await render({ tenant: STORE })

    expect(head).toEqual(['<meta charset="utf-8">', `<style id="tenant-theme">${themeCss(PUBLISHED, 'volt')}</style>`])
  })

  it('compiles the theme for the store\'s design: webside\'s accent is not Volt\'s', async () => {
    backend.reply(summary(themeDefaultsFor(null)))

    const { head } = await render({ tenant: { schemaName: 'webside' } })

    expect(head[1]).toBe(`<style id="tenant-theme">${themeCss(themeDefaultsFor(null), null)}</style>`)
  })

  it('carries the request CSP nonce when there is one', async () => {
    backend.reply(summary(PUBLISHED))

    const { head } = await render({ tenant: STORE, cspNonce: 'abc123' })

    expect(head[1]).toMatch(/^<style id="tenant-theme" nonce="abc123">/)
  })

  it('draws a store with no published theme in its design\'s own', async () => {
    backend.reply(summary(null))

    const { head, event } = await render({ tenant: STORE })

    expect(head[1]).toBe(`<style id="tenant-theme">${themeCss(themeDefaultsFor('volt'), 'volt')}</style>`)
    expect(event.context.degradedRender).toBeUndefined()
  })

  it('draws the design\'s own theme and keeps the render out of every cache when the theme cannot be read', async () => {
    backend.reply(jsonResponse({ detail: 'Bad gateway.' }, 502))

    const { head, event } = await render({ tenant: STORE })

    expect(head[1]).toBe(`<style id="tenant-theme">${themeCss(themeDefaultsFor('volt'), 'volt')}</style>`)
    expect(event.context.degradedRender).toBeDefined()
    expect(event.node.res.statusCode).toBe(DEGRADED_RENDER_STATUS)
  })

  it('reads nothing and adds nothing without a tenant', async () => {
    const { head } = await render({})

    expect(head).toEqual(['<meta charset="utf-8">'])
    expect(backend.requests).toHaveLength(0)
  })

  it.each(['/_builder', '/en/_builder'])('reads nothing and adds nothing on the page editor (%s), which is drawn in the platform\'s look', async (url) => {
    const { head } = await render({ tenant: STORE }, url)

    expect(head).toEqual(['<meta charset="utf-8">'])
    expect(backend.requests).toHaveLength(0)
  })

  it('still themes a store page whose path merely contains the editor\'s', async () => {
    backend.reply(summary(PUBLISHED))

    expect((await render({ tenant: STORE }, '/blog/_builder-tips')).head).toHaveLength(2)
  })
})
