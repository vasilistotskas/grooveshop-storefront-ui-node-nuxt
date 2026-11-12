import { describe, it, expect } from 'vitest'
import { APP, appLabel, composableFiles, readSource, vueFiles, withoutComments } from '../../helpers/sourceText'
import { AuthFlowRoutes } from '~/utils/route'

/**
 * Every link to a sign-in or sign-up page keeps the shopper's destination
 * (`next`): from one auth form to another (sign-in ⇄ sign-up, the code and
 * passkey steps, a password reset, a provider's way back), from an expired
 * code's start-over, and from the store's sign-up invitations. They go
 * through the one accessor, `useAuthLinks().authLink`, which carries the
 * page's validated `next` on an auth page and the page itself elsewhere,
 * and drops a destination off the store at the same guard as every other
 * reader of `next` (`safeRelativePath`).
 *
 * A bare `localePath('account-signup')` lost it: from
 * `/account/login?next=/cart`, sign-in → sign-up → sign-in ended on the
 * account instead of the cart.
 */
const AUTH_PAGES = new Set<string>(AuthFlowRoutes)
const BARE_LINK = /localePath\(\s*(?:'([a-z0-9-]+)'|(RedirectToURLs\.LOGIN_URL))\s*\)/g

/**
 * The one auth link left bare, and why: re-authentication is for a shopper
 * already signed in, whose `next` is where to go once they confirm who
 * they are; a reset from there leaves the session's flow and has no
 * destination of the sign-in's to keep.
 */
const ALLOWED = new Set(['components/Storefront/Auth/Reauthenticate.vue account-password-reset'])

const files = [...vueFiles(APP), ...composableFiles()]

describe('links to the auth pages keep the shopper\'s destination', () => {
  it('finds the links that go through the accessor', () => {
    // Both designs' forms, breadcrumbs and invitations: a rule that found
    // none would pass for the wrong reason.
    const uses = files.reduce((count, file) => count + (withoutComments(readSource(file)).match(/authLink\(/g)?.length ?? 0), 0)
    expect(uses).toBeGreaterThanOrEqual(40)
  })

  it('leaves no link to an auth page outside it', () => {
    const bare: string[] = []
    for (const file of files) {
      for (const match of withoutComments(readSource(file)).matchAll(BARE_LINK)) {
        const name = match[1] ?? 'account-login'
        if (!AUTH_PAGES.has(name)) continue
        const at = `${appLabel(file)} ${name}`
        if (!ALLOWED.has(at)) bare.push(at)
      }
    }
    expect(bare).toEqual([])
  })
})
