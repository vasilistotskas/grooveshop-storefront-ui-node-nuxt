import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COMPONENTS, sfcTemplate, walkElements } from '../../helpers/sourceText'

/**
 * Webside's footer offers the newsletter directly above its social icons,
 * on a phone and on a wide screen alike. Which footer a visitor gets is
 * picked by device, so both are read: dropping or reordering the block in
 * one would leave a whole class of visitors without it.
 */
describe('the webside footer newsletter', () => {
  it.each([
    ['mobile', 'variants/webside/Chrome/Footer.vue', 'LazyWebsideFooterNewsletter'],
    ['desktop', 'variants/webside/Footer/Desktop.vue', 'WebsideFooterNewsletter'],
  ])('sits above the social icons on %s', (_device, file, tag) => {
    const tags: string[] = []
    walkElements(sfcTemplate(resolve(COMPONENTS, file)), (node) => {
      tags.push(node.tag)
    })
    expect(tags).toContain(tag)
    expect(tags.indexOf(tag)).toBeLessThan(tags.indexOf('WebsideSocials'))
  })
})
