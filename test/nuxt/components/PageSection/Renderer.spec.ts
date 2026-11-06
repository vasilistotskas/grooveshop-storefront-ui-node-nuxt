import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import Renderer from '~/components/PageSection/Renderer.vue'
import CtaBanner from '~/components/PageSection/CtaBanner.vue'
import FyteiaCtaBanner from '~/components/PageSection/variants/ekfyseosfyteias/CtaBanner.vue'
import { makeBuilderSection } from '~~/test/fixtures/builderPage'
import { setTenant } from '~~/test/helpers/tenant'

const { surface } = vi.hoisted(() => ({ surface: vi.fn<() => BuilderSurface | null>(() => null) }))
mockNuxtImport('useBuilderSurface', () => surface)

/**
 * The page-builder dispatcher: a section's `componentType` picks the
 * component through `componentRegistry` — the tenant's own
 * `<type>@<schema>` variant first — and the section's props are bound onto
 * it. Every registered section is a lazy component, so a test waits for its
 * import to land before looking for it.
 */
const section = (componentType: string, props: Record<string, unknown> = {}) =>
  makeBuilderSection({ componentType, props: { heading: 'Δωρεάν αποστολή', ...props } })

const mountSection = (value: BuilderSection) =>
  mountSuspended(Renderer, { route: false, props: { section: value } })

describe('PageSection/Renderer', () => {
  beforeEach(() => {
    setTenant({ schemaName: 'test' })
  })

  it('renders the registered section with its props', async () => {
    const wrapper = await mountSection(section('cta_banner', { description: 'Για αγορές άνω των 30 €' }))

    await vi.waitFor(() => expect(wrapper.findComponent(CtaBanner).exists()).toBe(true))
    expect(wrapper.findComponent(CtaBanner).props()).toMatchObject({
      heading: 'Δωρεάν αποστολή',
      description: 'Για αγορές άνω των 30 €',
    })
    expect(wrapper.find('h2').text()).toBe('Δωρεάν αποστολή')
  })

  it('marks the section with its node id on the editor\'s preview, in a wrapper that is no box', async () => {
    surface.mockReturnValue('canvas')

    const wrapper = await mountSection(section('cta_banner'))

    await vi.waitFor(() => expect(wrapper.findComponent(CtaBanner).exists()).toBe(true))
    const mark = wrapper.get(`[${BUILDER_CANVAS_NODE_ATTRIBUTE}]`)
    expect(mark.attributes(BUILDER_CANVAS_NODE_ATTRIBUTE)).toBe(wrapper.props('section').id)
    expect(mark.classes()).toEqual(['contents'])
    expect(mark.find('h2').text()).toBe('Δωρεάν αποστολή')
    surface.mockReturnValue(null)
  })

  it('adds nothing to a shopper\'s page', async () => {
    const wrapper = await mountSection(section('cta_banner'))

    await vi.waitFor(() => expect(wrapper.findComponent(CtaBanner).exists()).toBe(true))
    expect(wrapper.find(`[${BUILDER_CANVAS_NODE_ATTRIBUTE}]`).exists()).toBe(false)
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
    // A block type this build has no component for.
    const wrapper = await mountSection(section('no_such_section'))

    expect(wrapper.html()).toBe('<!--v-if-->')
  })
})
