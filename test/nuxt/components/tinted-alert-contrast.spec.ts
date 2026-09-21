import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { UAlert } from '#components'

/**
 * A tinted alert must not paint its words in the status colour.
 *
 * `soft` and `subtle` put the text in the same colour as the 10% tint
 * behind it. For every colour but neutral that lands under AA, and the
 * one that took longest to find was `error`: it passes in light mode,
 * so the first measurement pass recorded it as clean. In dark mode
 * `--ui-error` resolves to `error-400` and the account-deletion alert
 * measured 2.78:1 on its title and on all four of its bullets.
 *
 * Rendered rather than read off `app.config.ts`, for the reason the
 * accent-button rule taught: a compound variant under the wrong
 * component, or a class `tailwind-merge` will not treat as a text
 * colour, both leave the source looking correct and change nothing.
 *
 * The icon is deliberately NOT asserted here — it keeps the colour, so
 * the alert still reads as an error at a glance.
 */
const TITLE = 'Δεν αναιρείται'
const DESCRIPTION = 'Τα δεδομένα σου διαγράφονται οριστικά.'

function classesOfTextNode(wrapper: { element: Element }, text: string): string {
  const match = [...wrapper.element.querySelectorAll('*')].find(
    node => node.textContent?.trim() === text,
  )
  if (!match) throw new Error(`no element renders ${JSON.stringify(text)}`)
  return match.getAttribute('class') ?? ''
}

describe('a tinted alert', () => {
  for (const color of ['error', 'success', 'warning', 'secondary'] as const) {
    for (const variant of ['soft', 'subtle'] as const) {
      it(`writes ${color}/${variant} in a text colour, not the fill`, async () => {
        const wrapper = await mountSuspended(UAlert, {
          props: { color, variant, title: TITLE, description: DESCRIPTION },
        })

        for (const [slot, text] of [['title', TITLE], ['description', DESCRIPTION]] as const) {
          const classes = classesOfTextNode(wrapper, text)

          expect(classes, `${slot} is not toned`).toContain('text-toned')
          expect(
            classes,
            `${slot} kept the fill token — the compound variant did not apply`,
          ).not.toMatch(new RegExp(`\\btext-${color}\\b`))
        }
      })
    }
  }

  it('leaves a neutral alert alone', async () => {
    // Neutral's fill IS a readable text colour, so there is nothing to
    // correct and no reason to touch a render that already passes.
    const wrapper = await mountSuspended(UAlert, {
      props: { color: 'neutral', variant: 'soft', title: TITLE },
    })

    expect(classesOfTextNode(wrapper, TITLE)).not.toContain('text-toned')
  })
})
