<script lang="ts" setup>
const cartStore = useCartStore()
const { getCartItems } = storeToRefs(cartStore)

const { locale } = useLang()
const { extractTranslated } = useTranslationExtractor()
</script>

<template>
	<div class="items">
		<div class="items-title hidden">
			<h3 class="text-primary-700 dark:text-primary-100 text-md font-bold">
				{{ $t('components.checkout.items.title') }}
			</h3>
		</div>
		<ClientOnly>
			<div v-if="getCartItems?.length" class="items-list">
				<div v-for="item in getCartItems" :key="item.id" class="items-list-item">
					<div class="items-list-item-info">
						<div class="items-list-item-info-name">
							<Anchor
								:title="extractTranslated(item.product, 'name', locale)"
								:to="`/product${item.product.absoluteUrl}`"
							>
								<span class="text-primary-700 dark:text-primary-100 text-sm font-bold"
									>{{ extractTranslated(item.product, 'name', locale) }}
								</span>
							</Anchor>
						</div>
						<div class="items-list-item-info-quantity">
							<span class="text-primary-700 dark:text-primary-100 text-sm"
								>{{ item.quantity }}x
							</span>
						</div>
						<div class="items-list-item-info-price">
							<span class="text-primary-700 dark:text-primary-100 text-sm"
								>{{ item.totalPrice }}€
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

<style lang="scss" scoped>
.items {
	&-title {
		align-items: center;
		justify-content: center;
		justify-items: center;
	}

	&-list {
		display: grid;
		border-bottom: solid 1px #e8e8e8;
		border-top: solid 1px #e8e8e8;
		padding-bottom: 1rem;
		padding-top: 1rem;
		max-height: 185px;
		overflow: auto;

		&-item {
			display: grid;
			gap: 1rem;
			padding: 1rem;

			&-info {
				display: grid;
				grid-template-columns: 1fr auto auto;
				gap: 1rem;

				&-name {
					display: flex;
					align-items: center;
				}

				&-price {
					display: flex;
					align-items: center;
				}

				&-quantity {
					display: flex;
					align-items: center;
				}
			}
		}
	}
}
</style>
