import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { UAlert, UBadge, UButton } from '#components'

/**
 * The Nuxt UI theme overrides in `app/app.config.ts`, as rendered —
 * every colour/variant pairing the app corrects, asserted once.
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
 * A non-solid accent button must not paint its label with the FILL
 * token — the opposite problem to the solid button's. `--ui-secondary`
 * is calibrated as a fill; as words on the dark page it measures
 * 4.18:1, under AA. Every `outline`/`ghost`/`link` accent button hit
 * that — the gift-card amount presets, the PDP's price-drop alert, the
 * blog's "sign in to reply", the sign-up links. (The rule once sat under
 * `badge` for a full deploy cycle and changed nothing.)
 */
describe('a non-solid accent button', () => {
  it.each(['outline', 'ghost', 'link', 'soft', 'subtle'] as const)('renders %s with the readable accent, not the fill', async (variant) => {
    const wrapper = await mountSuspended(UButton, { props: { color: 'secondary', variant, label: 'Buy' } })

    const classes = wrapper.find('button').attributes('class') ?? ''
    expect(classes).toContain('text-(--ui-secondary-text)')
    expect(classes, 'the fill token survived — tailwind-merge did not treat the override as a text colour')
      .not.toMatch(/\btext-secondary\b/)
  })
})

/**
 * A tinted alert must not paint its words in the status colour. `soft`
 * and `subtle` put the text in the same colour as the 10% tint behind
 * it. For every colour but neutral that lands under AA, and the one that
 * took longest to find was `error`: it passes in light mode, so the
 * first measurement pass recorded it as clean. In dark mode `--ui-error`
 * resolves to `error-400` and the account-deletion alert measured 2.78:1
 * on its title and on all four of its bullets.
 *
 * The icon is deliberately NOT asserted — it keeps the colour, so the
 * alert still reads as an error at a glance.
 */
describe('a tinted alert', () => {
  const TITLE = 'Δεν αναιρείται'
  const DESCRIPTION = 'Τα δεδομένα σου διαγράφονται οριστικά.'

  function classesOfTextNode(wrapper: { element: Element }, text: string): string {
    const match = [...wrapper.element.querySelectorAll('*')].find(node => node.textContent?.trim() === text)
    if (!match) throw new Error(`no element renders ${JSON.stringify(text)}`)
    return match.getAttribute('class') ?? ''
  }

  it.each(
    (['error', 'success', 'warning', 'secondary'] as const).flatMap(color =>
      (['soft', 'subtle'] as const).map(variant => [color, variant] as const)),
  )('writes %s/%s in a text colour, not the fill', async (color, variant) => {
    const wrapper = await mountSuspended(UAlert, { props: { color, variant, title: TITLE, description: DESCRIPTION } })

    for (const [slot, text] of [['title', TITLE], ['description', DESCRIPTION]] as const) {
      const classes = classesOfTextNode(wrapper, text)
      expect(classes, `${slot} is not toned`).toContain('text-toned')
      expect(classes, `${slot} kept the fill token — the compound variant did not apply`)
        .not.toMatch(new RegExp(`\\btext-${color}\\b`))
    }
  })

  it('leaves a neutral alert alone', async () => {
    // Neutral's fill IS a readable text colour, so there is nothing to
    // correct and no reason to touch a render that already passes.
    const wrapper = await mountSuspended(UAlert, { props: { color: 'neutral', variant: 'soft', title: TITLE } })

    expect(classesOfTextNode(wrapper, TITLE)).not.toContain('text-toned')
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
