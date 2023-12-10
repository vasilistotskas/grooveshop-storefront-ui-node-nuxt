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

const { t } = useLang()
const config = useRuntimeConfig()

const { isAuthenticated } = useAuthSession()
const { logout } = useAuth()

const userStore = useUserStore()
const { cleanAccountState } = userStore

const cartStore = useCartStore()
const { getCartTotalItems } = storeToRefs(cartStore)
const { cleanCartState, fetchCart } = cartStore

const authLogoutEvent = async () => {
	await logout()
	cleanAccountState()
	cleanCartState()
	await fetchCart()
	const idb = await useAsyncIDBKeyval('auth', false)
	idb.value = false
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
	<BuilderNavbar>
		<template #menu>
			<nav
				class="flex items-center text-lg leading-6 font-semibold text-primary-700 dark:text-primary-100"
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
							class="flex md:grid py-1 px-2 md:py-2 md:px-4 items-center border rounded transition-color duration-300 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:dark:ring-offset-gray-50 focus:dark:ring-gray-400 focus:ring-gray-600/[0.6] focus:ring-offset-gray-800/[0.6]"
							:class="[
								{
									'grid-cols-auto-1fr gap-2': item.icon !== undefined
								},
								item.cssClass
							]"
						>
							<span class="hidden md:grid">{{ item.text }}</span>
							<Component :is="item.icon" />
						</Anchor>
						<Anchor
							v-if="item.type === 'external-link'"
							:href="item.href"
							:text="item.text"
							class="flex md:grid py-1 px-2 md:py-2 md:px-4 items-center border rounded transition-color duration-300 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:dark:ring-offset-gray-50 focus:dark:ring-gray-400 focus:ring-gray-600/[0.6] focus:ring-offset-gray-800/[0.6]"
							:class="[
								{
									'grid-cols-auto-1fr gap-2': item.icon !== undefined
								},
								item.cssClass
							]"
						>
							<span class="hidden md:grid">{{ item.text }}</span>
							<Component :is="item.icon" />
						</Anchor>
						<MainButton
							v-else-if="item.type === 'button'"
							:text="item.text"
							size="xs"
							class="font-extrabold capitalize"
							:to="item.route ? item.route : undefined"
							:href="item.href ? item.href : undefined"
						/>
					</li>
					<li class="relative grid items-center justify-center justify-items-center">
						<MainButton
							size="md"
							type="button"
							:style="'danger'"
							:text="$t('pages.accounts.logout.title')"
							class="gap-2 text-primary-700 dark:text-primary-100 bg-zinc-200 border-gray-200 hover:bg-zinc-300 dark:border-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700"
							@click="authLogoutEvent"
						>
							<span class="hidden md:grid">
								{{ $t('common.logout') }}
							</span>
							<IconFluent:doorArrowRight28Regular />
						</MainButton>
					</li>
				</ul>
			</nav>
			<div class="relative hidden lg:flex items-center ml-auto">
				<div class="flex items-center justify-center">
					<slot name="image" />
				</div>
				<ul
					class="flex items-center gap-3 border-l ml-6 pl-6 border-gray-900/10 dark:border-gray-50/[0.2] text-primary-700 dark:text-primary-100"
				>
					<li class="relative grid items-center justify-center justify-items-center">
						<LanguageSwitcher />
					</li>
					<li class="relative grid items-center justify-center justify-items-center">
						<ThemeSwitcher />
					</li>
					<li class="relative grid items-center justify-center justify-items-center">
						<span class="cart-items-count" :data-count="getCartTotalItems"></span>
						<Anchor
							class="hover:no-underline hover:text-slate-900 hover:dark:text-white text-[1.5rem] flex self-center items-center"
							:to="'cart'"
							:title="$t('pages.cart.title')"
							:text="$t('pages.cart.title')"
						>
							<IconFa6Solid:cartShopping />
						</Anchor>
					</li>
					<li class="relative grid items-center justify-center justify-items-center">
						<Anchor
							v-if="isAuthenticated"
							class="hover:no-underline hover:text-slate-900 hover:dark:text-white text-[1.5rem] flex self-center items-center"
							:title="$t('pages.accounts.login.title')"
							:text="$t('pages.accounts.login.title')"
							:to="'account'"
						>
							<IconFa6Solid:circleUser />
						</Anchor>
						<Anchor
							v-else
							class="hover:no-underline hover:text-slate-900 hover:dark:text-white text-[1.5rem] flex self-center items-center"
							:title="$t('pages.accounts.login.title')"
							:text="$t('pages.accounts.login.title')"
							:href="`${config.public.djangoUrl}/accounts/login/`"
						>
							<IconFa6Solid:circleUser />
						</Anchor>
					</li>
				</ul>
			</div>
		</template>
		<template #options="{ toggleOptions }">
			<ActionSheet @on-close="toggleOptions(false)">
				<ActionSheetBody class="grid gap-4">
					<ActionSheetHeader text="Menu" />
					<nav class="leading-6 font-semibold text-primary-700 dark:text-primary-100">
						<ul
							class="flex items-center justify-center flex-row gap-2 border-b border-gray-900/10 dark:border-gray-50/[0.2]"
						>
							<li class="grid pb-2 link">
								<UButton
									icon="i-heroicons-shopping-bag"
									:to="'/products'"
									size="md"
									variant="solid"
									color="white"
									:label="$t('common.shop')"
									>{{ $t('common.shop') }}</UButton
								>
							</li>
							<li class="grid pb-2 link">
								<UButton
									icon="i-heroicons-user"
									:to="
										isAuthenticated ? '/account' : `/auth/login?redirect=${$route.path}`
									"
									size="md"
									variant="solid"
									color="white"
									:label="isAuthenticated ? $t('common.account') : $t('common.login')"
									>{{
										isAuthenticated ? $t('common.account') : $t('common.login')
									}}</UButton
								>
							</li>
							<li class="grid pb-2 link">
								<UButton
									icon="i-heroicons-magnifying-glass"
									:to="'/search'"
									size="md"
									variant="solid"
									color="white"
									:label="$t('common.search')"
									>{{ $t('common.search') }}</UButton
								>
							</li>
						</ul>
					</nav>
					<div class="flex gap-3 items-center justify-center">
						<div class="grid items-center justify-center justify-items-center">
							<ThemeSwitcher type="select-box" />
						</div>
						<div class="grid items-center justify-center justify-items-center">
							<LanguageSwitcher type="select-box" />
						</div>
					</div>
					<Anchor
						class="text-primary-700 dark:text-primary-100 hover:no-underline hover:text-slate-900 hover:dark:text-white text-lg flex self-center items-center justify-center gap-2"
						:to="'cart'"
						:title="$t('pages.cart.title')"
						:text="$t('pages.cart.title')"
					>
						<IconFa6Solid:cartShopping />
						<span class="ml-1 text-primary-700 dark:text-primary-100">
							{{ $t('pages.cart.title') }}</span
						>
					</Anchor>
				</ActionSheetBody>
				<MainButton
					text="Close"
					type="button"
					:style="'secondary'"
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
