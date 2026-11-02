import { describe, expect, it } from 'vitest'
import plugin from '~~/server/plugins/tenant-theme'
import { createTestEvent, log, runNitroPlugin } from '~~/test/helpers/nitro'

/**
 * The tenant's design tokens reach the page as one `<style>` block pushed
 * last into the head. What the CSS says is `server/utils/themeTokens.ts`'s
 * contract (its own spec); this pins when the block is emitted and how.
 */
async function render(context: Record<string, unknown>, url = '/') {
  const nitroApp = await runNitroPlugin(plugin)
  const html = { head: ['<meta charset="utf-8">'] }
  await nitroApp.hooks.callHook('render:html', html, { event: createTestEvent({ context, url }) })
  return html.head
}

const THEMED = { schemaName: 'shop', accentHex: '#b3694b' }

describe('server/plugins/tenant-theme', () => {
  it('appends the tenant stylesheet after everything else in the head', async () => {
    const head = await render({ tenant: THEMED })

    expect(head).toHaveLength(2)
    expect(head[1]).toMatch(/^<style id="tenant-theme">.*--ui-secondary: ?#b3694b.*<\/style>$/s)
  })

  it('carries the request CSP nonce when there is one', async () => {
    const head = await render({ tenant: THEMED, cspNonce: 'abc123' })

    expect(head[1]).toMatch(/^<style id="tenant-theme" nonce="abc123">/)
  })

  it.each([
    ['no tenant', {}],
    ['webside, which changes nothing', { tenant: { schemaName: 'webside' } }],
  ])('adds nothing for %s', async (_label, context) => {
    expect(await render(context)).toEqual(['<meta charset="utf-8">'])
  })

  it.each(['/_builder', '/en/_builder'])('adds nothing to the page editor (%s), which is drawn in the platform\'s look', async (url) => {
    expect(await render({ tenant: THEMED }, url)).toEqual(['<meta charset="utf-8">'])
  })

  it('still themes a store page whose path merely contains the editor\'s', async () => {
    expect(await render({ tenant: THEMED }, '/blog/_builder-tips')).toHaveLength(2)
  })

  it('warns about invalid theme metadata and still applies the tenant fields', async () => {
    const head = await render({ tenant: { ...THEMED, themeMetadata: { notAThemeKey: true } } })

    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({
      tag: 'tenant-theme',
      schema: 'shop',
      metadataError: expect.stringContaining('notAThemeKey'),
    }))
    expect(head[1]).toMatch(/--ui-secondary: ?#b3694b/)
  })
})
