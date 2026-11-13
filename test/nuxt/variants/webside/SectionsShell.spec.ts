import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import WebsideSectionsShell from '~/components/variants/webside/Page/SectionsShell.vue'
import { makeBuilderSection } from '~~/test/fixtures/builderPage'

/**
 * webside's section shell frames its own sections in a container with a gap
 * between them, as it always has, and lays a section that draws its own
 * full-width band in a bold look (the hero, the promises as a card, the product
 * and post bands, the newsletter) out of that frame, edge to edge. Each section
 * stands in for itself here: the Renderer is stubbed, so what is checked is
 * where the shell puts it, and where the page's title goes.
 *
 * Every grid below `md` has ONE column that may shrink: an `auto` column is
 * as wide as the widest section's min-content, and a section that scrolls a
 * rail sideways (the blog posts) reports the rail's whole width as its
 * min-content, so the page scrolled sideways on a phone (2026-11-03, 390 px:
 * 976 px wide). `grid-cols-1` is `minmax(0, 1fr)`.
 */
const stubs = {
  PageSectionRenderer: defineComponent({
    props: { section: { type: Object as PropType<BuilderSection>, required: true } },
    setup: (props) => {
      // What the section learns from its run: whether a band is right above it.
      const followsBand = useFollowsBand()
      return () => h('div', { 'data-section': props.section.id, 'data-follows-band': String(followsBand) })
    },
  }),
}

const mountShell = (sections: BuilderSection[], slots: Record<string, () => ReturnType<typeof h>> = {}) =>
  mountSuspended(WebsideSectionsShell, { props: { sections }, slots, route: false, global: { stubs } })

const bold = (id: string, componentType: string) => makeBuilderSection({ id, componentType, props: { look: 'bold' } })
const framed = (id: string, componentType: string) => makeBuilderSection({ id, componentType })

/** Which sections each top-level run holds, and whether it sits in the page frame. */
const layout = (wrapper: Awaited<ReturnType<typeof mountShell>>) =>
  [...wrapper.element.children]
    .filter(run => run.querySelector('[data-section]'))
    .map(run => [run.querySelector('section') !== null, [...run.querySelectorAll('[data-section]')].map(node => node.getAttribute('data-section'))])

describe('webside SectionsShell', () => {
  it('lays bold bands out of the frame, and frames the rest, in order', async () => {
    const wrapper = await mountShell([framed('a', 'hero_carousel'), bold('b', 'hero_showcase'), bold('c', 'products_grid'), framed('d', 'recently_viewed')])

    expect(layout(wrapper)).toEqual([
      [true, ['a']],
      [false, ['b', 'c']],
      [true, ['d']],
    ])
  })

  it('frames every section of a page without a bold band as it always did, title first', async () => {
    const wrapper = await mountShell([framed('a', 'products_grid'), framed('b', 'rich_text')], { title: () => h('nav', { 'data-test': 'crumb' }) })

    const frame = wrapper.findAll('section')
    expect(frame).toHaveLength(1)
    expect(wrapper.findAll('[data-section]').map(node => node.attributes('data-section'))).toEqual(['a', 'b'])
    // The title sits in the frame's container, before the sections.
    expect(wrapper.get('[data-test="crumb"]').element.parentElement).toBe(frame[0]?.element.parentElement)
  })

  it.each([
    ['a framed section', [framed('a', 'contact_panel'), bold('b', 'newsletter_signup')]],
    ['a bold band', [bold('a', 'hero_showcase'), framed('b', 'rich_text')]],
  ])('keeps the title in a container when the page opens with %s', async (_case, sections) => {
    const wrapper = await mountShell(sections, { title: () => h('nav', { 'data-test': 'crumb' }) })

    const crumb = wrapper.get('[data-test="crumb"]').element
    expect(crumb.closest('.max-w-\\(--ui-container\\)')).not.toBeNull()
  })

  it('keeps the column of each of its grids shrinkable', async () => {
    const wrapper = await mountShell([bold('a', 'hero_showcase'), framed('b', 'rich_text')])

    const grids = wrapper.findAll('.grid')
    expect(grids.length).toBeGreaterThanOrEqual(3)
    for (const grid of grids) expect(grid.classes()).toContain('grid-cols-1')
  })

  it('carries what follows the sections in a frame of its own after a band', async () => {
    const wrapper = await mountShell([bold('a', 'newsletter_signup')], { after: () => h('form', { 'data-test': 'form' }) })

    expect(wrapper.find('section [data-test="form"]').exists()).toBe(true)
  })

  it('tells a section of an open run whether a band is right above it, never the run’s first', async () => {
    const card = (id: string) => makeBuilderSection({ id, componentType: 'store_assurances', props: { layout: 'card' } })
    const wrapper = await mountShell([card('a'), framed('b', 'rich_text'), card('c'), bold('d', 'hero_showcase'), card('e')])

    const follows = Object.fromEntries(wrapper.findAll('[data-section]').map(node => [node.attributes('data-section'), node.attributes('data-follows-band')]))
    expect(follows).toEqual({ a: 'false', b: 'false', c: 'false', d: 'true', e: 'true' })
  })
})
