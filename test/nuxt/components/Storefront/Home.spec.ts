import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Home from '~/components/Storefront/Home.vue'
import WebsideHome from '~/components/variants/webside/Storefront/Home.vue'
import { makeBuilderPage, makeBuilderSection } from '~~/test/fixtures/builderPage'
import { setTenant } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

/**
 * The home page's one h1. With no section owning a heading, the body draws
 * it visually hidden: the heading the store wrote in the editor's page
 * settings (#431), or else the store's name.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

describe.each(trees(Home, WebsideHome))('the home page h1 ($tree tree)', ({ C: Component }) => {
  beforeEach(() => {
    clearNuxtData()
    setTenant({ storeName: 'Webside' })
  })

  async function headingsOf(page: ReturnType<typeof makeBuilderPage>) {
    api.routes({
      '/api/builder/pages/home': { page },
      '/api/*': { count: 0, next: null, previous: null, results: [] },
    })
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()
    return wrapper.findAll('h1').map(h1 => h1.text())
  }

  it('is the heading the store set for its homepage', async () => {
    expect(await headingsOf(makeBuilderPage({ settings: { heading: 'Τεχνολογία με νόημα' } }))).toEqual(['Τεχνολογία με νόημα'])
  })

  it('is the store\'s name while the homepage sets none', async () => {
    expect(await headingsOf(makeBuilderPage())).toEqual(['Webside'])
  })

  it('stands down for a hero that owns the page\'s heading', async () => {
    const hero = makeBuilderSection({ componentType: 'hero_banner', props: { heading: 'Η βιτρίνα' } })

    expect(await headingsOf(makeBuilderPage({ settings: { heading: 'Τεχνολογία με νόημα' }, sections: [hero] }))).not.toContain('Τεχνολογία με νόημα')
  })
})
