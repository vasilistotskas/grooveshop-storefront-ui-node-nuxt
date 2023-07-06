<script lang="ts" setup>
import { PropType } from 'vue'
import { CartItem } from '~/zod/cart/cart-item'

const props = defineProps({
	items: { type: Array as PropType<CartItem[] | null>, required: true }
})
</script>

<template>
	<div class="items">
		<div class="items__title hidden">
			<h3 class="text-gray-700 dark:text-gray-200 text-md font-bold">
				{{ $t('components.checkout.items.title') }}
			</h3>
		</div>
		<div class="items__list">
			<div v-for="item in props.items" :key="item.id" class="items__list__item">
				<div class="items__list__item__info">
					<div class="items__list__item__info__name">
						<Anchor
							:title="item.product.name"
							:to="`/product${item.product.absoluteUrl}`"
						>
							<span class="text-gray-700 dark:text-gray-200 text-sm font-bold"
								>{{ item.product.name }}
							</span>
						</Anchor>
					</div>
					<div class="items__list__item__info__quantity">
						<span class="text-gray-700 dark:text-gray-200 text-sm"
							>{{ item.quantity }}x
						</span>
					</div>
					<div class="items__list__item__info__price">
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
	&__title {
		align-items: center;
		justify-content: center;
		justify-items: center;
	}

	&__list {
		display: grid;
		border-bottom: solid 1px #e8e8e8;
		border-top: solid 1px #e8e8e8;
		padding-bottom: 1rem;
		padding-top: 1rem;
		max-height: 185px;
		overflow: auto;

		&__item {
			display: grid;
			gap: 1rem;
			padding: 1rem;

			&__info {
				display: grid;
				grid-template-columns: 1fr auto auto;
				gap: 1rem;

				&__name {
					display: flex;
					align-items: center;
				}

				&__price {
					display: flex;
					align-items: center;
				}

				&__quantity {
					display: flex;
					align-items: center;
				}
			}
		}
	}
}
</style>
