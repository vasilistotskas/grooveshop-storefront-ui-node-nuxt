<script lang="ts" setup>
const cartStore = useCartStore()
const { cleanCartState, refreshCart } = cartStore

const { user, loggedIn } = useUserSession()
const { deleteSession } = useAllAuthAuthentication()
const route = useRoute()
const { t, locales } = useI18n()
const localePath = useLocalePath()
const { $routeBaseName } = useNuxtApp()
const { isMobileOrTablet } = useDevice()

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

const onClickLogout = async () => {
  if (!routeName.value) return
  if (isRouteProtected(String(routeName.value)))
    await navigateTo(localePath('index'))

  await cleanCartState()

  try {
    await deleteSession()
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
            <li class="flex w-full gap-4">
              <h2>
                <Anchor
                  :text="t('shop')"
                  :title="t('shop')"
                  :to="'products'"
                  :aria-current="isRouteActive('products') ? 'page' : undefined"
                  class="
                    relative text-lg capitalize transition-colors
                    after:absolute after:right-0 after:-bottom-1
                    after:left-0 after:h-0.5 after:bg-(--ui-secondary)
                    after:transition-transform after:duration-200
                    motion-reduce:after:transition-none
                  "
                  :class="
                    isRouteActive('products')
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
                  :ui="{
                    base: 'p-0',
                  }"
                >
                  {{ t('shop') }}
                </Anchor>
              </h2>
            </li>
            <li class="flex w-full gap-4">
              <h2>
                <Anchor
                  :text="t('blog')"
                  :title="t('blog')"
                  :to="'blog'"
                  :aria-current="isRouteActive('blog') ? 'page' : undefined"
                  class="
                    relative text-lg capitalize transition-colors
                    after:absolute after:right-0 after:-bottom-1
                    after:left-0 after:h-0.5 after:bg-(--ui-secondary)
                    after:transition-transform after:duration-200
                    motion-reduce:after:transition-none
                  "
                  :class="
                    isRouteActive('blog')
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
                  :ui="{
                    base: 'p-0',
                  }"
                >
                  {{ t('blog') }}
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
            <li class="relative grid max-w-6 items-center justify-center justify-items-center">
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
                <UserAvatar
                  :show-name="false"
                  :user-account="user"
                  :aria-label="t('user.profile')"
                  class="cursor-pointer"
                />

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
                :ui="{
                  base: 'p-0',
                }"
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
