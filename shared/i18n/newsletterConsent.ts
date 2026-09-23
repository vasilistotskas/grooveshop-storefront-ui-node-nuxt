import type { SupportedLocale } from '../../i18n/locales'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/locales'

/**
 * The newsletter consent sentence, per locale — its ONE source.
 *
 * Django stores the sentence verbatim as the proof of consent, so the
 * text the server route sends (`server/api/subscriptions/newsletter.post.ts`)
 * must be the text the form label showed
 * (`app/components/PageSection/NewsletterSignup.vue`). Both read it here.
 *
 * Why not a key in `i18n/locales/*`: those files are not read as plain
 * text everywhere. In the Vue bundle `@intlify/unplugin-vue-i18n`
 * compiles an imported locale JSON into message ASTs (observed in this
 * repo's nuxt test environment: `{ type: 0, … }` where the string was),
 * so the server and the client would each depend on a bundler detail to
 * produce "the same" sentence. A typed module is the same string in
 * every bundle, and `Record<SupportedLocale, …>` makes a missing
 * translation a type error rather than a silent fallback.
 *
 * Split around the privacy-policy link so the label can render it as a
 * link while the stored text is the same words, unlinked.
 */
export interface NewsletterConsent {
  before: string
  privacy: string
  after: string
}

const NEWSLETTER_CONSENT: Record<SupportedLocale, NewsletterConsent> = {
  el: {
    before:
      'Θέλω να λαμβάνω το ενημερωτικό δελτίο του καταστήματος με νέα '
      + 'προϊόντα και προσφορές. Μπορώ να διαγραφώ όποτε θέλω. Διάβασε την ',
    privacy: 'Πολιτική Απορρήτου',
    after: '.',
  },
  en: {
    before:
      'I want to receive the store\'s newsletter with new products and '
      + 'offers. I can unsubscribe at any time. Read the ',
    privacy: 'Privacy Policy',
    after: '.',
  },
}

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
}

/** The sentence's parts in `locale` (the default locale's for any other). */
export function newsletterConsent(locale: string): NewsletterConsent {
  return NEWSLETTER_CONSENT[isSupportedLocale(locale) ? locale : DEFAULT_LOCALE]
}

/** The sentence as plain text — what the visitor read, link and all. */
export function newsletterConsentText(locale: string): string {
  const { before, privacy, after } = newsletterConsent(locale)
  return `${before}${privacy}${after}`
}
