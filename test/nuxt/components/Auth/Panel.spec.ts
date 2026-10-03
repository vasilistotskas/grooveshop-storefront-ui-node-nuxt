import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AuthPanel from '~/components/Auth/Panel.vue'

/**
 * The column every sign-in page is drawn in: the page's one heading, an
 * optional line under it and icon tile above it, then the page's content.
 */
describe('Auth/Panel', () => {
  const mountPanel = (props: { title: string, lead?: string, icon?: string }) => mountSuspended(AuthPanel, {
    props,
    slots: { default: () => h('form', { 'aria-label': 'Sign in' }) },
  })

  it('heads the page with its title as the one h1, the lead under it, and the content after', async () => {
    const wrapper = await mountPanel({ title: 'Καλώς ήρθες ξανά', lead: 'Συνδέσου για να συνεχίσεις.' })

    expect(wrapper.findAll('h1').map(heading => heading.text())).toEqual(['Καλώς ήρθες ξανά'])
    expect(wrapper.text()).toContain('Συνδέσου για να συνεχίσεις.')
    expect(wrapper.find('form[aria-label="Sign in"]').exists()).toBe(true)
  })

  it('draws no lead paragraph and no icon tile when given neither', async () => {
    const wrapper = await mountPanel({ title: 'Καλώς ήρθες ξανά' })

    expect(wrapper.find('p').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'UIcon' }).exists()).toBe(false)
  })

  it('sets the icon a confirming page names above the heading', async () => {
    const wrapper = await mountPanel({ title: 'Επιβεβαίωσε ότι είσαι εσύ', icon: 'i-lucide-shield-check' })

    expect(wrapper.findComponent({ name: 'UIcon' }).props('name')).toBe('i-lucide-shield-check')
  })
})
