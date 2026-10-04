/**
 * The brand icon of a social sign-in provider, by allauth's provider id —
 * the providers the platform installs (Django `INSTALLED_APPS`). One
 * a store adds later, before an icon is mapped here, is drawn with a
 * generic sign-in glyph rather than none.
 */
const SOCIAL_PROVIDER_ICONS: Readonly<Record<string, string>> = {
  google: 'i-mdi-google',
  facebook: 'i-mdi-facebook',
  github: 'i-mdi-github',
  discord: 'i-mdi-discord',
}

export function socialProviderIcon(providerId: string): string {
  return SOCIAL_PROVIDER_ICONS[providerId] ?? 'i-lucide-log-in'
}

/**
 * Whether the storefront can link this provider to a signed-in shopper.
 *
 * Linking (allauth's `process=connect`) has to run as the shopper, and
 * the storefront signs its shoppers in with app session tokens the
 * browser never holds. Only the token flow carries that token: the
 * storefront runs the provider's OAuth itself (`server/routes/auth/`)
 * and hands the provider's token to allauth through its own proxy. The
 * redirect-only flow runs on Django's origin, where the browser is
 * nobody, so allauth would refuse the link.
 */
export function canConnectSocialProvider(provider: Provider): boolean {
  return provider.flows.includes('provider_token')
}
