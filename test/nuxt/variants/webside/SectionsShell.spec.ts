import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import WebsideSectionsShell from '~/components/variants/webside/Page/SectionsShell.vue'

/**
 * webside's section shell is two grids below `md`. An `auto` column is as wide
 * as the widest section's min-content, and a section that scrolls a rail
 * sideways (the blog posts) reports the rail's whole width as its min-content,
 * so the page scrolled sideways on a phone (2026-11-03, 390 px: 976 px wide).
 * A layout is no jsdom matter, so the class that keeps the column shrinkable
 * is the contract: `grid-cols-1` is `minmax(0, 1fr)`.
 */
describe('webside SectionsShell', () => {
  it('keeps the column of each of its grids shrinkable', async () => {
    const wrapper = await mountSuspended(WebsideSectionsShell, { props: { sections: [] }, route: false })

    const grids = wrapper.findAll('.grid')

    expect(grids).toHaveLength(2)
    for (const grid of grids) expect(grid.classes()).toContain('grid-cols-1')
  })
})
