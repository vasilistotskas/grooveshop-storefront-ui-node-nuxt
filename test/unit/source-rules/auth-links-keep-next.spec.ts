import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { APP, appLabel, readSource, withoutComments } from '../../helpers/sourceText'
import { AuthFlowRoutes } from '~/utils/route'

/**
 * Every link to a sign-in or sign-up page keeps the shopper's destination
 * (`next`): from one auth form to another (sign-in ⇄ sign-up, the code and
 * passkey steps, a password reset, a provider's way back), from an expired
 * code's start-over, and from the store's sign-up invitations. They go
 * through the one accessor, `useAuthLinks().authLink`, which carries the
 * page's checked `next` on an auth page and the page itself elsewhere
 * (`returnPath`, `returnTarget`).
 *
 * A bare `localePath('account-signup')` lost it: from
 * `/account/login?next=/cart`, sign-in → sign-up → sign-in ended on the
 * account instead of the cart.
 *
 * The rule reads every mention of an auth page in `app/`, outside comments
 * and `<i18n>` blocks, in each form it is written: a route name in quotes
 * (`localePath('account-login')`, `{ name: 'account-login' }`, a prop),
 * `RedirectToURLs.LOGIN_URL`, and the page's path in a string, a template
 * literal or an attribute (`'/account/login'`, `to="/account/signup"`,
 * `navigateTo(\`/account/login?…\`)`). A mention that is the first argument
 * of `authLink(` is the accessor; any other is listed below with its reason,
 * or fails.
 *
 * What it still cannot see: a route name or path built from pieces
 * (`` `account-${step}` ``, `'/account/' + page`), one that arrives in a
 * variable from elsewhere (allauth's flow-to-page table, `pathForFlow`,
 * navigates through `tryAdvanceToPendingFlow` / `navigateToPendingFlow`,
 * which keep `next` themselves), and a link a store or Django writes
 * (a builder link, a menu row, an email).
 */
const AUTH_PAGES = new Set<string>(AuthFlowRoutes)
const MENTION = /(['"`])(account-[a-z0-9-]+)\1|RedirectToURLs\.LOGIN_URL|\/account\/(?:login|signup|provider|verify-email|password\/reset|2fa\/authenticate)\b/g
const VIA_ACCESSOR = /authLink\(\s*$/

/** The mentions that are not a link, or keep `next` another way, and why. */
const ALLOWED: Record<string, string> = {
  // The lists of pages themselves.
  'utils/route.ts': 'the auth pages\' names and paths, which every check reads',
  // The prop names the step to start over at; the component links to it through the accessor.
  'components/Account/Login/Code/ConfirmForm.vue "account-login-code"': 'a prop: `Auth/ResendCode` goes through `authLink`',
  'components/Storefront/Auth/VerifyEmail.vue "account-signup"': 'a prop: `Auth/ResendCode` goes through `authLink`',
  'components/Auth/ResendCode.vue \'account-login-code\'': 'the prop\'s type',
  'components/Auth/ResendCode.vue \'account-signup\'': 'the prop\'s type',
  // Re-authentication confirms a signed-in shopper: its `next` is where to go
  // once they have, not a sign-in's destination to keep.
  'components/Storefront/Auth/Reauthenticate.vue \'account-password-reset\'': 'a reset from re-authentication keeps no sign-in destination',
  // The other writer of `next`: it builds the link itself through `returnTarget`.
  'middleware/auth.global.ts RedirectToURLs.LOGIN_URL': 'writes `next` through `returnTarget`',
  // Django's callback for a social sign-in, not a link of the storefront.
  'composables/useSocialProviders.ts /account/provider': 'the provider\'s callback address Django is given',
}

/** Every `.vue` and `.ts` file under `app/`, sorted. */
function appFiles(dir = APP): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) return appFiles(path)
    return /\.(?:vue|ts)$/.test(entry.name) ? [path] : []
  }).sort()
}

/** The source without its comments and its `<i18n>` blocks (YAML keys name pages too). */
const code = (file: string) => withoutComments(readSource(file)).replace(/<i18n[\s\S]*?<\/i18n>/g, '')

/** Each mention of an auth page outside the accessor, as `<file> <mention>`. */
function bareMentions(): string[] {
  const out: string[] = []
  for (const file of appFiles()) {
    const text = code(file)
    for (const match of text.matchAll(MENTION)) {
      if (match[2] && !AUTH_PAGES.has(match[2])) continue
      if (VIA_ACCESSOR.test(text.slice(Math.max(0, match.index - 40), match.index))) continue
      out.push(`${appLabel(file)} ${match[0]}`)
    }
  }
  return out
}

describe('links to the auth pages keep the shopper\'s destination', () => {
  // `utils/route.ts` says "pages under /account/*" in a line comment: read
  // as the start of a block comment, it hid the code down to the next
  // `*/` from every rule (`withoutComments` reads comments in one pass).
  it('reads the code after a line comment that holds a block comment\'s opening', () => {
    expect(withoutComments('// pages under /account/*\nconst page = \'account-login\'\n/** a doc */\n')).toContain('const page = \'account-login\'')
  })

  it('finds the links that go through the accessor', () => {
    // Both designs' forms, breadcrumbs and invitations: a rule that found
    // none would pass for the wrong reason.
    const uses = appFiles().reduce((count, file) => count + (code(file).match(/authLink\(/g)?.length ?? 0), 0)
    expect(uses).toBeGreaterThanOrEqual(40)
  })

  it('leaves no link to an auth page outside it, in any form it is written', () => {
    const bare = bareMentions().filter(at => !(at in ALLOWED) && !(at.split(' ')[0]! in ALLOWED))
    expect(bare).toEqual([])
  })

  it('lists no exception that no longer happens', () => {
    const found = new Set(bareMentions().flatMap(at => [at, at.split(' ')[0]!]))
    expect(Object.keys(ALLOWED).filter(at => !found.has(at))).toEqual([])
  })
})
