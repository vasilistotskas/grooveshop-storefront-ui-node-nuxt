import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Band from '~/components/PageSection/Band.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The frame every page-builder section renders inside: a full-width
 * band carrying the content container, so the stack can run edge to
 * edge without every section losing its measure.
 */
const mountBand = (props: Record<string, unknown> = {}, slots: Record<string, () => string> = { default: () => 'body' }) =>
  mountSuspended(Band, { route: false, props, slots })

describe('PageSection/Band', () => {
  // Groove Volt, the platform's design: a store with none of its own.
  beforeEach(() => {
    setTenant()
  })

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

  // The class is the contract: Nuxt UI's `.light` / `.dark` subtree switch,
  // which every token inside follows (`test/unit/shared/theme/schemes.spec.ts`).
  it.each([
    ['dark', 'dark'],
    ['light', 'light'],
    [undefined, undefined],
  ] as const)('draws the band in the %s colour scheme', async (colorScheme, scheme) => {
    const classes = (await mountBand({ colorScheme })).get('section').classes()

    expect(classes.includes('dark')).toBe(scheme === 'dark')
    expect(classes.includes('light')).toBe(scheme === 'light')
    // `body` paints its text in the page's scheme: a forced band sets its own.
    expect(classes.includes('text-default')).toBe(scheme !== undefined)
  })

  // The classes are the contract: a phone's tap target is at least 44px
  // (WCAG 2.5.5), measured in the real layout at 390px, while from `sm` up
  // the control keeps the size it had. happy-dom lays nothing out.
  it('stacks the heading over its link on a phone, the link a 44px target, and keeps them side by side from sm up', async () => {
    const wrapper = await mountBand({ heading: 'Χρήσιμα gadgets', subheading: 'Λίγα, επιλεγμένα.', ctaText: 'Όλα τα προϊόντα', ctaLink: '/products' })

    const row = wrapper.get('h2').element.parentElement!.parentElement!
    expect([...row.classList]).toEqual(expect.arrayContaining(['flex-col', 'items-start', 'sm:flex-row', 'sm:items-end']))
    expect(wrapper.get('a[href="/products"]').classes()).toEqual(expect.arrayContaining(['min-h-11', 'sm:min-h-0']))
  })

  // The class is the contract, the browser the real check: a store's heading
  // word wider than a 320px phone breaks instead of widening the page.
  it('breaks a heading word wider than the screen', async () => {
    const wrapper = await mountBand({ heading: 'Χρήσιμα gadgets' })

    expect(wrapper.get('h2').classes()).toContain('wrap-break-word')
  })
})

/**
 * The bold look (`look: 'bold'`, `PageSection/BandBold`, every design): the
 * board's heading row; laid out `open` by its shell, its bands share the
 * page's ground without rules. The classes are the contract: happy-dom lays
 * nothing out, the browser is the real check.
 */
describe('PageSection/Band in its bold look', () => {
  beforeEach(() => {
    setTenant()
  })

  /** The band inside a shell that lays its bands out `open`. */
  const mountOpen = (props: Record<string, unknown>) => mountSuspended(defineComponent({
    setup() {
      provideBandFlow('open')
      return () => h(Band, props, { default: () => 'body' })
    },
  }), { route: false })

  it('sets the eyebrow in the accent, in capitals, over a heavier heading', async () => {
    const wrapper = await mountSuspended(Band, { route: false, props: { look: 'bold', eyebrow: 'Κατάστημα', heading: 'Χρήσιμα gadgets' } })

    expect(wrapper.get('p').classes()).toEqual(expect.arrayContaining(['uppercase', 'text-accent', 'font-bold']))
    expect(wrapper.get('h2').classes()).toEqual(expect.arrayContaining(['font-extrabold', 'lg:text-[2.125rem]/[1.15]', 'wrap-break-word']))
  })

  it('draws "see all" as a plain accent link with its arrow, a 44px target', async () => {
    const wrapper = await mountSuspended(Band, { route: false, props: { look: 'bold', heading: 'Νέα άρθρα', ctaText: 'Όλα τα άρθρα', ctaLink: '/blog' } })

    const link = wrapper.get('a[href="/blog"]')
    expect(link.classes()).toEqual(expect.arrayContaining(['text-accent', 'min-h-11']))
    expect(link.findComponent({ name: 'UButton' }).exists()).toBe(false)
  })

  it.each([
    ['inline', false, false],
    ['below', true, true],
    ['none', true, false],
  ] as const)('puts the phone\'s link %s', async (phoneCta, hiddenInRow, buttonBelow) => {
    const wrapper = await mountSuspended(Band, { route: false, props: { look: 'bold', heading: 'Χρήσιμα gadgets', ctaText: 'Όλα τα προϊόντα', ctaLink: '/products', phoneCta } })

    const links = wrapper.findAll('a[href="/products"]')
    expect(links[0]!.classes().includes('max-sm:hidden')).toBe(hiddenInRow)
    expect(links.length === 2 && links[1]!.classes().includes('sm:hidden')).toBe(buttonBelow)
  })

  it('shows a shorter link text on a phone where the section gives one', async () => {
    const wrapper = await mountSuspended(Band, { route: false, props: { look: 'bold', heading: 'Νέα άρθρα', ctaText: 'Όλα τα άρθρα', ctaLink: '/blog', phoneCtaText: 'Όλα' } })

    const spans = wrapper.get('a[href="/blog"]').findAll('span').filter(span => span.text())
    expect(spans.map(span => [span.text(), span.classes()[0]])).toEqual([['Όλα', 'sm:hidden'], ['Όλα τα άρθρα', 'max-sm:hidden']])
  })

  it('keeps the band as it was without the bold look', async () => {
    const wrapper = await mountSuspended(Band, { route: false, props: { eyebrow: 'Κατάστημα', heading: 'Χ', ctaText: 'Όλα', ctaLink: '/products', phoneCta: 'below' } })

    expect(wrapper.findComponent({ name: 'PageSectionBandBold' }).exists()).toBe(false)
    expect(wrapper.get('h2').classes()).toContain('font-bold')
    expect(wrapper.findAll('a[href="/products"]')).toHaveLength(1)
  })

  it('keeps its rules and padding framed on a page, and drops the rules laid out open', async () => {
    const framed = await mountSuspended(Band, { route: false, props: { look: 'bold', heading: 'Χ' } })
    const open = await mountOpen({ look: 'bold', heading: 'Χ' })

    expect(framed.get('section').classes()).toEqual(expect.arrayContaining(['border-y', 'py-12']))
    expect(open.get('section').classes()).not.toContain('border-y')
    expect(open.get('section').classes()).toEqual(expect.arrayContaining(['pt-11', 'lg:pt-22']))
  })
})
