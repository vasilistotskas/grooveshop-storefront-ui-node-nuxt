import { describe, expect, it } from 'vitest'
import plugin from '~~/server/plugins/csp-nonce'
import { createTestEvent, runNitroPlugin } from '~~/test/helpers/nitro'

/**
 * The nonce `3.csp.ts` put in the policy must reach every script the SSR
 * renderer emits, in every chunk — including the body, where unhead
 * renders nuxt-site-config's inline script. The stamping rule itself is
 * `server/utils/csp.ts`'s `stampCspNonce`.
 */
function renderChunks() {
  return {
    head: ['<script src="/_nuxt/entry.js"></script><link rel="modulepreload" href="/_nuxt/a.js">'],
    body: ['<script>window.__NUXT_SITE_CONFIG__={}</script>'],
    bodyPrepend: ['<script>prepend()</script>'],
    bodyAppend: ['<script>append()</script>'],
  }
}

async function render(context: Record<string, unknown>) {
  const nitroApp = await runNitroPlugin(plugin)
  const html = renderChunks()
  await nitroApp.hooks.callHook('render:html', html, { event: createTestEvent({ context }) })
  return html
}

describe('server/plugins/csp-nonce', () => {
  it('stamps the request nonce onto scripts and script preloads in every chunk', async () => {
    expect(await render({ cspNonce: 'abc123' })).toEqual({
      head: ['<script nonce="abc123" src="/_nuxt/entry.js"></script><link nonce="abc123" rel="modulepreload" href="/_nuxt/a.js">'],
      body: ['<script nonce="abc123">window.__NUXT_SITE_CONFIG__={}</script>'],
      bodyPrepend: ['<script nonce="abc123">prepend()</script>'],
      bodyAppend: ['<script nonce="abc123">append()</script>'],
    })
  })

  it('leaves the markup alone when the request has no nonce (cached and prerendered pages)', async () => {
    expect(await render({})).toEqual(renderChunks())
  })
})
