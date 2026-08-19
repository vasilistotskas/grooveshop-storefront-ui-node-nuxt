import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The code-level footer fallback is what EVERY tenant renders until an
 * operator publishes a NavigationMenu row, so it may only contain links
 * that every store has.
 *
 * It used to carry the platform store's own information architecture: an
 * "Όραμα" link and a whole "Microlearning" column. Every tenant's footer
 * therefore advertised another company's product concept and linked to
 * /vision, /what-is-microlearning and /why-microlearning — pages that
 * render from a published layout and now 404 without one, so those were
 * crawlable dead links under a heading that made no sense for the store.
 *
 * Those columns live in `page_config.defaults.BRAND_FOOTER_COLUMNS` now
 * and are seeded by `manage.py seed_brand_pages` alongside the pages
 * they point at, so the brand store's footer is unchanged.
 *
 * Asserted against the source rather than by rendering the composable:
 * the point is that these routes are not NAMED here, whatever the i18n
 * layer resolves them to.
 */
const BRAND_ONLY_ROUTES = [
  'vision',
  'what-is-microlearning',
  'why-microlearning',
  // Layout-driven too: it 404s for a tenant that has published none.
  'about',
]

describe('footer fallback stays universal', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'app/composables/useFooterLinks.ts'),
    'utf8',
  )

  // Comments explain the history and legitimately name the routes.
  const code = source
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n')

  it.each(BRAND_ONLY_ROUTES)('does not link to %s', (route) => {
    expect(code).not.toContain(`localePath('${route}')`)
  })

  it('still carries the links every store has', () => {
    for (const route of ['terms-of-use', 'privacy-policy', 'cookies-policy', 'contact']) {
      expect(code).toContain(`localePath('${route}')`)
    }
  })
})
