<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

const cartStore = useCartStore()
const { cleanCartState, refreshCart } = cartStore

const { user, loggedIn } = useUserSession()
const { deleteSession } = useAllAuthAuthentication()
const route = useRoute()
const { t } = useStoreI18n('components/variants/webside/Page/Navbar')
const tenantStore = useTenantStore()
const localePath = useLocalePath()
const { $routeBaseName } = useNuxtApp()
const { isMobileOrTablet } = useDevice()

// Gift-card purchase page discoverability.
const giftCardsServing = useGatedRoute('/gift-cards')

// Cart chrome for shop-dark tenants (content site now, eshop later).
const cartEnabled = useStoreFeature('cart')

// Every link here is shown while the page it opens is serving, as the
// one table of gated routes says (`shared/utils/gatedRoutes.ts`).
// Offers page discoverability: without it the store's automatic
// promotions stay invisible until a shopper has already built a
// qualifying cart.
const offersServing = useGatedRoute('/offers')
const shopServing = useGatedRoute('/products')
const blogServing = useGatedRoute('/blog')
const searchServing = useGatedRoute('/search')
const savedPostsServing = useGatedRoute('/account/favourites/posts')
const { signIn } = useAuthLinks()

const routeName = computed(() => $routeBaseName(route))

// Used for the main-nav active-route state. Matches the anchor's
// base route name plus any nested page under it (products-id-slug,
// products-category-id-slug, blog-post-id-slug…) so the user stays
// oriented while drilling into category or detail pages.
const isRouteActive = (base: string) => {
  const name = routeName.value
  if (!name) return false
  if (name === base) return true
  return typeof name === 'string' && name.startsWith(`${base}-`)
}

