<script lang="ts" setup>
const { isAuthenticated } = useAuthSession()

const cartStore = useCartStore()
const { getCartTotalItems } = storeToRefs(cartStore)

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
						<li class="flex w-full gap-4">
							<h2>
								<Anchor
									:to="'blog'"
									:title="$t('common.blog')"
									:text="$t('common.blog')"
									class="text-lg hover:no-underline hover:text-slate-900 hover:dark:text-white capitalize"
									>{{ $t('common.blog') }}</Anchor
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
							<ClientOnly>
								<span class="cart-items-count" :data-count="getCartTotalItems"></span>
								<template #fallback>
									<ClientOnlyFallback
										class="cart-items-count"
										:data-count="getCartTotalItems"
									></ClientOnlyFallback>
								</template>
							</ClientOnly>
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
								<UserAvatar
									:user-account="account"
									:img-width="30"
									:img-height="30"
									:show-name="false"
								/>
							</Anchor>
							<Anchor
								v-else
								class="hover:no-underline hover:text-slate-900 hover:dark:text-white text-[1.5rem] flex self-center items-center w-[30px] h-[30px]"
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
				<UButton :label="$t('common.close')" @click.prevent="toggleOptions(false)" />
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
