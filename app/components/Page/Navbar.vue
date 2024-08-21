<script lang="ts" setup>
const userStore = useUserStore()
const { cleanAccountState } = userStore
const cartStore = useCartStore()
const { getCartTotalItems, pending } = storeToRefs(cartStore)
const { cleanCartState, refreshCart } = cartStore

const { user, loggedIn } = useUserSession()
const { t } = useI18n()
const { deleteSession } = useAllAuthAuthentication()
const route = useRoute()
const localePath = useLocalePath()
const { enabled } = useAuthPreviewMode()

const onClickLogout = async () => {
  if (isRouteProtected(route.path))
    await navigateTo(localePath('/'))

  await deleteSession()

  cleanCartState()
  cleanAccountState()

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
      label: t('common.account'),
      icon: 'i-heroicons-user',
      click: async () => await navigateTo(localePath('/account')),
    },
    {
      label: t('common.settings'),
      icon: 'i-heroicons-cog-8-tooth',
      click: async () => await navigateTo(localePath('/account/settings')),
    },
  ],
  [
    {
      label: t('common.logout'),
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
          <ul class="flex items-center space-x-8">
            <li
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <Anchor
                :text="$t('pages.search.title')"
                :title="$t('pages.search.title')"
                :to="'search'"
                class="
                  flex items-center gap-4 self-center text-lg

                  hover:text-slate-900 hover:no-underline
                  hover:dark:text-primary-50
                "
              >
                <span class="capitalize">{{ $t('pages.search.title') }}</span>
                <UIcon name="i-fa6-solid-magnifying-glass" />
              </Anchor>
            </li>

            <template v-if="enabled">
              <li class="flex w-full gap-4">
                <h2>
                  <Anchor
                    :text="$t('common.shop')"
                    :title="$t('common.shop')"
                    :to="'products'"
                    class="
                      text-lg capitalize

                      hover:text-slate-900 hover:no-underline
                      hover:dark:text-primary-50
                    "
                  >
                    {{ $t('common.shop') }}
                  </Anchor>
                </h2>
              </li>
              <li class="flex w-full gap-4">
                <h2>
                  <Anchor
                    :text="$t('common.blog')"
                    :title="$t('common.blog')"
                    :to="'blog'"
                    class="
                      text-lg capitalize

                      hover:text-slate-900 hover:no-underline
                      hover:dark:text-primary-50
                    "
                  >
                    {{ $t('common.blog') }}
                  </Anchor>
                </h2>
              </li>
            </template>
          </ul>
          <ul
            class="
              text-primary-950 ml-6 flex items-center gap-3 pl-6

              dark:text-primary-50 dark:border-primary-500
            "
          >
            <template v-if="enabled">
              <li
                class="
                  relative grid items-center justify-center justify-items-center
                "
              >
                <LanguageSwitcher />
              </li>
            </template>
            <li
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <UButton
                :aria-label="$t('common.favourites')"
                :to="localePath('/account/favourites/posts')"
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
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <UserNotifications v-if="loggedIn" />
            </li>
            <template v-if="enabled">
              <li
                class="
                  relative grid items-center justify-center justify-items-center
                "
              >
                <UChip
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
                    :aria-label="$t('pages.cart.title')"
                    :title="$t('pages.cart.title')"
                    :to="localePath('cart')"
                  />
                </UChip>
              </li>
            </template>
            <li
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <UDropdown
                v-if="loggedIn && user"
                :items="items"
                :popper="{ placement: 'bottom-start' }"
                :ui="{ item: { disabled: 'cursor-text select-text' } }"
              >
                <UserAvatar
                  :img-height="30"
                  :img-width="30"
                  :show-name="false"
                  :user-account="user"
                />

                <template #account="{ item }">
                  <div class="text-left">
                    <p>{{ $t('common.signed_in_as') }}</p>
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
                      text-primary-900 ms-auto h-4 w-4 flex-shrink-0

                      dark:text-primary-100
                    "
                  />
                </template>
              </UDropdown>
              <Anchor
                v-else
                :title="loggedIn ? $t('common.account') : $t('common.login')"
                :to="route.path === '/account/login' ? '/account/login' : `/account/login?next=${route.path}`"
                class="
                  flex h-[30px] w-[30px] items-center self-center text-[1.5rem]

                  hover:text-slate-900 hover:no-underline
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
