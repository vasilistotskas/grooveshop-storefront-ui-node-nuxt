<script lang="ts" setup>
const cartStore = useCartStore()
const { getCartItems } = storeToRefs(cartStore)

const { locale } = useLang()
const { extractTranslated } = useTranslationExtractor()
</script>

<template>
	<div class="items">
		<div class="hidden items-center justify-center">
			<h3 class="text-primary-700 dark:text-primary-100 text-md font-bold">
				{{ $t('components.checkout.items.title') }}
			</h3>
		</div>
		<ClientOnly>
			<div
				v-if="getCartItems?.length"
				class="border-t border-b border-gray-200 py-4 max-h-[185px] overflow-auto"
			>
				<div v-for="item in getCartItems" :key="item.id" class="grid gap-4 p-4">
					<div class="grid grid-cols-[1fr_auto_auto] gap-4">
						<div class="flex items-center">
							<Anchor
								:title="extractTranslated(item.product, 'name', locale)"
								:to="`/product${item.product.absoluteUrl}`"
							>
								<span class="text-primary-700 dark:text-primary-100 text-sm font-bold">
									{{ extractTranslated(item.product, 'name', locale) }}
								</span>
							</Anchor>
						</div>
						<div class="flex items-center">
							<span class="text-primary-700 dark:text-primary-100 text-sm">
								{{ item.quantity }}x
							</span>
						</div>
						<div class="flex items-center">
							<span class="text-primary-700 dark:text-primary-100 text-sm">
								{{ item.totalPrice }}€
							</span>
						</div>
					</div>
				</div>
			</div>
			<template #fallback>
				<ClientOnlyFallback height="185px" width="416px" />
			</template>
		</ClientOnly>
	</div>
</template>
