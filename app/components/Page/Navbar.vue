<script lang="ts" setup>
const cartStore = useCartStore()
const { getCartTotalItems, pending } = storeToRefs(cartStore)
const { cleanCartState, refreshCart } = cartStore

const { user, loggedIn } = useUserSession()
const { t } = useI18n({ useScope: 'local' })
const { deleteSession } = useAllAuthAuthentication()
const route = useRoute()
const { isMobileOrTablet } = useDevice()
const localePath = useLocalePath()
const { enabled } = useAuthPreviewMode()

const searchBarFocused = useState<boolean>('searchBarFocused', () => false)

const onClickLogout = async () => {
  if (isRouteProtected(route.path))
    await navigateTo(localePath('index'))

  try {
    await deleteSession()
  }
  catch {
    // do nothing
  }

  cleanCartState()

  await refreshCart()
}

const items = computed(() => [
  [
    {
      label: user.value?.email ?? '',
      slot: 'account',
      disabled: true,
    },
  ],
  [
    {
      label: t('account'),
      icon: 'i-heroicons-user',
      click: async () => await navigateTo(localePath('account')),
    },
    {
      label: t('settings'),
      icon: 'i-heroicons-cog-8-tooth',
      click: async () => await navigateTo(localePath('account-settings')),
    },
  ],
  [
    {
      label: t('logout'),
      icon: 'i-heroicons-arrow-left-on-rectangle',
      click: async () => await onClickLogout(),
    },
  ],
])
</script>

<template>
  <BuilderNavbar
    class="
      bg-primary-50

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
                    :text="$t('shop')"
                    :title="$t('shop')"
                    :to="'products'"
                    class="
                      text-lg capitalize

                      hover:dark:text-primary-50
                    "
                  >
                    {{ $t('shop') }}
                  </Anchor>
                </h2>
              </li>
              <li class="flex w-full gap-4">
                <h2>
                  <Anchor
                    :text="$t('blog')"
                    :title="$t('blog')"
                    :to="'blog'"
                    class="
                      text-lg capitalize

                      hover:dark:text-primary-50
                    "
                  >
                    {{ $t('blog') }}
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
            <template v-if="enabled">
              <li
                class="
                  relative grid items-center justify-center justify-items-center
                "
              >
                <LazyLanguageSwitcher />
              </li>
            </template>
            <li
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <UButton
                :aria-label="$t('favourites')"
                :to="localePath('account-favourites-posts')"
                class="p-0"
                color="black"
                icon="i-heroicons-heart"
                size="xl"
                type="button"
                variant="ghost"
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
            <template v-if="enabled">
              <li
                class="
                  relative grid items-center justify-center justify-items-center
                "
              >
                <LazyUChip
                  :key="'cart'"
                  size="xl"
                  color="green"
                  :show="!pending.cart"
                  :text="getCartTotalItems"
                >
                  <UButton
                    class="p-0"
                    icon="i-heroicons-shopping-cart"
                    size="xl"
                    :color="'primary'"
                    :aria-label="t('cart')"
                    :title="t('cart')"
                    :to="localePath('cart')"
                  />
                </LazyUChip>
              </li>
            </template>
            <li
              v-if="loggedIn && user"

              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <LazyUDropdown
                :items="items"
                :popper="{ placement: 'bottom-start' }"
                :ui="{ item: { disabled: 'cursor-text select-text' } }"
              >
                <LazyUserAvatar
                  :img-height="30"
                  :img-width="30"
                  :show-name="false"
                  :user-account="user"
                />

                <template #account="{ item }">
                  <div class="text-left">
                    <p>{{ $t('signed_in_as') }}</p>
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
                    :name="item.icon"
                    class="
                      text-primary-900 ms-auto size-4 shrink-0

                      dark:text-primary-100
                    "
                  />
                </template>
              </LazyUDropdown>
            </li>
            <li
              v-else
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <Anchor
                :title="loggedIn ? $t('account') : $t('login')"
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

<style lang="scss" scoped>
.cart-items-count {
  &::before {
    content: attr(data-count);
    display: grid;
    position: absolute;
    top: -5px;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #eb2e2b;
    cursor: pointer;
    color: #fff;
    font-size: 10px;
    pointer-events: none;
    right: -5px;
    z-index: 10;
    line-height: 18px;
  }
}
</style>

<i18n lang="yaml">
el:
  cart: Καλάθι
</i18n>
