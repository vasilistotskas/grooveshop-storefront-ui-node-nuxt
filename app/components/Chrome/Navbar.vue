<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

/**
 * The storefront header.
 *
 * A hand-rolled `<header>` rather than `UHeader`, and that is a
 * measured choice: UHeader mounts its mobile menu stack (UModal +
 * USlideover + UDrawer/vaul-vue, ~23KB minified) unconditionally, even
 * with `:toggle="false"`, and this is the one component on every page —
 * it dragged the drawer runtime into every route's eager graph
 * (2026-08-29 audit). The `data-slot` names and `--ui-header-height`
 * are UHeader's, so `UMain`, the toaster offset and a future switch
 * back all keep working.
 *
 * Everything per-visitor (cart count, favourites, the account menu,
 * notifications) is `ClientOnly`: this header is part of the cached
 * anonymous render on `/`, `/products/**` and `/blog/**`.
 */
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { $routeBaseName } = useNuxtApp()
const { loggedIn } = useUserSession()
const tenantStore = useTenantStore()

const { headerItems } = useNavigation()
const { categories, hasCategories } = useCategoryMenu()

// Chrome fails OPEN, commercial features fail CLOSED — see
// `.claude/rules/ui-and-pages.md`.
const cartEnabled = useSettingFlag('CART_ENABLED', { fallback: true })
const favouritesEnabled = useSettingFlag('FAVOURITES_ENABLED', {
  fallback: true,
})
const giftCardsRuntimeEnabled = useSettingFlag('GIFT_CARDS_ENABLED', {
  fallback: false,
})
const promotionsRuntimeEnabled = useSettingFlag('PROMOTIONS_ENABLED', {
  fallback: false,
})
const loyaltyRuntimeEnabled = useSettingFlag('LOYALTY_ENABLED', {
  fallback: false,
})

const giftCardsEnabled = computed(
  () => tenantStore.giftCardsEnabled && giftCardsRuntimeEnabled.value,
)
const promotionsEnabled = computed(
  () => tenantStore.promotionsEnabled && promotionsRuntimeEnabled.value,
)
const loyaltyEnabled = computed(
  () => tenantStore.loyaltyEnabled && loyaltyRuntimeEnabled.value,
)

const routeName = computed(() => $routeBaseName(route))

/** Active for the route itself and anything nested under it. */
const isRouteActive = (base: string) => {
  const name = routeName.value
  if (typeof name !== 'string') return false
  return name === base || name.startsWith(`${base}-`)
}

