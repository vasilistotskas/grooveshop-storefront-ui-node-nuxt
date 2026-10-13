import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Link from '~/components/PageSection/variants/ekfyseosfyteias/Link.vue'

/**
 * The destination handling every band shares: a path from the CMS keeps
 * its query and hash, and an `https:` URL is left alone.
 */
const mountLink = (props: { to: string, arrow?: boolean }) =>
  mountSuspended(Link, { route: false, props, slots: { default: 'Διαβάστε' } })

describe('ekfyseosfyteias Link', () => {
  it('keeps the query and hash of a CMS path', async () => {
    const wrapper = await mountLink({ to: '/products?category=2#top' })

    expect(wrapper.find('a').attributes('href')).toBe('/products?category=2#top')
  })

  it('leaves an https URL untouched', async () => {
    const wrapper = await mountLink({ to: 'https://example.org/page' })

    expect(wrapper.find('a').attributes('href')).toBe('https://example.org/page')
  })

  it('hides the arrow from assistive technology and adds none by default', async () => {
    const plain = await mountLink({ to: '/about' })
    const arrowed = await mountLink({ to: '/about', arrow: true })

    expect(plain.find('[aria-hidden="true"]').exists()).toBe(false)
    expect(arrowed.find('a [aria-hidden="true"]').exists()).toBe(true)
    expect(arrowed.find('a').text()).toBe('Διαβάστε')
  })
})
