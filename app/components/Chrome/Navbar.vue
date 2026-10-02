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
 * Desk: logo, the navigation (Shop opens the catalogue panel), then
 * search, language, colour mode, favourites, notifications, cart and
 * the account control. Phone: the menu button, the logo, search and
 * cart — the rest lives in the menu and the tab bar.
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

const SHOP = 'shop'

/** The listing the Shop entry stands for. */
const CATALOGUE_PATH = '/products'

/**
 * The Shop entry. With categories it opens the catalogue panel (its
 * `#shop-content` slot); without them — or with the catalogue switched
 * off, where the composable fetches nothing — it is a plain link to the
 * listing.
 */
const shopItem = computed<NavigationMenuItem>(() => ({
  label: t('shop'),
  value: SHOP,
  slot: SHOP,
  to: localePath(CATALOGUE_PATH),
  active: isRouteActive('products'),
  children: hasCategories.value
    ? categories.value.map(category => ({ label: category.label, to: localePath(category.to) }))
    : undefined,
}))

const items = computed<NavigationMenuItem[]>(() => {
  // An operator-configured header REPLACES the code menu — same
  // contract the mobile menu and the footer follow — except that its
  // entry for the listing stays the Shop entry, under the operator's
  // label: configuring the header must not take away the catalogue
  // panel here, or the category tree that replaces the entry in the
  // phone menu.
  const configured = headerItems.value
  if (configured) {
    return configured.map(item => item.to === CATALOGUE_PATH
      ? { ...shopItem.value, label: item.label, icon: item.icon }
      : {
          label: item.label,
          icon: item.icon,
          to: item.to ? localePath(item.to) : undefined,
          href: item.to ? undefined : item.href,
          target: item.href ? '_blank' : undefined,
          active: isPathActive(item.to),
        })
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

/** The open dropdown's value — the catalogue panel dims the page below it. */
const openItem = ref<string>()
const catalogueOpen = computed(() => openItem.value === SHOP)

const mobileMenuOpen = ref(false)

const appTitle = computed(() => tenantStore.storeName || '')
</script>

<template>
  <div class="sticky top-0 z-50">
    <ChromeAnnouncementBar />

    <header
      data-slot="root"
      class="
        h-(--ui-header-height) border-b border-default bg-muted/90
        backdrop-blur
      "
    >
      <UContainer
        data-slot="container"
        class="
          flex h-full items-center gap-1
          max-lg:ps-1 max-lg:pe-2
          lg:gap-6
        "
      >
        <UButton
          :aria-label="t('menu')"
          icon="i-heroicons-bars-3"
          color="neutral"
          variant="ghost"
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
             wordmark's own `min-w-0`. -->
        <Anchor
          :to="'index'"
          :aria-label="appTitle"
          class="!w-auto flex min-w-0 items-center"
        >
          <TenantLogo
            :width="132"
            :height="34"
            priority
          />
          <span class="sr-only">{{ appTitle }}</span>
        </Anchor>

        <!-- `static`: the catalogue panel is positioned against the
             sticky wrapper, so it spans the full width under the
             header instead of the width of the menu. -->
        <UNavigationMenu
          v-model="openItem"
          :items="items"
          :aria-label="t('navigation')"
          color="neutral"
          class="
            hidden
            lg:flex
          "
          :ui="{
            root: 'static',
            item: 'py-0',
            link: 'h-10 px-3 text-[0.9375rem]',
            linkTrailingIcon: 'size-4',
            viewportWrapper: 'z-10',
            viewport: `
              rounded-none border-b border-default shadow-(--ui-overlay-shadow)
              ring-0
            `,
          }"
        >
          <template #shop-content>
            <ChromeMegaMenu
              :categories="categories"
              :offers-enabled="promotionsEnabled"
            />
          </template>
        </UNavigationMenu>

        <div class="ms-auto flex items-center gap-0.5">
          <LazySearchInput
            compact
            hydrate-on-idle
            class="lg:me-1"
          />

          <LazyLanguageSwitcher
            v-if="tenantStore.availableLocales.length > 1"
            compact
            hydrate-on-visible
            class="
              hidden
              lg:flex
            "
          />

          <UColorModeButton
            color="neutral"
            variant="ghost"
            class="
              hidden
              lg:inline-flex
            "
          />

          <UButton
            v-if="favouritesEnabled"
            :to="localePath(loggedIn ? '/account/favourites/products' : '/account/login')"
            :aria-label="t('favourites')"
            icon="i-heroicons-heart"
            color="neutral"
            variant="ghost"
            square
            class="
              hidden
              lg:inline-flex
            "
          />

          <ClientOnly>
            <LazyUserNotificationsBell
              v-if="loggedIn"
              class="
                hidden
                lg:flex
              "
            />
          </ClientOnly>

          <CartButton v-if="cartEnabled" />

          <ChromeAccountMenu
            class="
              hidden
              lg:ms-2 lg:flex
            "
          />
        </div>
      </UContainer>
    </header>

    <!-- Dims the page under the open catalogue panel. Pointer events
         pass through: leaving the panel closes it, as the menu's own
         hover handling expects. `-z-10` keeps it under the header —
         whose backdrop filter makes it a stacking context of its own —
         and over the page, which sits outside this sticky wrapper. -->
    <div
      v-if="catalogueOpen"
      aria-hidden="true"
      class="
        pointer-events-none absolute inset-x-0 top-full -z-10 h-dvh
        bg-(--ui-scrim)
      "
    />

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
