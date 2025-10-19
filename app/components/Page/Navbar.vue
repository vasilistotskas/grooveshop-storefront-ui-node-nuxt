<script lang="ts" setup>
const cartStore = useCartStore()
const { cleanCartState, refreshCart } = cartStore

const { user, loggedIn } = useUserSession()
const { deleteSession } = useAllAuthAuthentication()
const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()
const { enabled } = useAuthPreviewMode()
const { $i18n, $routeBaseName } = useNuxtApp()
const { isMobileOrTablet } = useDevice()

const routeName = computed(() => $routeBaseName(route))

const onClickLogout = async () => {
  if (!routeName.value) return
  if (isRouteProtected(routeName.value))
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
            <template v-if="enabled">
              <li class="flex w-full gap-4">
                <h2>
                  <Anchor
                    :text="$i18n.t('shop')"
                    :title="$i18n.t('shop')"
                    :to="'products'"
                    class="
                      text-lg text-primary-700 capitalize
                      hover:text-primary-900
                      dark:text-primary-200
                      hover:dark:text-primary-50
                    "
                    :ui="{
                      base: 'p-0',
                    }"
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
                      text-lg text-primary-700 capitalize
                      hover:text-primary-900
                      dark:text-primary-200
                      hover:dark:text-primary-50
                    "
                    :ui="{
                      base: 'p-0',
                    }"
                  >
                    {{ $i18n.t('blog') }}
                  </Anchor>
                </h2>
              </li>
            </template>
          </ul>
          <ul
            class="
              flex items-center gap-3 pl-6 text-primary-950
              dark:border-primary-500 dark:text-primary-50
            "
          >
            <li
              v-if="enabled"
              class="
                relative grid max-w-6 items-center justify-center
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
                :aria-label="$i18n.t('favourites')"
                :to="loggedIn ? localePath('account-favourites-posts') : localePath('account-login')"
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
                relative grid max-w-6 items-center justify-center
                justify-items-center
              "
            >
              <UColorModeButton
                class="w-6"
                :ui="{
                  base: 'cursor-pointer hover:bg-transparent p-0',
                  leadingIcon: 'size-6',
                }"
              />
            </li>
            <li
              v-if="loggedIn"
              class="
                relative grid max-w-6 items-center justify-center
                justify-items-center
              "
            >
              <LazyUserNotificationsBell />
            </li>
            <li
              v-if="enabled"
              class="
                relative grid max-w-6 items-center justify-center
                justify-items-center
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
                <UserAvatar
                  :img-height="30"
                  :img-width="30"
                  :show-name="false"
                  :user-account="user"
                  :aria-label="t('user.profile')"
                />

                <template #account="{ item }">
                  <div class="text-left">
                    <p>{{ $i18n.t('email.title') }}</p>
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
