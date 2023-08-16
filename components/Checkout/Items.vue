<script lang="ts" setup>
import { PropType } from 'vue'
import { CartItem } from '~/types/cart/cart-item'

const props = defineProps({
	items: { type: Array as PropType<CartItem[] | null>, required: true }
})
const { locale } = useLang()
const { extractTranslated } = useTranslationExtractor()
</script>

<template>
	<div class="items">
		<div class="items-title hidden">
			<h3 class="text-gray-700 dark:text-gray-200 text-md font-bold">
				{{ $t('components.checkout.items.title') }}
			</h3>
		</div>
		<div class="items-list">
			<div v-for="item in props.items" :key="item.id" class="items-list-item">
				<div class="items-list-item-info">
					<div class="items-list-item-info-name">
						<Anchor
							:title="extractTranslated(item.product, 'name', locale)"
							:to="`/product${item.product.absoluteUrl}`"
						>
							<span class="text-gray-700 dark:text-gray-200 text-sm font-bold"
								>{{ extractTranslated(item.product, 'name', locale) }}
							</span>
						</Anchor>
					</div>
					<div class="items-list-item-info-quantity">
						<span class="text-gray-700 dark:text-gray-200 text-sm"
							>{{ item.quantity }}x
						</span>
					</div>
					<div class="items-list-item-info-price">
						<span class="text-gray-700 dark:text-gray-200 text-sm"
							>{{ item.product.price }}€
						</span>
					</div>
				</div>
			</div>
		</div>
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