// Operator-configured items carry paths (not route names), so their
// active state is a path-prefix match instead of the route-name match
// above.
const isPathActive = (path?: string) => {
  if (!path || !path.startsWith('/')) return false
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`)
}

const { headerItems } = useNavigation()
const { categories, hasCategories } = useCategoryMenu()
const { blogCategories, hasBlogCategories } = useBlogCategoryMenu()

interface MenuTile {
  id: number
  label: string
  /** Its page, before the locale prefix. */
  to: string
  imagePath: string
  count: string
}

/** What a dropdown shows: its tiles, then a link to everything. */
interface MenuPanel {
  dropdown: MenuDropdown
  title: string
  tiles: MenuTile[]
  allLabel: string
  allTo: string
}

/**
 * The dropdowns that have something to show. The shop's opens the
 * store's product categories, the blog's its topics; a list that is
 * empty, switched off or failed to load leaves its entry a plain link,
 * never an empty panel.
 */
const panels = computed<MenuPanel[]>(() => {
  const out: MenuPanel[] = []
  if (hasCategories.value) {
    out.push({
      dropdown: 'shop',
      title: t('categories'),
      tiles: categories.value.map(category => ({
        id: category.id,
        label: category.label,
        to: category.to,
        imagePath: category.imagePath,
        count: t('products_count', category.productCount),
      })),
      allLabel: t('all_products'),
      allTo: localePath('products'),
    })
  }
  if (hasBlogCategories.value) {
    out.push({
      dropdown: 'blog',
      title: t('topics'),
      tiles: blogCategories.value.map(topic => ({
        id: topic.id,
        label: topic.label,
        to: topic.to,
        imagePath: topic.imagePath,
        count: t('articles_count', topic.postCount),
      })),
      allLabel: t('all_articles'),
      allTo: localePath('blog'),
    })
  }
  return out
})

/** The slot a link to `path` opens its panel in, when it has one. */
const panelSlot = (path: string | undefined) => {
  const dropdown = menuDropdownFor(path)
  return panels.value.some(panel => panel.dropdown === dropdown) ? dropdown : undefined
}

const navItems = computed<NavigationMenuItem[]>(() => {
  // Operator-configured header menu wins; the code list below keeps
  // the platform chrome for unconfigured tenants — same contract as
  // BurgerMenu's. Either way the link to the listing and the link to
  // the blog open their dropdowns.
  const configured = headerItems.value
  if (configured) {
    return configured.map(item => ({
      label: item.label,
      to: item.to ? localePath(pathLocation(item.to)) : undefined,
      href: item.to ? undefined : item.href,
      target: item.href ? '_blank' : undefined,
      active: isPathActive(item.to),
      value: item.to ?? item.href,
      slot: panelSlot(item.to),
    }))
  }
  const base: NavigationMenuItem[] = []
  if (shopServing.value) {
    base.push({
      label: t('shop'),
      to: localePath('products'),
      active: isRouteActive('products'),
      value: 'products',
      slot: panelSlot('/products'),
    })
  }
  if (blogServing.value) {
    base.push({
      label: t('blog'),
      to: localePath('blog'),
      active: isRouteActive('blog'),
      value: 'blog',
      slot: panelSlot('/blog'),
    })
  }
  if (offersServing.value) {
    base.push({
      label: t('offers'),
      to: localePath('offers'),
      active: isRouteActive('offers'),
    })
  }
  if (giftCardsServing.value) {
    base.push({
      label: t('gift_cards'),
      to: localePath('gift-cards'),
      active: isRouteActive('gift-cards'),
    })
  }
  return base
})

/** The section whose panel is open; the mouse on its name or its button opens it. */
const openSection = ref<string>()
const menuHover = useMenuHover(openSection)

/** Where the menu hydrates: see the template. */
const MENU_HYDRATION: (keyof HTMLElementEventMap)[] = ['pointermove', 'pointerdown', 'focusin']

/**
 * The bar's entries: the current section marked, and each section with a
 * panel as its link plus a button that opens the panel.
 */
const barItems = computed(() => withDropdownToggles(withCurrentPage(navItems.value), {
  label: section => t('open_section', { section }),
  class: '-ms-3 px-1',
}))

const onClickLogout = async () => {
  if (!routeName.value) return
  if (isRouteProtected(String(routeName.value)))
    await navigateTo(localePath('index'))

  await cleanCartState()

  try {
    await deleteSession({ explicit: true })
    await refreshCart()
  }
  catch (error) {
    log.error({ action: 'auth:logout', error })
  }
}

const items = computed(() => [
  [
    {
      label: user.value?.email ?? '',
      slot: 'account',
      disabled: true,
      icon: undefined,
    },
  ],
  [
    {
      label: t('account'),
      icon: 'i-heroicons-user',
      onSelect: async () => await navigateTo(localePath('account')),
    },
    {
      label: t('settings'),
      icon: 'i-heroicons-cog-8-tooth',
      onSelect: async () => await navigateTo(localePath('account-settings')),
    },
  ],
  [
    {
      label: t('logout'),
      icon: 'i-heroicons-arrow-left-on-rectangle',
      onSelect: async () => await onClickLogout(),
    },
  ],
])
</script>

<template>
  <WebsideBuilderNavbar
    class="
      bg-primary-100
      dark:bg-primary-900
    "
  >
    <template #menu>
      <LazyWebsideSearchInput v-if="searchServing && !isMobileOrTablet" />
      <!-- Not positioned: a dropdown's panel is placed against the
           header's row, so it spans the header rather than this cluster. -->
      <div
        class="
          ml-auto hidden items-center
          lg:flex
        "
      >
        <div
          class="
            flex items-center text-lg leading-6 font-semibold text-primary-950
            dark:text-primary-50
          "
          @pointermove="menuHover.onPointermove"
          @pointerleave="menuHover.onPointerleave"
        >
          <!-- Keyboard, focus and screen-reader behaviour of the
               dropdowns are the menu's own (Reka's NavigationMenu). -->
          <!-- Hydrated by the first pointer move, tap or focus on it, which
               Vue replays once hydrated (`hydrateOnInteraction`): Reka opens
               a panel on a pointer MOVE, so the default `pointerenter`
               replayed into nothing and the first hover after a page load
               opened no panel. Still lazy, so the menu's code runs only for a
               visitor who reaches for it. -->
          <LazyUNavigationMenu
            v-model="openSection"
            :hydrate-on-interaction="MENU_HYDRATION"
            disable-hover-trigger
            disable-pointer-leave-close
            :content="{ onEscapeKeyDown: menuHover.onEscapeKeyDown }"
            :items="barItems"
            :aria-label="t('navigation')"
            color="neutral"
            variant="link"
            highlight
            highlight-color="secondary"
            :ui="{
              root: 'static',
              list: 'gap-4',
              item: 'py-0',
              link: `
                px-0 text-lg font-semibold capitalize
                after:inset-x-0 after:-bottom-1 after:h-0.5
              `,
              linkTrailingIcon: 'size-4',
              viewportWrapper: 'top-[calc(100%+1.5rem)] z-10',
              viewport: 'rounded-xl shadow-lg',
            }"
          >
            <template
              v-for="panel in panels"
              :key="panel.dropdown"
              #[`${panel.dropdown}-content`]
            >
              <div class="flex flex-col gap-3 p-6">
                <p
                  class="text-xs font-bold tracking-wider text-muted uppercase"
                >
                  {{ panel.title }}
                </p>
                <ul
                  class="
                    grid grid-cols-2 gap-4
                    xl:grid-cols-3
                  "
                >
                  <li
                    v-for="tile in panel.tiles"
                    :key="tile.id"
                  >
                    <ULink
                      :to="localePath(pathLocation(tile.to))"
                      class="
                        flex items-center gap-4 rounded-lg border border-default
                        p-3 text-highlighted transition-colors
                        hover:border-secondary
                        motion-reduce:transition-none
                      "
                    >
                      <ImgWithFallback
                        v-if="tile.imagePath"
                        :src="tile.imagePath"
                        alt=""
                        :width="96"
                        :height="96"
                        fit="cover"
                        loading="lazy"
                        densities="x1 x2"
                        class="
                          size-24 shrink-0 rounded-lg bg-elevated object-cover
                        "
                      />
                      <span class="flex min-w-0 flex-col gap-1">
                        <span class="text-lg font-bold">{{ tile.label }}</span>
                        <span
                          class="
                            flex items-center gap-1 text-sm font-semibold
                            text-secondary
                          "
                        >
                          {{ tile.count }}
                          <UIcon
                            name="i-heroicons-arrow-right"
                            class="size-4"
                          />
                        </span>
                      </span>
                    </ULink>
                  </li>
                </ul>
                <ULink
                  :to="panel.allTo"
                  class="
                    inline-flex min-h-11 items-center gap-1.5 self-start
                    text-base font-semibold text-secondary
                  "
                >
                  {{ panel.allLabel }}
                  <UIcon
                    name="i-heroicons-arrow-right"
                    class="size-4"
                  />
                </ULink>
              </div>
            </template>
          </LazyUNavigationMenu>
          <ul
            class="
              flex items-center gap-3 pl-6 text-primary-950
              dark:border-primary-500 dark:text-primary-50
            "
          >
            <li
              v-if="tenantStore.isMultilingual"
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <LazyWebsideLanguageSwitcher hydrate-on-interaction />
            </li>
            <li
              v-if="savedPostsServing"
              class="
                relative grid max-w-6 items-center justify-center
                justify-items-center
              "
            >
              <UButton
                :aria-label="t('favourites')"
                :to="loggedIn ? localePath('account-favourites-posts') : localePath(signIn)"
                class="p-0"
                color="neutral"
                icon="i-heroicons-heart"
                size="xl"
                type="button"
                variant="ghost"
                :ui="{
                  base: `
                    cursor-pointer
                    hover:bg-transparent
                  `,
                }"
              />
            </li>
            <li
              class="
                relative grid max-w-6 items-center justify-center
                justify-items-center
              "
            >
              <UColorModeButton
                class="w-6"
                :ui="{
                  base: `
                    cursor-pointer p-0
                    hover:bg-transparent
                  `,
                  leadingIcon: 'size-6',
                }"
              />
            </li>
            <ClientOnly>
              <li
                v-if="loggedIn"
                class="
                  relative grid max-w-6 items-center justify-center
                  justify-items-center
                "
              >
                <LazyWebsideUserNotificationsBell />
              </li>
              <template #fallback>
                <li
                  v-if="loggedIn"
                  class="
                    relative grid max-w-6 items-center justify-center
                    justify-items-center
                  "
                >
                  <UButton
                    icon="i-heroicons-bell"
                    color="neutral"
                    size="xl"
                    variant="ghost"
                    class="p-0"
                    :ui="{
                      base: `
                        cursor-pointer
                        hover:bg-transparent
                      `,
                    }"
                  />
                </li>
              </template>
            </ClientOnly>
            <li
              v-if="cartEnabled"
              class="
                relative grid max-w-6 items-center justify-center
                justify-items-center
              "
            >
              <WebsideCartButton />
            </li>
            <li
              v-if="loggedIn && user"
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <UDropdownMenu
                :items="items"
                :popper="{ placement: 'bottom-start' }"
              >
                <!--
                  Reka's DropdownMenuTrigger forwards `type="button"`
                  to the element rendered by the default slot. When
                  that element was UserAvatar (a <div>), axe flagged
                  "Elements must only use supported ARIA attributes"
                  because `type` is not valid on <div>. Wrapping in
                  an explicit <button> gives Reka a real button to
                  set `type` on, and keeps the avatar visual.
                -->
                <button
                  type="button"
                  :aria-label="t('user.profile')"
                  data-clarity-mask="true"
                  class="cursor-pointer bg-transparent p-0"
                >
                  <UserAvatar
                    :show-name="false"
                    :user-account="user"
                  />
                </button>

                <template #account="{ item }">
                  <div
                    data-clarity-mask="true"
                    class="text-left"
                  >
                    <p>{{ t('email.title') }}</p>
                    <p
                      class="
                        truncate font-medium text-primary-900
                        dark:text-primary-50
                      "
                    >
                      {{ item.label }}
                    </p>
                  </div>
                </template>

                <template #item="{ item }">
                  <span class="truncate">{{ item.label }}</span>
                  <UIcon
                    v-if="item.icon"
                    :name="item.icon"
                    class="
                      ms-auto size-4 shrink-0 text-primary-900
                      dark:text-primary-100
                    "
                  />
                </template>
              </UDropdownMenu>
            </li>
            <li
              v-else
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <Anchor
                :title="t('login')"
                :aria-label="t('login')"
                :to="signIn"
                class="
                  flex size-[30px] items-center self-center text-[1.5rem]
                  text-primary-700
                  hover:text-primary-900
                  dark:text-primary-200
                  hover:dark:text-primary-50
                "
              >
                <UIcon name="i-fa6-solid-circle-user" />
                <span class="sr-only">{{ t('login') }}</span>
              </Anchor>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </WebsideBuilderNavbar>
</template>

<i18n lang="yaml">
el:
  navigation: Πλοήγηση
  user:
    profile: Προφίλ
  categories: Κατηγορίες
  topics: Θέματα
  open_section: "Μενού: {section}"
  products_count: "{count} προϊόν | {count} προϊόντα"
  articles_count: "{count} άρθρο | {count} άρθρα"
  all_products: Όλα τα προϊόντα
  all_articles: Όλα τα άρθρα
en:
  navigation: Navigation
  user:
    profile: Profile
  categories: Categories
  topics: Topics
  open_section: "{section} menu"
  products_count: "{count} product | {count} products"
  articles_count: "{count} article | {count} articles"
  all_products: All products
  all_articles: All articles
</i18n>
