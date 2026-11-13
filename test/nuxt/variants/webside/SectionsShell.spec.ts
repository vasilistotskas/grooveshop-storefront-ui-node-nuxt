import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import WebsideSectionsShell from '~/components/variants/webside/Page/SectionsShell.vue'
import { makeBuilderSection } from '~~/test/fixtures/builderPage'

/**
 * webside's section shell frames its own sections in a container with a gap
 * between them, and lays a section that draws its own full-width band (the
 * hero, the promises, the product and post bands, the newsletter) out of
 * that frame, edge to edge. Each section stands in for itself here: the
 * Renderer is stubbed, so what is checked is where the shell puts it.
 *
 * Every grid below `md` has ONE column that may shrink: an `auto` column is
 * as wide as the widest section's min-content, and a section that scrolls a
 * rail sideways (the blog posts) reports the rail's whole width as its
 * min-content, so the page scrolled sideways on a phone (2026-11-03, 390 px:
 * 976 px wide). `grid-cols-1` is `minmax(0, 1fr)`.
 */
const stubs = {
  PageSectionRenderer: { props: ['section'], setup: (props: { section: { componentType: string } }) => () => h('div', { 'data-section': props.section.componentType }) },
}

const mountShell = (sections: ReturnType<typeof makeBuilderSection>[], slots: Record<string, () => string> = {}) =>
  mountSuspended(WebsideSectionsShell, { props: { sections }, slots, route: false, global: { stubs } })

describe('webside SectionsShell', () => {
  it('lays bands out of the frame, and frames the rest, in order', async () => {
    const wrapper = await mountShell([
      makeBuilderSection({ id: 'a', componentType: 'hero_carousel' }),
      makeBuilderSection({ id: 'b', componentType: 'hero_showcase' }),
      makeBuilderSection({ id: 'c', componentType: 'store_assurances' }),
      makeBuilderSection({ id: 'd', componentType: 'recently_viewed' }),
    ])

    const runs = wrapper.element.children
    const framed = (run: Element) => run.querySelector('section') !== null
    expect([...runs].map(run => [framed(run), [...run.querySelectorAll('[data-section]')].map(node => node.getAttribute('data-section'))])).toEqual([
      [true, ['hero_carousel']],
      [false, ['hero_showcase', 'store_assurances']],
      [true, ['recently_viewed']],
    ])
  })

  it('counts the blog categories as a band in their tiles only', async () => {
    const wrapper = await mountShell([
      makeBuilderSection({ id: 'a', componentType: 'blog_categories', props: { layout: 'tiles' } }),
      makeBuilderSection({ id: 'b', componentType: 'blog_categories', props: { layout: 'slider' } }),
    ])

    expect(wrapper.findAll('section')).toHaveLength(1)
    expect(wrapper.get('section [data-section]').exists()).toBe(true)
  })

  it('keeps the column of each of its grids shrinkable', async () => {
    const wrapper = await mountShell([
      makeBuilderSection({ id: 'a', componentType: 'hero_showcase' }),
      makeBuilderSection({ id: 'b', componentType: 'rich_text' }),
    ])

    const grids = wrapper.findAll('.grid')
    expect(grids.length).toBeGreaterThanOrEqual(3)
    for (const grid of grids) expect(grid.classes()).toContain('grid-cols-1')
  })

  it('carries what follows the sections in a frame of its own after a band', async () => {
    const wrapper = await mountShell([makeBuilderSection({ id: 'a', componentType: 'newsletter_signup' })], { after: () => 'form' })

    expect(wrapper.get('section').text()).toBe('form')
  })
})
