<script lang="ts" setup>
defineSlots<{
	default(props: {}): any
	header(props: {}): any
	footer(props: {}): any
	'app-before'(props: {}): any
	'app-after'(props: {}): any
}>()

const userStore = useUserStore()
const { favouriteProducts, productReviews, orders } = storeToRefs(userStore)
const { user } = useUserSession()
const { isMobile } = useDevice()
const route = useRoute()
</script>

<template>
	<div class="relative">
		<div id="app-before">
			<slot name="app-before" />
		</div>
		<div class="flex min-h-screen flex-col">
			<slot name="header">
				<UserNavbar>
					<template #drawer>
						<UserSidebar mode="mobile" />
					</template>
					<template v-if="user" #image>
						<LazyUserAvatar :user-account="user" :img-width="40" :img-height="40" />
					</template>
				</UserNavbar>
			</slot>
			<div class="grid gap-6">
				<div class="bg-zinc-200 dark:bg-zinc-800 md:rounded-b-[94px]">
					<UserAccountInfo
						v-if="user"
						class="container mx-auto w-full"
						:account="user"
						:orders-count="orders?.length"
						:favourites-count="favouriteProducts?.length"
						:reviews-count="productReviews?.length"
					/>
				</div>
				<main class="container mx-auto w-full">
					<div class="relative mb-12 md:mb-20">
						<div class="flex w-full flex-1 flex-col md:gap-4">
							<div
								:class="[
									'relative mx-auto flex h-full w-full flex-1 flex-col lg:flex-row'
								]"
							>
								<div
									v-if="!isMobile"
									class="md:grid md:w-auto md:py-4 lg:pl-8"
									:class="[
										{
											'grid w-full': route.path === '/account',
											hidden: route.path !== '/account'
										}
									]"
								>
									<UserSidebar />
								</div>
								<div class="flex w-full flex-col">
									<slot />
								</div>
							</div>
						</div>
					</div>
				</main>
			</div>

			<slot name="footer">
				<Footer />
			</slot>
		</div>
		<div id="app-after">
			<slot name="app-after" />
		</div>
	</div>
</template>
