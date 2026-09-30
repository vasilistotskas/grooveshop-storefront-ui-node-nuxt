import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Band from '~/components/PageSection/Band.vue'

/**
 * The frame every page-builder section renders inside: a full-width
 * band carrying the content container, so the stack can run edge to
 * edge without every section losing its measure.
 */
const mountBand = (props: Record<string, unknown> = {}, slots: Record<string, () => string> = { default: () => 'body' }) =>
  mountSuspended(Band, { route: false, props, slots })

describe('PageSection/Band', () => {
  it('puts its content inside a real container, not a literal element', async () => {
    // The regression this guards: `<component :is="'UContainer'">`
    // resolves a STRING as an unknown ELEMENT, so `<UContainer>`
    // reached the document verbatim and every band on the page lost
    // its measure and its gutters.
    const wrapper = await mountBand()

    expect(wrapper.html()).not.toContain('<ucontainer')
    expect(wrapper.findComponent({ name: 'UContainer' }).text()).toBe('body')
  })

  it('drops the container for a band that runs edge to edge', async () => {
    const wrapper = await mountBand({ bleed: true })

    expect(wrapper.findComponent({ name: 'UContainer' }).exists()).toBe(false)
    expect(wrapper.find('section > div').text()).toBe('body')
  })

  // The two surface tokens ARE the contract: alternating them is how a
  // page separates two bands without a rule (app/assets/css/main.css).
  it.each([
    [undefined, 'bg-default'],
    ['muted', 'bg-muted'],
  ])('paints surface %s with %s', async (surface, token) => {
    const wrapper = await mountBand(surface ? { surface } : {})

    expect(wrapper.find('section').classes()).toContain(token)
  })

  it('draws the heading row: eyebrow, heading, one line and the link', async () => {
    const wrapper = await mountBand({
      eyebrow: 'Νέο',
      heading: 'Προσφορές',
      subheading: 'Όλη την εβδομάδα',
      ctaText: 'Όλες',
      ctaLink: '/offers',
    })

    expect(wrapper.find('h2').text()).toBe('Προσφορές')
    expect(wrapper.findAll('p').map(p => p.text())).toEqual(['Νέο', 'Όλη την εβδομάδα'])
    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual(['Όλες', '/offers'])
  })

  it('draws no link without both its text and its target', async () => {
    const textOnly = await mountBand({ heading: 'Προσφορές', ctaText: 'Όλες' })
    expect(textOnly.find('section').text()).toBe('Προσφορέςbody')

    const linkOnly = await mountBand({ ctaLink: '/offers' })
    expect(linkOnly.find('a').exists()).toBe(false)
    // …and with nothing else set, no heading row at all.
    expect(linkOnly.find('section').text()).toBe('body')
  })

  it('lets a section replace the whole heading row', async () => {
    const wrapper = await mountBand({ heading: 'Προσφορές' }, {
      header: () => 'custom header',
      default: () => 'body',
    })

    expect(wrapper.find('h2').exists()).toBe(false)
    expect(wrapper.text()).toBe('custom headerbody')
  })
})
