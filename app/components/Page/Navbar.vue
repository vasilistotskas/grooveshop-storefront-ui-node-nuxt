<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'

const cartStore = useCartStore()
const { cleanCartState, refreshCart } = cartStore

const { user, loggedIn } = useUserSession()
const { deleteSession } = useAllAuthAuthentication()
const route = useRoute()
const { t, locales } = useI18n()
const localePath = useLocalePath()
const { $routeBaseName } = useNuxtApp()
const { isMobileOrTablet } = useDevice()

const tenantStore = useTenantStore()

// Gift-card purchase page discoverability — two-tier gate (tenant
// plan flag AND merchant runtime setting), fail-closed like every
// commercial feature.
const giftCardsRuntimeEnabled = useSettingFlag('GIFT_CARDS_ENABLED', {
  fallback: false,
})

// Cart chrome for shop-dark tenants (content site now, eshop later).
// Shopper-facing chrome fails OPEN.
const cartEnabled = useSettingFlag('CART_ENABLED', { fallback: true })
const giftCardsEnabled = computed(
  () => tenantStore.giftCardsEnabled && giftCardsRuntimeEnabled.value,
)

// Offers page discoverability. Same two-tier, fail-closed shape as
// gift cards: without it the store's automatic promotions stay
// invisible until a shopper has already built a qualifying cart.
const promotionsRuntimeEnabled = useSettingFlag('PROMOTIONS_ENABLED', {
  fallback: false,
})
const promotionsEnabled = computed(
  () => tenantStore.promotionsEnabled && promotionsRuntimeEnabled.value,
)

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

interface DesktopNavItem {
  key: string
  label: string
  to?: RouteLocationNamedI18n
  href?: string
  active: boolean
}

const navItems = computed<DesktopNavItem[]>(() => {
  // Operator-configured header menu wins; the code list below keeps
  // the platform chrome for unconfigured tenants — same contract as
  // BurgerMenu's primaryItems.
  const configured = headerItems.value
  if (configured) {
    return configured.map((item, index) => ({
      key: `configured-${index}-${item.label}`,
      label: item.label,
      // Operator items carry paths, which NuxtLinkLocale accepts at
      // runtime; the named-route type is narrower than reality here.
      to: item.to as RouteLocationNamedI18n | undefined,
      href: item.to ? undefined : item.href,
      active: isPathActive(item.to),
    }))
  }
  const base: DesktopNavItem[] = [
    {
      key: 'products',
      label: t('shop'),
      to: 'products',
      active: isRouteActive('products'),
    },
  ]
  if (tenantStore.blogEnabled) {
    base.push({
      key: 'blog',
      label: t('blog'),
      to: 'blog',
      active: isRouteActive('blog'),
    })
  }
  if (promotionsEnabled.value) {
    base.push({
      key: 'offers',
      label: t('offers'),
      to: 'offers',
      active: isRouteActive('offers'),
    })
  }
  if (giftCardsEnabled.value) {
    base.push({
      key: 'gift-cards',
      label: t('gift_cards'),
      to: 'gift-cards',
      active: isRouteActive('gift-cards'),
    })
  }
  return base
})

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
  <BuilderNavbar
    class="
      bg-primary-100
      dark:bg-primary-900
    "
  >
    <template #menu>
      <LazySearchInput v-if="!isMobileOrTablet" />
      <div
        class="
          relative ml-auto hidden items-center
          lg:flex
        "
      >
        <nav
          :aria-label="t('navigation')"
          class="
            flex items-center text-lg leading-6 font-semibold text-primary-950
            dark:text-primary-50
          "
        >
          <ul class="flex items-center gap-4">
            <li
              v-for="item in navItems"
              :key="item.key"
              class="flex w-full gap-4"
            >
              <h2>
                <Anchor
                  :text="item.label"
                  :title="item.label"
                  :to="item.to"
                  :href="item.href ?? ''"
                  :aria-current="item.active ? 'page' : undefined"
                  class="
                    relative text-lg capitalize transition-colors
                    after:absolute after:right-0 after:-bottom-1
                    after:left-0 after:h-0.5 after:bg-(--ui-secondary)
                    after:transition-transform after:duration-200
                    motion-reduce:after:transition-none
                  "
                  :class="
                    item.active
                      ? `
                          font-bold text-primary-900
                          dark:text-primary-50
                          after:scale-x-100
                        `
                      : `
                          text-primary-700
                          hover:text-primary-900
                          dark:text-primary-200
                          hover:dark:text-primary-50
                          after:scale-x-0
                        `
                  "
                >
                  {{ item.label }}
                </Anchor>
              </h2>
            </li>
          </ul>
          <ul
            class="
              flex items-center gap-3 pl-6 text-primary-950
              dark:border-primary-500 dark:text-primary-50
            "
          >
            <li
              v-if="locales.length > 1"
              class="
                relative grid items-center justify-center
                justify-items-center
              "
            >
              <LazyLanguageSwitcher />
            </li>
            <li
              v-if="tenantStore.blogEnabled"
              class="
                  relative grid max-w-6 items-center justify-center
                  justify-items-center
                "
            >
              <UButton
                :aria-label="t('favourites')"
                :to="loggedIn ? localePath('account-favourites-posts') : localePath('account-login')"
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
                <LazyUserNotificationsBell />
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
              class="relative grid max-w-6 items-center justify-center justify-items-center"
            >
              <CartButton />
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
                  class="cursor-pointer bg-transparent p-0"
                >
                  <UserAvatar
                    :show-name="false"
                    :user-account="user"
                  />
                </button>

                <template #account="{ item }">
                  <div class="text-left">
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
                :to="route.path === '/account/login' ? { name: 'account-login' } : { name: 'account-login', query: { next: route.path } }"
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
        </nav>
      </div>
    </template>
  </BuilderNavbar>
</template>

<i18n lang="yaml">
el:
  navigation: Πλοήγηση
  user:
    profile: Προφίλ
</i18n>
