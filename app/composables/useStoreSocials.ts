/**
 * The store's links to its social networks (`Tenant.socials_*`), each
 * with its mark and its name: the links every design's footer draws.
 *
 * Tenant-only, no platform or env fallback: each store links its own
 * accounts, and a shared link would misattribute traffic. A network the
 * store has not filled in is left out.
 *
 * The ORDER is the design's (`order`): it is part of how a footer
 * looks, so each design names every network in its own order, and the
 * one table of marks and names stays here.
 */
const SOCIAL_NETWORK_ICONS = {
  discord: 'i-mdi-discord',
  facebook: 'i-mdi-facebook',
  instagram: 'i-mdi-instagram',
  linkedin: 'i-mdi-linkedin',
  pinterest: 'i-mdi-pinterest',
  reddit: 'i-mdi-reddit',
  tiktok: 'i-ant-design-tik-tok-filled',
  // X's current mark, which no installed collection ships
  // (`app/assets/icons/brand/x.svg`); `mdi-twitter` is the retired bird.
  twitter: 'i-brand-x',
  youtube: 'i-mdi-youtube',
} as const

export type SocialNetwork = keyof typeof SOCIAL_NETWORK_ICONS

export interface StoreSocialLink {
  key: SocialNetwork
  url: string
  icon: string
  label: string
}

export function useStoreSocials(order: readonly SocialNetwork[]) {
  const { t } = useI18n({ useScope: 'global' })
  const tenantStore = useTenantStore()

  const socials = computed<StoreSocialLink[]>(() =>
    order.flatMap((key) => {
      const url = tenantStore.socials[key]
      return url ? [{ key, url, icon: SOCIAL_NETWORK_ICONS[key], label: t(`socials.${key}`) }] : []
    }),
  )

  return { socials }
}
