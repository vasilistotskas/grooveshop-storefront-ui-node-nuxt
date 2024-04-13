<script lang="ts" setup>
const { user, loggedIn } = useUserSession()

const cartStore = useCartStore()
const { getCartTotalItems, pending } = storeToRefs(cartStore)
</script>

<template>
  <BuilderNavbar class="bg-zinc-50 dark:bg-zinc-900">
    <template #menu>
      <div class="relative ml-auto hidden items-center lg:flex">
        <nav
          aria-label="Main Navigation"
          class="text-primary-800 dark:text-primary-100 flex items-center text-lg font-semibold leading-6"
        >
          <ul class="flex items-center space-x-8">
            <li
              class="relative grid items-center justify-center justify-items-center"
            >
              <Anchor
                class="flex items-center gap-4 self-center text-lg hover:text-slate-900 hover:no-underline hover:dark:text-white"
                :to="'search'"
                :title="$t('pages.search.title')"
                :text="$t('pages.search.title')"
              >
                <span class="capitalize">{{ $t('pages.search.title') }}</span>
                <IconFa6Solid:magnifyingGlass />
              </Anchor>
            </li>
            <li class="flex w-full gap-4">
              <h2>
                <Anchor
                  :to="'products'"
                  :title="$t('common.shop')"
                  :text="$t('common.shop')"
                  class="text-lg capitalize hover:text-slate-900 hover:no-underline hover:dark:text-white"
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
                  class="text-lg capitalize hover:text-slate-900 hover:no-underline hover:dark:text-white"
                >
                  {{ $t('common.blog') }}
                </Anchor>
              </h2>
            </li>
          </ul>
          <ul
            class="text-primary-800 dark:text-primary-100 ml-6 flex items-center gap-3 border-l border-gray-900/10 pl-6 dark:border-gray-50/[0.2]"
          >
            <li
              class="relative grid items-center justify-center justify-items-center"
            >
              <LanguageSwitcher />
            </li>
            <li
              class="relative grid items-center justify-center justify-items-center"
            >
              <ThemeSwitcher />
            </li>
            <li
              class="relative grid items-center justify-center justify-items-center"
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
                class="flex items-center self-center text-[1.5rem] hover:text-slate-900 hover:no-underline hover:dark:text-white"
                :to="'cart'"
                :title="$t('pages.cart.title')"
                :text="$t('pages.cart.title')"
              >
                <IconFa6Solid:cartShopping />
              </Anchor>
            </li>
            <li
              class="relative grid items-center justify-center justify-items-center"
            >
              <Anchor
                v-if="loggedIn && user"
                class="flex items-center self-center text-[1.5rem] hover:text-slate-900 hover:no-underline hover:dark:text-white"
                :title="$t('pages.accounts.login.title')"
                :text="$t('pages.accounts.login.title')"
                :to="'account'"
              >
                <UserAvatar
                  :user-account="user"
                  :img-width="30"
                  :img-height="30"
                  :show-name="false"
                />
              </Anchor>
              <Anchor
                v-else
                class="flex h-[30px] w-[30px] items-center self-center text-[1.5rem] hover:text-slate-900 hover:no-underline hover:dark:text-white"
                :title="$t('pages.accounts.login.title')"
                :text="$t('pages.accounts.login.title')"
                :to="`/auth/login?redirect=${$route.path}`"
              >
                <IconFa6Solid:circleUser />
              </Anchor>
            </li>
          </ul>
        </nav>
      </div>
    </template>
    <template #options="{ toggleOptions }">
      <ActionSheet @on-close="toggleOptions(false)">
        <ActionSheetBody class="grid gap-4">
          <ActionSheetHeader text="Menu" />
          <nav
            aria-label="Main Navigation"
            class="text-primary-800 dark:text-primary-100 font-semibold leading-6"
          >
            <ul
              class="flex flex-row items-center justify-center gap-2 border-b border-gray-900/10 dark:border-gray-50/[0.2]"
            >
              <li class="link grid pb-2">
                <UButton
                  icon="i-heroicons-shopping-bag"
                  :to="'/products'"
                  size="md"
                  variant="solid"
                  color="white"
                  :label="$t('common.shop')"
                >
                  {{ $t('common.shop') }}
                </UButton>
              </li>
              <li class="link grid pb-2">
                <UButton
                  icon="i-heroicons-user"
                  :to="
                    loggedIn
                      ? '/account'
                      : `/auth/login?redirect=${$route.path}`
                  "
                  size="md"
                  variant="solid"
                  color="white"
                  :label="loggedIn ? $t('common.account') : $t('common.login')"
                >
                  {{ loggedIn ? $t('common.account') : $t('common.login') }}
                </UButton>
              </li>
              <li class="link grid pb-2">
                <UButton
                  icon="i-heroicons-magnifying-glass"
                  :to="'/search'"
                  size="md"
                  variant="solid"
                  color="white"
                  :label="$t('common.search')"
                >
                  {{ $t('common.search') }}
                </UButton>
              </li>
            </ul>
          </nav>
          <div class="flex items-center justify-center gap-3">
            <div class="grid items-center justify-center justify-items-center">
              <ThemeSwitcher type="select-box" />
            </div>
            <div class="grid items-center justify-center justify-items-center">
              <LanguageSwitcher type="select-box" />
            </div>
          </div>
          <Anchor
            class="text-primary-800 dark:text-primary-100 flex items-center justify-center gap-2 self-center text-lg hover:text-slate-900 hover:no-underline hover:dark:text-white"
            :to="'cart'"
            :title="$t('pages.cart.title')"
            :text="$t('pages.cart.title')"
          >
            <IconFa6Solid:cartShopping />
            <span class="text-primary-800 dark:text-primary-100 ml-1">
              {{ $t('pages.cart.title') }}</span>
          </Anchor>
        </ActionSheetBody>
        <UButton
          :label="$t('common.close')"
          color="white"
          @click.prevent="toggleOptions(false)"
        />
      </ActionSheet>
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
