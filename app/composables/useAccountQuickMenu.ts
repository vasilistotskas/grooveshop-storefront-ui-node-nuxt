/**
 * What the two quick account menus show — the header's dropdown on
 * desktop and the bottom sheet on a phone: who the shopper is, their
 * standing (tier and points, business account) and the few account pages
 * worth one tap.
 *
 * The pages are the account navigation's own entries (`useAccountNavigation`),
 * so a page the store has switched off is never offered. The standing
 * comes from the account summary, asked for only when a menu opens —
 * these menus live in the header of every page, and most visits never
 * open one — and shown only where the navigation offers the programme
 * (a store without rewards never has its points quoted).
 */
export function useAccountQuickMenu(keys: AccountNavKey[]) {
  const { $i18n } = useNuxtApp()
  const { user } = useUserSession()
  const img = useMediaStreamImage()
  const { items } = useAccountNavigation()

  const { data: summary, status, execute } = useLazyApi<AccountSummary>('/api/user/account/summary', {
    key: 'account-quick-menu-summary',
    method: 'GET',
    immediate: false,
    server: false,
  })

  const offers = (key: AccountNavKey) => items.value.some(item => item.key === key)

  /** The shopper's name, else their email. */
  const name = computed(() => {
    const full = [user.value?.firstName, user.value?.lastName].filter(Boolean).join(' ')
    return full || user.value?.email || ''
  })

  const avatarSrc = computed(() => {
    const path = user.value?.mainImagePath
    if (!path) return undefined
    return img(path, { width: 96, height: 96, fit: 'cover' }, { provider: 'mediaStream' })
  })

  const pages = computed(() => keys
    .map(key => items.value.find(item => item.key === key))
    .filter(item => item !== undefined))

  const loyalty = computed(() => offers('rewards') ? summary.value?.loyalty ?? null : null)

  const tierName = computed(() => loyalty.value?.tier
    ? extractTranslated(loyalty.value.tier, 'name', $i18n.locale.value) ?? null
    : null)

  const isBusiness = computed(() => offers('business') && summary.value?.businessStatus === 'APPROVED')

  /** Asks for the summary once, the first time a menu opens. */
  function load() {
    if (status.value === 'idle') execute()
  }

  return {
    name,
    email: computed(() => user.value?.email ?? ''),
    avatarSrc,
    pages,
    pointsBalance: computed(() => loyalty.value?.pointsBalance ?? null),
    tierName,
    isBusiness,
    load,
  }
}
