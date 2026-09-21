import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { UButton } from '#components'

/**
 * A non-solid accent button must not paint its label with the FILL
 * token.
 *
 * `--ui-secondary` is calibrated as a fill; as words on the dark page
 * it measures 4.18:1, under AA. Every `outline`/`ghost`/`link` accent
 * button hit that — the gift-card amount presets, the PDP's price-drop
 * alert, the blog's "sign in to reply", the sign-up links.
 *
 * This is a rendered assertion rather than a source one on purpose. The
 * rule lives in `app.config.ts` as a compound variant, and two things
 * can silently stop it applying: putting it under the wrong component
 * (it sat in `badge` for a full deploy cycle and changed nothing), and
 * writing a class `tailwind-merge` does not recognise as a text colour,
 * which leaves the variant's own `text-secondary` in place. Only the
 * rendered class list proves neither happened.
 */
describe('a non-solid accent button', () => {
  for (const variant of ['outline', 'ghost', 'link', 'soft', 'subtle'] as const) {
    it(`renders ${variant} with the readable accent, not the fill`, async () => {
      const wrapper = await mountSuspended(UButton, {
        props: { color: 'secondary', variant, label: 'Buy' },
      })

      const classes = wrapper.find('button').attributes('class') ?? ''

      expect(classes).toContain('text-(--ui-secondary-text)')
      expect(
        classes,
        'the fill token survived — tailwind-merge did not treat the '
        + 'override as a text colour',
      ).not.toMatch(/\btext-secondary\b/)
    })
  }

  it('leaves a SOLID accent button on its own foreground token', async () => {
    // That pairing is the opposite problem and has its own rule.
    const wrapper = await mountSuspended(UButton, {
      props: { color: 'secondary', variant: 'solid', label: 'Buy' },
    })

    const classes = wrapper.find('button').attributes('class') ?? ''
    expect(classes).toContain('text-(--ui-on-secondary)')
  })
})
