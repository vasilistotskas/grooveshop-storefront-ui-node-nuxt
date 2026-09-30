import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Renderer from '~/components/PageSection/Renderer.vue'
import CtaBanner from '~/components/PageSection/CtaBanner.vue'
import DeltaSigmaCtaBanner from '~/components/PageSection/variants/delta_sigma/CtaBanner.vue'
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

  it('prefers the tenant\'s own variant of the section', async () => {
    setTenant({ schemaName: 'delta_sigma' })

    const wrapper = await mountSection(section('cta_banner', { description: 'Για αγορές άνω των 30 €' }))

    await vi.waitFor(() => expect(wrapper.findComponent(DeltaSigmaCtaBanner).exists()).toBe(true))
    expect(wrapper.findComponent(CtaBanner).exists()).toBe(false)
  })

  it('renders nothing for a section type it does not know', async () => {
    // A row written by a newer Django than this build knows.
    const wrapper = await mountSection(section('no_such_section' as ComponentTypeEnum))

    expect(wrapper.html()).toBe('<!--v-if-->')
  })
})
