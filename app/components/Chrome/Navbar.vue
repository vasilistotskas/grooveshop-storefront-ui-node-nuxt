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
 * Desk: logo, the navigation (Shop opens the catalogue panel, Blog its
 * topics), then search, language, colour mode, favourites,
 * notifications, cart and the account control. Phone: the menu button, the logo, search and
 * cart — the rest lives in the menu and the tab bar.
 *
 * The navigation shows from `xl`, not `lg`: the row has to fit the
 * logo, the five links and the icon cluster in the store's LONGEST
 * language, and Greek's links are 525px against the board's English
 * 385px. From `lg` to `xl` the menu button stands in for them; at
 * 1024px the row used to push the page 192px past the viewport and
 * squeeze the logo to nothing (measured on staging, 2026-10-02).
 *
 * Everything per-visitor (cart count, favourites, the account menu,
 * notifications) is `ClientOnly`: this header is part of the cached
 * anonymous render on `/`, `/products/**` and `/blog/**`.
 */
const { t } = useStoreI18n('components/Chrome/Navbar')
const route = useRoute()
const localePath = useLocalePath()
const { $routeBaseName } = useNuxtApp()
const { loggedIn } = useUserSession()
const tenantStore = useTenantStore()

const { headerItems, mobileLinks } = useNavigation()
const { categories, hasCategories } = useCategoryMenu()
const { blogCategories, hasBlogCategories } = useBlogCategoryMenu()

// Not a store feature yet (`shared/utils/storePreference.ts`).
const cartEnabled = useStoreFeature('cart')

// The cart drawer is loaded the first time it is opened, then kept.
const { open: cartDrawerOpen } = useCartDrawer()
const cartDrawerRequested = ref(cartDrawerOpen.value)
watch(cartDrawerOpen, (isOpen) => {
  if (isOpen) cartDrawerRequested.value = true
})
// Every link here is shown while the page it opens is serving, as the
// one table of gated routes says (`shared/utils/gatedRoutes.ts`).
const savedServing = useGatedRoute('/account/favourites/products')
const giftCardsServing = useGatedRoute('/gift-cards')
const offersServing = useGatedRoute('/offers')
const loyaltyServing = useGatedRoute('/loyalty-program')
const shopServing = useGatedRoute('/products')
const blogServing = useGatedRoute('/blog')
const searchServing = useGatedRoute('/search')
const { signIn } = useAuthLinks()

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
const BLOG = 'blog'

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
  to: localePath('products'),
  active: isRouteActive('products'),
  children: hasCategories.value
    ? categories.value.map(category => ({ label: category.label, to: localePath(pathLocation(category.to)) }))
    : undefined,
}))

/**
 * The Blog entry. With topics it opens a panel of them, "all articles"
 * first and each topic with its post count, drawn by the menu itself
 * from the children; without them it is a plain link to the blog.
 */
const blogItem = computed<NavigationMenuItem>(() => ({
  label: t('blog'),
  value: BLOG,
  to: localePath('blog'),
  active: isRouteActive('blog'),
  children: hasBlogCategories.value
    ? [
        { label: t('all_articles'), to: localePath('blog') },
        ...blogCategories.value.map(topic => ({
          label: topic.label,
          description: t('articles', topic.postCount),
          to: localePath(pathLocation(topic.to)),
        })),
      ]
    : undefined,
  // The panel spans the header like the catalogue's, so its list keeps
  // to the page's container.
  ui: {
    childList: `
      mx-auto max-w-(--ui-container) grid-cols-4 gap-2 px-4 py-6
      sm:px-6
      lg:px-8
    `,
  },
}))

/** The entries a link opens a dropdown from (`menuDropdownFor`). */
const dropdownItems = computed<Record<MenuDropdown, NavigationMenuItem>>(() => ({
  shop: shopItem.value,
  blog: blogItem.value,
}))

/**
 * An operator's menu rows as navigation items; the listing and the
 * blog stay the Shop and Blog entries, under the operator's label.
 */
const fromLinks = (configured: NavLink[]): NavigationMenuItem[] =>
  configured.map((item) => {
    const dropdown = menuDropdownFor(item.to)
    if (dropdown) return { ...dropdownItems.value[dropdown], label: item.label, icon: item.icon }
    return {
      label: item.label,
      icon: item.icon,
      to: item.to ? localePath(pathLocation(item.to)) : undefined,
      href: item.to ? undefined : item.href,
      target: item.href ? '_blank' : undefined,
      active: isPathActive(item.to),
    }
  })

