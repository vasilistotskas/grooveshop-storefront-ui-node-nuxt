<script lang="ts" setup>
const config = useRuntimeConfig()
const { t } = useLang()

const authStore = useAuthStore()
const cartStore = useCartStore()

const { isAuthenticated } = storeToRefs(authStore)
const { cart } = storeToRefs(cartStore)
</script>

<template>
	<BuilderNavbar>
		<template v-if="false" #banner>
			<div class="text-white text-xs text-center py-1 px-4 lg:px-8 capitalize">
				<span class="mr-1 text-gray-700 dark:text-gray-200">
					{{ $t('banners.welcome', { app_name: config.public.appTitle }) }}
				</span>
			</div>
		</template>
		<template #menu>
			<div class="relative hidden lg:flex items-center ml-auto">
				<nav class="text-sm leading-6 font-semibold text-gray-700 dark:text-gray-200">
					<ul class="flex items-center space-x-8">
						<li class="flex w-full gap-4">
							<h2>
								<Anchor
									:to="'products'"
									:title="$t('common.shop')"
									:text="$t('common.shop')"
									class="text-lg hover:no-underline hover:text-slate-900 hover:dark:text-white capitalize"
									>{{ $t('common.shop') }}</Anchor
								>
							</h2>
						</li>
					</ul>
				</nav>
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
							:to="'cart'"
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
							:to="'account'"
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
									:to="'products'"
									:title="$t('common.shop')"
									:text="$t('common.shop')"
									class="flex-1 hover:no-underline capitalize"
									>{{ $t('common.shop') }}</Anchor
								>
							</li>
						</ul>
					</nav>
					<div class="text-gray-700 dark:text-gray-200 mt-6 text-sm font-bold capitalize">
						{{ $t('components.theme.switcher.change.theme') }}
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
						:to="'cart'"
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
