<script lang="ts" setup>
import { PropType } from 'vue'
import { Review } from '~/zod/product/review'

const props = defineProps({
	reviewsAverage: {
		type: Number,
		required: false,
		default: 0
	},
	reviewsCount: {
		type: Number,
		required: false,
		default: 0
	},
	reviews: {
		type: Array as PropType<Review[] | null>,
		required: true
	},
	displayImageOf: {
		type: String as PropType<'user' | 'product'>,
		required: true,
		validator: (value: string) => ['user', 'product'].includes(value)
	}
})
</script>

<template>
	<div class="reviews_list grid gap-4">
		<ProductReviewsSummary
			:reviews-average="reviewsAverage"
			:reviews-count="reviewsCount"
			class="reviews_list__summary"
		></ProductReviewsSummary>
		<div class="reviews_list__items grid gap-4">
			<ProductReviewsCard
				v-for="review in reviews"
				:key="review.id"
				:review="review"
				:display-image-of="displayImageOf"
				class="reviews_list__item bg-white dark:bg-slate-800 border border-gray-900/10 dark:border-gray-50/[0.2] rounded p-4"
			>
			</ProductReviewsCard>
		</div>
	</div>
</template>
