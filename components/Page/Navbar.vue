<script lang="ts" setup>
import { AuthenticatedRoutePrefixes } from '~/constants'
import type { DropdownItem } from '#ui/types'

const Anchor = resolveComponent('Anchor')
const PlusModalLink = resolveComponent('PlusModalLink')

const userStore = useUserStore()
const { cleanAccountState } = userStore
const cartStore = useCartStore()
const { getCartTotalItems, pending } = storeToRefs(cartStore)
const { cleanCartState, refreshCart } = cartStore

const { user, session, loggedIn, clear } = useUserSession()
const { t } = useI18n()
const { logout } = useAuth()
const route = useRoute()
const localePath = useLocalePath()

const onClickLogout = async () => {
  await Promise.all([
    logout({
      refresh: session.value?.refreshToken,
    }),
    clear(),
  ])

  cleanCartState()
  cleanAccountState()

  await refreshCart()
}

const items = [
  [
    {
      label: user.value?.email,
      slot: 'account',
      disabled: true,
    },
  ],
  [
    {
      label: t('common.account'),
      icon: 'i-heroicons-user',
      click: async () => await navigateTo('/account'),
    },
    {
      label: t('common.settings'),
      icon: 'i-heroicons-cog-8-tooth',
      click: async () => await navigateTo('/account/settings'),
    },
  ],
  [
    {
      label: t('common.security'),
      icon: 'i-heroicons-shield-check',
      click: async () => await navigateTo('/auth/security'),
    },
  ],
  [
    {
      label: t('common.logout'),
      icon: 'i-heroicons-arrow-left-on-rectangle',
      click: async () => {
        const isRouteProtected = AuthenticatedRoutePrefixes.some(prefix =>
          route.path.startsWith(prefix),
        )
        if (isRouteProtected)
          navigateTo('/').then(async () => await onClickLogout())
        else await onClickLogout()
      },
    },
  ],
] as DropdownItem[][]
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
                class="
                  flex items-center gap-4 self-center text-lg

                  hover:text-slate-900 hover:no-underline
                  hover:dark:text-primary-50
                "
                :to="'search'"
                :title="$t('pages.search.title')"
                :text="$t('pages.search.title')"
              >
                <span class="capitalize">{{ $t('pages.search.title') }}</span>
                <IconFa6Solid:magnifyingGlass />
              </Anchor>
            </li>

            <DevOnly>
              <li class="flex w-full gap-4">
                <h2>
                  <Anchor
                    :to="'products'"
                    :title="$t('common.shop')"
                    :text="$t('common.shop')"
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
                    :to="'blog'"
                    :title="$t('common.blog')"
                    :text="$t('common.blog')"
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
            </DevOnly>
          </ul>
          <ul
            class="
              text-primary-950 ml-6 flex items-center gap-3 pl-6

              dark:text-primary-50 dark:border-primary-500
            "
          >
            <DevOnly>
              <li
                class="
                  relative grid items-center justify-center justify-items-center
                "
              >
                <LanguageSwitcher />
              </li>
            </DevOnly>
            <li
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <ThemeSwitcher />
            </li>
            <DevOnly>
              <li
                class="
                  relative grid items-center justify-center justify-items-center
                "
              >
                <ClientOnly>
                  <span
                    v-if="!pending.cart"
                    class="cart-items-count"
                    :data-count="getCartTotalItems"
                  />
                  <span v-if="pending.cart" class="cart-items-count" />

                  <template #fallback>
                    <span class="cart-items-count" />
                  </template>
                </ClientOnly>
                <Anchor
                  class="
                    flex items-center self-center text-[1.5rem]

                    hover:text-slate-900 hover:no-underline
                    hover:dark:text-primary-50
                  "
                  :to="'cart'"
                  :title="$t('pages.cart.title')"
                  :text="$t('pages.cart.title')"
                >
                  <IconFa6Solid:cartShopping />
                </Anchor>
              </li>
            </DevOnly>
            <li
              class="
                relative grid items-center justify-center justify-items-center
              "
            >
              <UDropdown
                v-if="loggedIn && user"
                :items="items"
                :ui="{ item: { disabled: 'cursor-text select-text' } }"
                :popper="{ placement: 'bottom-start' }"
              >
                <UserAvatar
                  :user-account="user"
                  :img-width="30"
                  :img-height="30"
                  :show-name="false"
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
              <Component
                :is="route.path === '/auth/login' ? Anchor : PlusModalLink"
                v-else
                class="
                  flex h-[30px] w-[30px] items-center self-center text-[1.5rem]

                  hover:text-slate-900 hover:no-underline
                  hover:dark:text-primary-50
                "
                :title="$t('pages.accounts.login.title')"
                :to="route.path === '/auth/login' ? localePath('/auth/login') : localePath(`/auth/login?redirect=${route.path}`)"
              >
                <IconFa6Solid:circleUser />
              </Component>

              <PlusModalPage v-if="route.path !== '/auth/login' && route.path !== '/auth/registration'" name="login-modal" />
              <PlusModalPage v-if="route.path !== '/auth/login' && route.path !== '/auth/registration'" name="registration-modal" />
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
    width: 70%;
    height: 70%;
    border-radius: 50%;
    background: #eb2e2b;
    cursor: pointer;
    color: #fff;
    font-size: 10px;
    pointer-events: none;
    right: -5px;
    z-index: 10;
    line-height: 16px;
  }
}
</style>
