<script lang="ts" setup>
const cartStore = useCartStore()
const { cleanCartState, refreshCart } = cartStore

const { user, loggedIn } = useUserSession()
const { deleteSession } = useAllAuthAuthentication()
const route = useRoute()
const { isMobileOrTablet } = useDevice()
const localePath = useLocalePath()
const { enabled } = useAuthPreviewMode()
const { $i18n } = useNuxtApp()

const searchBarFocused = useState<boolean>('searchBarFocused', () => false)

const onClickLogout = async () => {
  if (isRouteProtected(route.path))
    await navigateTo(localePath('index'))

  cleanCartState()

  try {
    await deleteSession()
    await refreshCart()
  }
  catch (error) {
    console.error('Error during logout:', error)
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
      label: $i18n.t('account'),
      icon: 'i-heroicons-user',
      onSelect: async () => await navigateTo(localePath('account')),
    },
    {
      label: $i18n.t('settings'),
      icon: 'i-heroicons-cog-8-tooth',
      onSelect: async () => await navigateTo(localePath('account-settings')),
    },
  ],
  [
    {
      label: $i18n.t('logout'),
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
      <LazySearchBar v-if="!isMobileOrTablet && route.path !== '/search'" v-model:search-bar-focused="searchBarFocused" />
      <div
        class="
          relative ml-auto hidden items-center

          lg:flex
        "
      >
        <nav
          aria-label="Main Navigation"
          class="
            text-primary-950 flex items-center text-lg font-semibold leading-6

            dark:text-primary-50
          "
        >
          <ul class="flex items-center gap-4">
            <template v-if="enabled">
              <li class="flex w-full gap-4">
                <h2>
                  <Anchor
                    :text="$i18n.t('shop')"
                    :title="$i18n.t('shop')"
                    :to="'products'"
                    class="
                      text-lg capitalize

                      hover:dark:text-primary-50
                    "
                  >
                    {{ $i18n.t('shop') }}
                  </Anchor>
                </h2>
              </li>
              <li class="flex w-full gap-4">
                <h2>
                  <Anchor
                    :text="$i18n.t('blog')"
                    :title="$i18n.t('blog')"
                    :to="'blog'"
                    class="
                      text-lg capitalize

                      hover:dark:text-primary-50
                    "
                  >
                    {{ $i18n.t('blog') }}
                  </Anchor>
                </h2>
              </li>
            </template>
          </ul>
          <ul
            class="
              text-primary-950 flex items-center gap-3 pl-6

              dark:text-primary-50 dark:border-primary-500
            "
          >
            <li
              v-if="enabled"
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <LazyLanguageSwitcher />
            </li>
            <li
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <UButton
                :aria-label="$i18n.t('favourites')"
                :to="localePath('account-favourites-posts')"
                class="p-0"
                color="neutral"
                icon="i-heroicons-heart"
                size="xl"
                type="button"
                variant="ghost"
                :ui="{
                  base: 'cursor-pointer hover:bg-transparent',
                }"
              />
            </li>
            <li
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <ThemeSwitcher />
            </li>
            <li
              v-if="loggedIn"
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <LazyUserNotificationsBell />
            </li>
            <li
              v-if="enabled"
              class="
                relative grid items-center justify-center justify-items-center
              "
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
                <LazyUserAvatar
                  :img-height="30"
                  :img-width="30"
                  :show-name="false"
                  :user-account="user"
                  aria-label="User profile"
                />

                <template #account="{ item }">
                  <div class="text-left">
                    <p>{{ $i18n.t('signed_in_as') }}</p>
                    <p
                      class="
                        text-primary-900 truncate font-medium

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
                      text-primary-900 ms-auto size-4 shrink-0

                      dark:text-primary-100
                    "
                  />
                </template>
              </UDropdownMenu>
            </li>
            <li
              v-if="!loggedIn"
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <Anchor
                :title="loggedIn ? $i18n.t('account') : $i18n.t('login')"
                :to="route.path === '/account/login' ? { name: 'account-login' } : { name: 'account-login', query: { next: route.path } }"
                class="
                  flex size-[30px] items-center self-center text-[1.5rem]

                  hover:dark:text-primary-50
                "
              >
                <UIcon name="i-fa6-solid-circle-user" />
              </Anchor>
            </li>
          </ul>
        </nav>
      </div>
    </template>
  </BuilderNavbar>
</template>
