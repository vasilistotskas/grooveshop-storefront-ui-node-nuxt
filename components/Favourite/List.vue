<script lang="ts" setup>
import { PropType } from 'vue'
import { Favourite } from '~/zod/product/favourite'

const props = defineProps({
	favourites: {
		type: Array as PropType<Favourite[] | null>,
		required: true
	},
	displayTotal: {
		type: Boolean,
		required: false,
		default: true
	}
})

const { t } = useLang()
</script>

<template>
	<div class="favourite__list gap-4">
		<div class="favourite__list__header">
			<div v-if="displayTotal" class="favourite__list__header__total">
				<span class="favourite__list__header__total__value">{{
					favourites?.length
				}}</span>
				<span class="favourite__list__header__total__label">
					{{ $t('components.product.reviews.summary.reviews') }}</span
				>
			</div>
		</div>
		<ul class="favourite__list__body">
			<template v-for="favourite in favourites" :key="favourite.id">
				<ProductCard
					v-if="typeof favourite.product !== 'number'"
					:product="favourite.product"
					:show-add-to-cart-button="false"
					:img-width="120"
					:img-height="150"
				/>
			</template>
		</ul>
	</div>
</template>

<style lang="scss" scoped>
.favourite__list {
	width: 100%;
	display: grid;
	align-items: start;
	&__header {
		&__total {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 0.25rem;
			&__value,
			&__label {
				font-size: 0.75rem;
				font-weight: 600;
				color: #f0c14b;
			}
		}
	}
	&__body {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(4, 1fr);
		@media screen and (max-width: 1199px) {
			grid-template-columns: repeat(3, 1fr);
		}
		@media screen and (max-width: 991px) {
			grid-template-columns: repeat(2, 1fr);
		}
		@media screen and (max-width: 767px) {
			grid-template-columns: repeat(1, 1fr);
		}
	}
}
</style>
