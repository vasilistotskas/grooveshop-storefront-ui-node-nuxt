interface MobileNavOptions {
  includeCart?: boolean
}

export function useMobileNavItems(options: MobileNavOptions = {}) {
  const { includeCart = true } = options

  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const { loggedIn, user } = useUserSession()
  const route = useRoute()
  const img = useImage()

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

  const items = computed(() => {
    const result = [
      {
        icon: 'i-heroicons-home',
        to: '/',
        label: t('home'),
      },
      {
        icon: 'i-heroicons-magnifying-glass',
        to: '/search',
        label: t('search.title'),
      },
      {
        icon: 'i-heroicons-heart',
        to: loggedIn.value ? '/account/favourites/posts' : '/account/login',
        label: t('favourites'),
      },
    ] as LinksOption[]

    if (includeCart) {
      result.push({
        icon: 'i-heroicons-shopping-cart',
        to: '/cart',
        label: t('cart.title'),
      })
    }

    if (!loggedIn.value) {
      result.push({
        icon: 'i-heroicons-user',
        to: `/account/login?next=${route.path}`,
        label: t('account'),
      })
    }
    else if (avatarImg.value) {
      result.push({
        to: '/account',
        label: t('account'),
        avatar: {
          src: avatarImg.value,
        },
      })
    }
    else {
      result.push({
        icon: 'i-heroicons-user',
        to: '/account',
        label: t('account'),
      })
    }

    return result
  })

  return { items }
}
