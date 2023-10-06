<script lang="ts" setup>
const { isAuthenticated } = useAuthSession()

const cartStore = useCartStore()
const { cart } = storeToRefs(cartStore)

const userStore = useUserStore()
const { account } = storeToRefs(userStore)
</script>

<template>
	<BuilderNavbar>
		<template #menu>
			<div class="relative hidden lg:flex items-center ml-auto">
				<nav
					class="flex items-center text-lg leading-6 font-semibold text-primary-700 dark:text-primary-100"
				>
					<ul class="flex items-center space-x-8">
						<li class="relative grid items-center justify-center justify-items-center">
							<Anchor
								class="hover:no-underline hover:text-slate-900 hover:dark:text-white text-lg flex gap-4 self-center items-center"
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
									class="text-lg hover:no-underline hover:text-slate-900 hover:dark:text-white capitalize"
									>{{ $t('common.shop') }}</Anchor
								>
							</h2>
						</li>
					</ul>
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
							<span class="cart-items-count" :data-count="cart?.totalItems"></span>
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
								v-if="isAuthenticated && account"
								class="hover:no-underline hover:text-slate-900 hover:dark:text-white text-[1.5rem] flex self-center items-center"
								:title="$t('pages.accounts.login.title')"
								:text="$t('pages.accounts.login.title')"
								:to="'account'"
							>
								<UserAvatar :user-account="account" :img-width="30" :img-height="30" />
							</Anchor>
							<Anchor
								v-else
								class="hover:no-underline hover:text-slate-900 hover:dark:text-white text-[1.5rem] flex self-center items-center"
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
				<ActionSheetBody>
					<ActionSheetHeader text="Menu" />
					<nav class="leading-6 font-semibold text-primary-700 dark:text-primary-100">
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
					<div
						class="text-primary-700 dark:text-primary-100 mt-6 text-lg font-bold capitalize"
					>
						{{ $t('components.theme.switcher.change.theme') }}
					</div>
					<div class="mt-2">
						<ThemeSwitcher type="select-box" />
					</div>
					<div
						class="text-primary-700 dark:text-primary-100 mt-6 text-lg font-bold capitalize"
					>
						{{ $t('components.language.switcher.change_language') }}
					</div>
					<div class="mt-2">
						<LanguageSwitcher type="select-box" />
					</div>
					<Anchor
						class="text-primary-700 dark:text-primary-100 hover:no-underline hover:text-slate-900 hover:dark:text-white text-lg flex self-center items-center justify-center gap-2 mt-4"
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
