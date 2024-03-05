<script lang="ts" setup>
import type { FunctionalComponent, SVGAttributes } from 'vue'

import userShield from '~icons/fa6-solid/user-shield'

interface IMenuItem {
	type: 'link' | 'button' | 'external-link'
	text: string
	href?: string
	route?: string | { name: string; path: string }
	icon?: FunctionalComponent<SVGAttributes>
	cssClass?: string
}

defineSlots<{
	image(props: {}): any
	drawer(props: {}): any
}>()

const { session, loggedIn, clear } = useUserSession()

const { t } = useI18n()
const { logout } = useAuth()

const userStore = useUserStore()
const { cleanAccountState } = userStore

const cartStore = useCartStore()
const { getCartTotalItems } = storeToRefs(cartStore)
const { cleanCartState, fetchCart } = cartStore

const authLogoutEvent = async () => {
	await navigateTo('/')
	await logout({
		refresh: session.value?.refreshToken
	})
	cleanCartState()
	cleanAccountState()
	await clear()
	await fetchCart()
}

const menus = computed((): IMenuItem[] => [
	{
		type: 'link',
		text: t('pages.accounts.security.title'),
		route: { name: 'auth-security', path: '/auth/security' },
		icon: userShield,
		cssClass:
			'text-primary-700 dark:text-primary-100 bg-zinc-200 border-gray-200 hover:bg-zinc-300 dark:border-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700'
	}
])
</script>

<template>
  <BuilderNavbar class="bg-zinc-200 dark:bg-zinc-800">
    <template #menu>
      <nav
        class="text-primary-700 dark:text-primary-100 hidden items-center text-lg font-semibold leading-6 md:flex"
      >
        <ul class="flex items-center gap-4">
          <li
            v-for="(item, i) in menus"
            :key="i"
            class="relative grid items-center justify-center justify-items-center"
          >
            <Anchor
              v-if="item.type === 'link'"
              :to="item.route ? item.route : undefined"
              :text="item.text"
              class="transition-color flex items-center rounded border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-600/[0.6] focus:ring-offset-1 focus:ring-offset-gray-800/[0.6] focus:dark:ring-gray-400 focus:dark:ring-offset-gray-50 md:block md:px-4 md:py-2"
              :class="[
                {
                  'grid-cols-auto-1fr gap-2': item.icon !== undefined
                },
                item.cssClass
              ]"
            >
              <span class="sr-only md:grid">{{ item.text }}</span>
              <Component :is="item.icon" />
            </Anchor>
            <Anchor
              v-if="item.type === 'external-link'"
              :href="item.href"
              :text="item.text"
              class="transition-color flex items-center rounded border px-2 py-1 duration-300 focus:outline-none focus:ring-1 focus:ring-gray-600/[0.6] focus:ring-offset-1 focus:ring-offset-gray-800/[0.6] focus:dark:ring-gray-400 focus:dark:ring-offset-gray-50 md:grid md:px-4 md:py-2"
              :class="[
                {
                  'grid-cols-auto-1fr gap-2': item.icon !== undefined
                },
                item.cssClass
              ]"
            >
              <span class="sr-only md:grid">{{ item.text }}</span>
              <Component :is="item.icon" />
            </Anchor>
            <UButton
              v-else-if="item.type === 'button'"
              size="xs"
              class="font-extrabold capitalize"
              :label="item.text"
              :to="item.route ? item.route : undefined"
              color="white"
            />
          </li>
          <li class="relative grid items-center justify-center justify-items-center">
            <UButton
              size="md"
              :label="$t('pages.accounts.logout.title')"
              class="text-primary-700 dark:text-primary-100 gap-2 border-gray-200 bg-zinc-200 hover:bg-zinc-300 dark:border-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              :trailing="false"
              icon="i-heroicons-arrow-left-start-on-rectangle"
              color="white"
              @click="authLogoutEvent"
            />
          </li>
        </ul>
      </nav>
      <div class="sr-only relative ml-auto items-center lg:flex">
        <div class="flex items-center justify-center">
          <slot name="image" />
        </div>
        <ul
          class="text-primary-700 dark:text-primary-100 ml-6 flex items-center gap-3 border-l border-gray-900/10 pl-6 dark:border-gray-50/[0.2]"
        >
          <li class="relative grid items-center justify-center justify-items-center">
            <LanguageSwitcher />
          </li>
          <li class="relative grid items-center justify-center justify-items-center">
            <ThemeSwitcher />
          </li>
          <li class="relative grid items-center justify-center justify-items-center">
            <span class="cart-items-count" :data-count="getCartTotalItems" />
            <Anchor
              class="flex items-center self-center text-[1.5rem] hover:text-slate-900 hover:no-underline hover:dark:text-white"
              :to="'cart'"
              :title="$t('pages.cart.title')"
              :text="$t('pages.cart.title')"
            >
              <span class="sr-only">{{ $t('pages.cart.title') }}</span>
              <IconFa6Solid:cartShopping />
            </Anchor>
          </li>
          <li class="relative grid items-center justify-center justify-items-center">
            <UButton
              icon="i-heroicons-user"
              :to="loggedIn ? '/account' : `/auth/login?redirect=${$route.path}`"
              size="md"
              variant="solid"
              color="white"
              :label="loggedIn ? $t('common.account') : $t('common.login')"
            >
              {{ loggedIn ? $t('common.account') : $t('common.login') }}
            </UButton>
          </li>
        </ul>
      </div>
    </template>
    <template #options="{ toggleOptions }">
      <ActionSheet @on-close="toggleOptions(false)">
        <ActionSheetBody class="grid gap-4">
          <ActionSheetHeader text="Menu" />
          <nav class="text-primary-700 dark:text-primary-100 font-semibold leading-6">
            <ul
              class="flex flex-row items-center justify-center gap-2 border-b border-gray-900/10 dark:border-gray-50/[0.2]"
            >
              <li class="link grid gap-2 pb-2">
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
              <li class="link grid gap-2 pb-2">
                <UButton
                  icon="i-heroicons-user"
                  :to="loggedIn ? '/account' : `/auth/login?redirect=${$route.path}`"
                  size="md"
                  variant="solid"
                  color="white"
                  :label="loggedIn ? $t('common.account') : $t('common.login')"
                >
                  {{ loggedIn ? $t('common.account') : $t('common.login') }}
                </UButton>
                <UButton
                  v-if="loggedIn"
                  icon="i-heroicons-shield-check"
                  to="/auth/security"
                  size="md"
                  variant="solid"
                  color="white"
                  :label="$t('pages.accounts.security.title')"
                >
                  {{ $t('pages.accounts.security.title') }}
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
            class="text-primary-700 dark:text-primary-100 flex items-center justify-center gap-2 self-center text-lg hover:text-slate-900 hover:no-underline hover:dark:text-white"
            :to="'cart'"
            :title="$t('pages.cart.title')"
            :text="$t('pages.cart.title')"
          >
            <IconFa6Solid:cartShopping />
            <span class="text-primary-700 dark:text-primary-100 ml-1">
              {{ $t('pages.cart.title') }}</span>
          </Anchor>
          <UButton
            size="md"
            :label="$t('pages.accounts.logout.title')"
            class="text-primary-700 dark:text-primary-100"
            :trailing="false"
            icon="i-heroicons-arrow-left-start-on-rectangle"
            color="red"
            @click="authLogoutEvent"
          />
        </ActionSheetBody>
        <UButton
          :label="$t('common.close')"
          color="white"
          @click.prevent="toggleOptions(false)"
        />
      </ActionSheet>
    </template>
    <template #drawer>
      <slot name="drawer" />
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
