import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Renderer from '~/components/PageSection/Renderer.vue'
import CtaBanner from '~/components/PageSection/CtaBanner.vue'
import FyteiaCtaBanner from '~/components/PageSection/variants/ekfyseosfyteias/CtaBanner.vue'
import type { ComponentTypeEnum, PageSection } from '~~/shared/openapi/types.gen'
import { fixtureUuid } from '~~/test/fixtures/product'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The page-builder dispatcher: a section row's `componentType` picks the
 * component through `componentRegistry` — the tenant's own
 * `<type>@<schema>` variant first — and the row's title and props are
 * bound onto it. Every registered section is a lazy component, so a test
 * waits for its import to land before looking for it.
 */
const section = (componentType: ComponentTypeEnum, props: Record<string, unknown> = {}): PageSection => ({
  id: 1,
  uuid: fixtureUuid(9, 1),
  componentType,
  title: 'Δωρεάν αποστολή',
  isVisible: true,
  props,
  sortOrder: 0,
})

const mountSection = (value: PageSection) =>
  mountSuspended(Renderer, { route: false, props: { section: value } })

describe('PageSection/Renderer', () => {
  beforeEach(() => {
    setTenant({ schemaName: 'test' })
  })

  it('renders the registered section with the row\'s title and props', async () => {
    const wrapper = await mountSection(section('cta_banner', { description: 'Για αγορές άνω των 30 €' }))

    await vi.waitFor(() => expect(wrapper.findComponent(CtaBanner).exists()).toBe(true))
    expect(wrapper.findComponent(CtaBanner).props()).toMatchObject({
      title: 'Δωρεάν αποστολή',
      description: 'Για αγορές άνω των 30 €',
    })
    expect(wrapper.find('h2').text()).toBe('Δωρεάν αποστολή')
  })

  it('gives «Εκ φύσεως Φυτειάς» its own variant, and the others none of it', async () => {
    setTenant({ schemaName: 'ekfyseosfyteias' })

    const wrapper = await mountSection(section('cta_banner', { description: 'Για αγορές άνω των 30 €' }))

    await vi.waitFor(() => expect(wrapper.findComponent(FyteiaCtaBanner).exists()).toBe(true))
    expect(wrapper.findComponent(CtaBanner).exists()).toBe(false)
  })

  describe.each([
    ['the default design', 'test'],
    ['webside', 'webside'],
  ])('a hero in %s', (_design, schemaName) => {
    const hero = section('hero_carousel', { images: ['/img/a.png', '/img/b.png'], link: '/products' })
    const mountAt = (placement?: 'top' | 'below-content') =>
      mountSuspended(Renderer, { route: false, props: { section: hero, ...(placement ? { placement } : {}) } })
    const firstImage = async (wrapper: Awaited<ReturnType<typeof mountAt>>) => {
      await vi.waitFor(() => expect(wrapper.find('img').exists()).toBe(true))
      return wrapper.find('img')
    }

    it('hints its first image as the LCP when the layout leads the page', async () => {
      setTenant({ schemaName })

      const image = await firstImage(await mountAt())

      expect(image.attributes('loading')).toBe('eager')
      expect(image.attributes('fetchpriority')).toBe('high')
    })

    it('loads it lazily, at normal priority, in a layout under the content of the page', async () => {
      setTenant({ schemaName })

      const image = await firstImage(await mountAt('below-content'))

      expect(image.attributes('loading')).toBe('lazy')
      expect(image.attributes('fetchpriority')).not.toBe('high')
    })
  })

  it('renders nothing for a section type it does not know', async () => {
    // A row written by a newer Django than this build knows.
    const wrapper = await mountSection(section('no_such_section' as ComponentTypeEnum))

    expect(wrapper.html()).toBe('<!--v-if-->')
  })
})