/** Operator items carry paths, so they match by path prefix. */
const isPathActive = (path?: string) => {
  if (!path?.startsWith('/')) return false
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`)
}

/**
 * The Shop entry, with the category tree hanging off it.
 *
 * `children` is what turns a link into a dropdown panel; without
 * categories it stays a plain link to the listing, which is also what a
 * store with the catalogue switched off gets (the composable then
 * fetches nothing at all).
 */
const shopItem = computed<NavigationMenuItem>(() => ({
  label: t('shop'),
  to: localePath('/products'),
  active: isRouteActive('products'),
  children: hasCategories.value
    ? categories.value.map(category => ({
        label: category.label,
        to: localePath(category.to),
        description: category.children
          .slice(0, 4)
          .map(child => child.label)
          .join(' · '),
      }))
    : undefined,
}))

const items = computed<NavigationMenuItem[]>(() => {
  // An operator-configured header REPLACES the code menu entirely —
  // same contract the mobile menu and the footer follow.
  const configured = headerItems.value
  if (configured) {
    return configured.map(item => ({
      label: item.label,
      icon: item.icon,
      to: item.to ? localePath(item.to) : undefined,
      href: item.to ? undefined : item.href,
      target: item.href ? '_blank' : undefined,
      active: isPathActive(item.to),
    }))
  }

  const base: NavigationMenuItem[] = [shopItem.value]
  if (promotionsEnabled.value) {
    base.push({
      label: t('offers'),
      to: localePath('/offers'),
      active: isRouteActive('offers'),
    })
  }
  if (tenantStore.blogEnabled) {
    base.push({
      label: t('blog'),
      to: localePath('/blog'),
      active: isRouteActive('blog'),
    })
  }
  if (giftCardsEnabled.value) {
    base.push({
      label: t('gift_cards'),
      to: localePath('/gift-cards'),
      active: isRouteActive('gift-cards'),
    })
  }
  if (loyaltyEnabled.value) {
    base.push({
      label: t('loyalty'),
      to: localePath('/loyalty-program'),
      active: isRouteActive('loyalty-program'),
    })
  }
  return base
})

const mobileMenuOpen = ref(false)

// A border only once the page has moved under the header: at rest the
// header sits on the page, and a rule there would draw a line across a
// hero that is supposed to run to the top.
const scrolled = ref(false)
if (import.meta.client) {
  useEventListener(
    window,
    'scroll',
    () => {
      scrolled.value = window.scrollY > 8
    },
    { passive: true },
  )
}

const appTitle = computed(() => tenantStore.storeName || '')
</script>

<template>
  <div class="sticky top-0 z-50">
    <ChromeAnnouncementBar />

    <header
      data-slot="root"
      :class="[
        'h-(--ui-header-height) bg-default/80 backdrop-blur transition-shadow',
        scrolled ? 'border-b border-default' : 'border-b border-transparent',
      ]"
    >
      <UContainer
        data-slot="container"
        class="flex h-full items-center gap-2"
      >
        <UButton
          :aria-label="t('menu')"
          icon="i-heroicons-bars-3"
          color="neutral"
          variant="ghost"
          size="lg"
          square
          class="lg:hidden"
          @click="() => { mobileMenuOpen = true }"
        />

        <!-- `!w-auto`: Anchor hardcodes `w-full` on its
             NuxtLinkLocale branch, which in a flex row makes the logo
             eat the space the nav and the icon cluster need.

             `min-w-0` rather than `shrink-0`: a store with no logo
             asset renders its NAME here, and a name long enough to
             fill the row has to ellipse rather than push the header
             past the viewport — which needs both this and the
             wordmark's own `min-w-0`. An image logo is unaffected:
             `NuxtImg` carries an explicit width, which flexbox will
             not shrink below without `min-width: 0` on the image
             itself — measured on fyteia at 390/768/1440, the logo
             stays 132px either way. -->
        <Anchor
          :to="'index'"
          :aria-label="appTitle"
          class="
            !w-auto flex min-w-0 items-center
            max-lg:mx-auto
          "
        >
          <TenantLogo
            :width="132"
            :height="36"
            priority
          />
          <span class="sr-only">{{ appTitle }}</span>
        </Anchor>

        <UNavigationMenu
          :items="items"
          :aria-label="t('navigation')"
          variant="link"
          color="neutral"
          class="
            hidden
            lg:flex
          "
          :ui="{
            link: 'text-sm font-medium',
            childLinkDescription: 'line-clamp-1 text-xs text-muted',
          }"
        />

        <div class="ml-auto flex items-center gap-0.5">
          <LazySearchInput hydrate-on-idle />

          <LazyLanguageSwitcher
            v-if="tenantStore.availableLocales.length > 1"
            hydrate-on-visible
            class="
              hidden
              sm:block
            "
          />

          <UColorModeButton
            color="neutral"
            variant="ghost"
            size="lg"
            class="
              hidden
              sm:inline-flex
            "
          />

          <UButton
            v-if="favouritesEnabled && tenantStore.blogEnabled"
            :to="localePath(loggedIn ? '/account/favourites/products' : '/account/login')"
            :aria-label="t('favourites')"
            icon="i-heroicons-heart"
            color="neutral"
            variant="ghost"
            size="lg"
            square
            class="
              hidden
              sm:inline-flex
            "
          />

          <ClientOnly>
            <LazyUserNotificationsBell v-if="loggedIn" />
          </ClientOnly>

          <CartButton v-if="cartEnabled" />

          <ChromeAccountMenu />
        </div>
      </UContainer>
    </header>

    <ClientOnly>
      <LazyChromeMobileMenu
        v-model:open="mobileMenuOpen"
        :items="items"
      />
    </ClientOnly>
  </div>
</template>

<i18n lang="yaml">
el:
  navigation: Πλοήγηση
  menu: Μενού
  loyalty: Επιβράβευση
en:
  navigation: Navigation
  menu: Menu
  loyalty: Rewards
</i18n>
