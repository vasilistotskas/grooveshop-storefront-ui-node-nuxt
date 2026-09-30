import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { UBadge, UButton } from '#components'

/**
 * The Nuxt UI theme overrides in `app/app.config.ts`, as rendered.
 *
 * Nuxt UI pairs a solid colour with `text-inverted`: white in light
 * mode, near-BLACK in dark. That is right for its own palette, whose
 * tokens flip between modes, and wrong for three of ours:
 *
 * - `secondary` is a tenant's brand colour and stays a mid blue in both
 *   modes, so dark mode came out dark-on-blue (3.72:1 on the "New"
 *   badge, 4.18:1 on the offers page's "Gift" one);
 * - `warning` is amber in both modes, so light mode's white measured
 *   2.94:1 on the "Only N left" badge;
 * - `success` is light enough that white measured 3.22:1 on webside's
 *   solid-success loyalty CTA.
 *
 * Each needs its own compound variant on EACH component — there is no
 * inheritance between them, which is exactly why the badge kept the
 * broken default for months after the button was fixed. Rendered rather
 * than read off the config: a variant under the wrong component, or a
 * class tailwind-merge does not treat as a text colour, both leave the
 * source looking right and change nothing. The class IS the contract
 * here; `test/unit/source-rules/theme-stylesheet.spec.ts` checks each
 * token is defined for both schemes.
 */
const rootClasses = (wrapper: { element: Element }) => wrapper.element.getAttribute('class') ?? ''

describe('a solid button', () => {
  it.each([
    ['secondary', 'text-(--ui-on-secondary)'],
    ['success', 'text-(--ui-on-success)'],
  ] as const)('puts the %s foreground token on the fill', async (color, token) => {
    const wrapper = await mountSuspended(UButton, { props: { color, variant: 'solid', label: 'Αγορά' } })

    const classes = wrapper.find('button').attributes('class') ?? ''
    expect(classes).toContain(token)
    expect(classes, 'tailwind-merge kept Nuxt UI\'s mode-flipping default').not.toMatch(/\btext-inverted\b/)
  })
})

describe('a solid badge', () => {
  it.each([
    ['secondary', 'text-(--ui-on-secondary)'],
    ['success', 'text-(--ui-on-success)'],
    ['warning', 'text-(--ui-on-warning)'],
  ] as const)('puts the %s foreground token on the fill', async (color, token) => {
    const wrapper = await mountSuspended(UBadge, { props: { color, variant: 'solid', label: 'Νέο' } })

    const classes = rootClasses(wrapper)
    expect(classes).toContain(token)
    expect(classes, 'tailwind-merge kept Nuxt UI\'s mode-flipping default').not.toMatch(/\btext-inverted\b/)
  })
})

/**
 * A tap has to look like a tap. Phones have no hover and Tailwind's
 * preflight removes the tap highlight, so without a pressed state a tap
 * looked identical to no tap until the next paint — which the merchant
 * reported as the site not responding. The pressed state is the
 * `tap-press` class the button theme adds; it has to reach a button
 * Nuxt UI renders as a link too (the cart is one), which an element
 * selector in the stylesheet cannot.
 */
describe('the pressed state', () => {
  it('is on a button rendered as <button>', async () => {
    const wrapper = await mountSuspended(UButton, { props: { label: 'Αγορά' } })

    expect(wrapper.find('button').classes()).toContain('tap-press')
  })

  it('is on a button rendered as a link', async () => {
    const wrapper = await mountSuspended(UButton, { props: { label: 'Καλάθι', to: '/cart' } })

    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe('/cart')
    expect(link.classes()).toContain('tap-press')
  })
})
