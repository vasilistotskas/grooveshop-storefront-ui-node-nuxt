import { describe, expect, it, vi } from 'vitest'
import plugin from '~~/server/plugins/builder-render-epoch'
import { moveBuilderEpoch } from '~~/server/utils/builderDocumentPurge'
import { createTestEvent, runNitroPlugin, useStorage } from '~~/test/helpers/nitro'

/**
 * A page render that was in flight when a builder purge landed read the
 * records the purge dropped, so it must not store its page (storefront #454).
 * The purge moves the store's builder epoch between dropping the data and the
 * pages; a render the page cache would store reads the epoch as it starts and
 * as it answers, and a render that saw it move answers `no-store`, which Nitro's
 * cached handler refuses to store (`isCacheableResponse`, nitropack
 * `runtime/internal/cache`).
 */
const WEBSIDE = 'webside.gr'
const DEMO = 'demo.grooveshop.space'

/** A render the page cache runs: Nitro gives its event `context.cache`. */
function cachedRender(host = WEBSIDE) {
  return createTestEvent({ host, context: { cache: { options: {} } } })
}

async function render(event: ReturnType<typeof createTestEvent>, during?: () => Promise<void>) {
  const nitroApp = await runNitroPlugin(plugin)
  const ctx = { event, render: () => undefined, response: undefined }
  await nitroApp.hooks.callHook('render:before', ctx)
  await during?.()
  const response: { headers: Record<string, string> } = { headers: { 'content-type': 'text/html;charset=utf-8' } }
  await nitroApp.hooks.callHook('render:response', response, ctx)
  return response
}

describe('server/plugins/builder-render-epoch', () => {
  it('leaves a render alone when no purge landed during it', async () => {
    await moveBuilderEpoch(WEBSIDE)

    const response = await render(cachedRender())

    expect(response.headers).toEqual({ 'content-type': 'text/html;charset=utf-8' })
  })

  it('marks a render no-store when a purge of its store landed during it', async () => {
    const response = await render(cachedRender(), () => moveBuilderEpoch(WEBSIDE))

    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.headers['content-type']).toBe('text/html;charset=utf-8')
  })

  it('marks it no-store for a store that had no epoch yet', async () => {
    await useStorage('cache').clear()

    const response = await render(cachedRender(), () => moveBuilderEpoch(WEBSIDE))

    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('ignores a purge of another store', async () => {
    const response = await render(cachedRender(), () => moveBuilderEpoch(DEMO))

    expect(response.headers['cache-control']).toBeUndefined()
  })

  it('renders on, untracked, when the shared storage cannot be read as it starts', async () => {
    const getItem = vi.spyOn(useStorage(), 'getItem').mockRejectedValueOnce(new Error('redis down'))

    const response = await render(cachedRender(), () => moveBuilderEpoch(WEBSIDE))

    expect(response.headers['cache-control']).toBeUndefined()
    getItem.mockRestore()
  })

  it('answers no-store when the shared storage cannot be read as it answers', async () => {
    const storage = useStorage()
    const real = storage.getItem.bind(storage)
    const getItem = vi.spyOn(storage, 'getItem')
      .mockImplementationOnce(real)
      .mockRejectedValueOnce(new Error('redis down'))

    const response = await render(cachedRender())

    expect(response.headers['cache-control']).toBe('no-store')
    getItem.mockRestore()
  })

  it('ignores a render the page cache does not store', async () => {
    const response = await render(createTestEvent({ host: WEBSIDE }), () => moveBuilderEpoch(WEBSIDE))

    expect(response.headers['cache-control']).toBeUndefined()
  })
})
