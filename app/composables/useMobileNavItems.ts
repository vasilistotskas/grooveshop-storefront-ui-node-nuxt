interface MobileNavOptions {
  includeCart?: boolean
}

export function useMobileNavItems(options: MobileNavOptions = {}) {
  const { includeCart = true } = options

  const { $i18n, $routeBaseName } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const { loggedIn, user } = useUserSession()
  const route = useRoute()
  // Every link in the page's language: a bare `/search` on an `/en/`
  // page led to the Greek one.
  const localePath = useLocalePath()
  const tenantStore = useTenantStore()
  const img = useMediaStreamImage()

  const avatarImg = computed(() => {
    if (!user.value || !user.value?.mainImagePath) {
      return ''
    }
    return img(user.value.mainImagePath, {
      width: 32,
      height: 32,
      fit: 'cover',
    }, {
      provider: 'mediaStream',
    })
  })

  const isLoginPage = computed(() => $routeBaseName(route) === RedirectToURLs.LOGIN_URL)

  const items = computed(() => {
    const result = [
      {
        icon: 'i-heroicons-home',
        to: localePath('index'),
        label: t('home'),
      },
      {
        icon: 'i-heroicons-magnifying-glass',
        to: localePath('search'),
        label: t('search.title'),
      },
      // Points at a BLOG surface, so it follows blogEnabled the way the
      // desktop navbar's equivalent already does — otherwise a
      // blog-disabled tenant shows a heart that leads to a gated route.
      ...(tenantStore.blogEnabled
        ? [{
            icon: 'i-heroicons-heart',
            to: localePath(loggedIn.value ? 'account-favourites-posts' : RedirectToURLs.LOGIN_URL),
            label: t('favourites'),
          }]
        : []),
    ] as LinksOption[]

    if (includeCart) {
      result.push({
        icon: 'i-heroicons-shopping-cart',
        to: localePath('cart'),
        label: t('cart.title'),
      })
    }

    if (!loggedIn.value) {
      result.push({
        icon: 'i-heroicons-user',
        // Back to this very page — query and all, encoded — after the
        // sign-in, as the auth middleware sends it; from the sign-in
        // page itself there is nowhere to come back to.
        to: localePath({
          name: RedirectToURLs.LOGIN_URL,
          query: isLoginPage.value ? undefined : { next: route.fullPath },
        }),
        label: t('account'),
      })
    }
    else if (avatarImg.value) {
      result.push({
        to: localePath('account'),
        label: t('account'),
        avatar: {
          src: avatarImg.value,
        },
      })
    }
    else {
      result.push({
        icon: 'i-heroicons-user',
        to: localePath('account'),
        label: t('account'),
      })
    }

    return result
  })

  return { items }
}
