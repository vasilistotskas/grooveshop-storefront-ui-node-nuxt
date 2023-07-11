<script lang="ts" setup>
import { FunctionalComponent, SVGAttributes } from 'vue'
import userShield from '~icons/fa6-solid/user-shield'
import doorArrowRight from '~icons/fluent/door-arrow-right-28-regular'

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

const authStore = useAuthStore()
const cartStore = useCartStore()

const { isAuthenticated } = storeToRefs(authStore)
const { cart } = storeToRefs(cartStore)

const consoleLogImageLoaded = () => {
	// Image loaded
}
const menus = computed((): IMenuItem[] => [
	{
		type: 'external-link',
		text: t('pages.accounts.security.title'),
		href: `${config.public.djangoUrl}/accounts/email/`,
		icon: userShield,
		cssClass:
			'text-gray-700 dark:text-gray-200 bg-gray-200 border-gray-200 hover:bg-gray-300 dark:border-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700'
	},
	{
		type: 'external-link',
		text: t('pages.accounts.logout.title'),
		href: `${config.public.djangoUrl}/accounts/logout/`,
		icon: doorArrowRight,
		cssClass:
			'text-gray-700 dark:text-gray-200 bg-gray-200 border-gray-200 hover:bg-gray-300 dark:border-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700'
	}
])
</script>

<template>
	<BuilderNavbar>
		<template #menu>
			<nav class="text-sm leading-6 font-semibold text-gray-700 dark:text-gray-200">
				<ul class="flex items-center gap-4">
					<li></li>
					<li v-for="(item, i) in menus" :key="i">
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
						<Button
							v-else-if="item.type === 'button'"
							:text="item.text"
							size="xs"
							class="font-extrabold capitalize"
							:to="item.route ? item.route : undefined"
							:href="item.href ? item.href : undefined"
						/>
					</li>
				</ul>
			</nav>
			<div class="relative hidden lg:flex items-center ml-auto">
				<div class="flex items-center justify-center">
					<slot name="image" />
				</div>
				<ul
					class="flex items-center gap-3 border-l ml-6 pl-6 border-gray-900/10 dark:border-gray-50/[0.2] text-gray-700 dark:text-gray-200"
				>
					<li class="relative">
						<LanguageSwitcher />
					</li>
					<li class="relative">
						<ThemeSwitcher />
					</li>
					<li class="relative">
						<span class="cart-items-count" :data-count="cart?.totalItems"></span>
						<Anchor
							class="hover:no-underline hover:text-slate-900 hover:dark:text-white text-lg flex self-center items-center"
							:to="'cart/'"
							:title="$t('pages.cart.title')"
							:text="$t('pages.cart.title')"
						>
							<IconFa6Solid:cartShopping />
						</Anchor>
					</li>
					<li class="relative">
						<Anchor
							v-if="isAuthenticated"
							class="hover:no-underline hover:text-slate-900 hover:dark:text-white text-lg flex self-center items-center"
							:title="$t('pages.accounts.login.title')"
							:text="$t('pages.accounts.login.title')"
							:to="'account/'"
						>
							<IconFa6Solid:circleUser />
						</Anchor>
						<Anchor
							v-else
							class="hover:no-underline hover:text-slate-900 hover:dark:text-white text-lg flex self-center items-center"
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
				<ActionSheetBody>
					<ActionSheetHeader text="Menu" />
					<nav class="leading-6 font-semibold text-gray-700 dark:text-gray-200">
						<ul class="flex flex-col">
							<li
								class="flex w-full pb-2 mb-2 border-b border-gray-900/10 dark:border-gray-50/[0.2] link"
							>
								<Anchor
									:to="'products/'"
									:title="$t('pages.products.title')"
									:text="$t('pages.products.title')"
									class="flex-1 hover:no-underline capitalize"
									>{{ $t('pages.products.title') }}</Anchor
								>
							</li>
						</ul>
					</nav>
					<div class="text-gray-700 dark:text-gray-200 mt-6 text-sm font-bold capitalize">
						{{ $t('components.theme_switcher.change_theme') }}
					</div>
					<div class="mt-2">
						<ThemeSwitcher type="select-box" />
					</div>
					<div class="text-gray-700 dark:text-gray-200 mt-6 text-sm font-bold capitalize">
						{{ $t('components.language.switcher.change_language') }}
					</div>
					<div class="mt-2">
						<LanguageSwitcher type="select-box" />
					</div>
					<Anchor
						class="text-gray-700 dark:text-gray-200 hover:no-underline hover:text-slate-900 hover:dark:text-white text-lg flex self-center items-center justify-center gap-2 mt-4"
						:to="'cart/'"
						:title="$t('pages.cart.title')"
						:text="$t('pages.cart.title')"
					>
						<IconFa6Solid:cartShopping />
						<span class="ml-1 text-gray-700 dark:text-gray-200">
							{{ $t('pages.cart.title') }}</span
						>
					</Anchor>
				</ActionSheetBody>
				<Button
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
	}
}
</style>
