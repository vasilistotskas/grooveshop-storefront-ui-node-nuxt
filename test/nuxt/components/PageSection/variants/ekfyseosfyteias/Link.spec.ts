import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Link from '~/components/PageSection/variants/ekfyseosfyteias/Link.vue'

/**
 * The destination handling every band shares: a path from the CMS keeps
 * its query and hash, and an `https:` URL is left alone.
 */
const mountLink = (props: { to: string, arrow?: boolean }) =>
  mountSuspended(Link, { route: false, props, slots: { default: 'Διαβάστε' } })

describe('with no address', () => {
  it('is a button in the same look, with the arrow, that says when it is busy', async () => {
    const wrapper = await mountSuspended(Link, { route: false, props: { look: 'ink', arrow: true, loading: true }, slots: { default: () => 'Στο καλάθι' } })

    const button = wrapper.get('button')
    expect(wrapper.find('a').exists()).toBe(false)
    expect(button.text()).toBe('Στο καλάθι')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.find('[aria-hidden="true"]').exists()).toBe(true)
  })

  it('takes what the action hands it: its click and disabled', async () => {
    const onClick = vi.fn()
    const wrapper = await mountSuspended(Link, { route: false, props: { look: 'ink', disabled: true, onClick }, slots: { default: () => 'Στο καλάθι' } })

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })
})

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