const items = computed<NavigationMenuItem[]>(() => {
  // An operator-configured header REPLACES the code menu — same
  // contract the mobile menu and the footer follow — except that its
  // entries for the listing and the blog stay the Shop and Blog
  // entries, under the operator's labels: configuring the header must
  // not take away their dropdowns here, or the sections that replace
  // them in the phone menu.
  const configured = headerItems.value
  if (configured) return fromLinks(configured)

  const base: NavigationMenuItem[] = []
  if (shopServing.value) base.push(shopItem.value)
  if (offersServing.value) {
    base.push({
      label: t('offers'),
      to: localePath('offers'),
      active: isRouteActive('offers'),
    })
  }
  if (blogServing.value) base.push(blogItem.value)
  if (giftCardsServing.value) {
    base.push({
      label: t('gift_cards'),
      to: localePath('gift-cards'),
      active: isRouteActive('gift-cards'),
    })
  }
  if (loyaltyServing.value) {
    base.push({
      label: t('loyalty'),
      to: localePath('loyalty-program'),
      active: isRouteActive('loyalty-program'),
    })
  }
  return base
})

/**
 * What the phone menu lists: the store's Mobile menu, else its Header
 * menu, else the code menu above.
 */
/** Where the menu hydrates: see the template. */
const MENU_HYDRATION: (keyof HTMLElementEventMap)[] = ['pointermove', 'pointerdown', 'focusin']

/**
 * The bar's entries: the current section marked, and each section with a
 * panel as its link plus a button that opens the panel.
 */
const barItems = computed(() => withDropdownToggles(withCurrentPage(items.value), {
  label: section => t('open_section', { section }),
  class: '-ms-2 px-1',
}))

const mobileMenuItems = computed(() =>
  mobileLinks.value ? fromLinks(mobileLinks.value) : items.value,
)

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
        backdrop-blur-sm
      "
    >
      <UContainer
        data-slot="container"
        class="
          flex h-full items-center gap-1
          max-lg:ps-1 max-lg:pe-2
          lg:gap-4
        "
      >
        <UButton
          :aria-label="t('menu')"
          icon="i-heroicons-bars-3"
          color="neutral"
          variant="ghost"
          square
          class="xl:hidden"
          @click="() => { mobileMenuOpen = true }"
        />

        <!-- `!w-auto`: Anchor hardcodes `w-full` on its
             NuxtLinkLocale branch, which in a flex row makes the logo
             eat the space the nav and the icon cluster need.

             `min-w-0` rather than `shrink-0`: a store with no logo
             asset renders its NAME here, and a name long enough to
             fill the row has to ellipse rather than push the header
             past the viewport — which needs both this and the
             wordmark's own `min-w-0` — on a phone. From `lg` it does
             not shrink (the board's `flex-shrink: 0`): the search pill
             gives way instead, and a long name ellipses at a 240px cap.
             Shrinking first, it cut "GrooveShop Demo" to "Gr…" beside
             the Greek menu. -->
        <Anchor
          :to="'index'"
          :aria-label="appTitle"
          class="
            flex w-auto! min-w-0 items-center
            lg:max-w-60 lg:shrink-0
          "
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
        <!-- Hydrated by the first pointer move, tap or focus on it, which
             Vue replays once hydrated (`hydrateOnInteraction`): Reka opens
             a panel on a pointer MOVE, so the default `pointerenter`
             replayed into nothing and the first hover after a page load
             opened no panel. Still lazy, so the menu's code runs only for a
             visitor who reaches for it. -->
        <LazyUNavigationMenu
          v-model="openItem"
          :hydrate-on-interaction="MENU_HYDRATION"
          :items="barItems"
          :aria-label="t('navigation')"
          color="neutral"
          class="
            hidden
            xl:flex
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
              :offers-enabled="offersServing"
            />
          </template>
        </LazyUNavigationMenu>

        <div class="ms-auto flex min-w-0 items-center gap-0.5">
          <LazySearchInput
            v-if="searchServing"
            compact
            hydrate-on-idle
            class="lg:me-1"
          />

          <LazyLanguageSwitcher
            v-if="tenantStore.availableLocales.length > 1"
            compact
            hydrate-on-interaction
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
            v-if="savedServing"
            :to="loggedIn ? localePath('account-favourites-products') : localePath(signIn)"
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
          <!-- The drawer loads the first time something opens it (the
               cart button, an add to cart) and stays mounted after. -->
          <LazyCartDrawer v-if="cartEnabled && cartDrawerRequested" />

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
        :items="mobileMenuItems"
      />
    </ClientOnly>
  </div>
</template>

<i18n lang="yaml">
el:
  navigation: Πλοήγηση
  menu: Μενού
  loyalty: Επιβράβευση
  open_section: "Μενού: {section}"
  all_articles: Όλα τα άρθρα
  articles: "{count} άρθρο | {count} άρθρα"
en:
  navigation: Navigation
  menu: Menu
  loyalty: Rewards
  open_section: "{section} menu"
  all_articles: All articles
  articles: "{count} article | {count} articles"
</i18n>
