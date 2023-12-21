<script lang="ts" setup>
defineProps({
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
	maxRate: {
		type: Number,
		required: false,
		default: 10
	}
})
</script>

<template>
	<div class="flex items-center justify-center gap-8">
		<div v-if="reviewsAverage > 0" class="flex items-center gap-1">
			<span class="text-3xl font-semibold text-yellow-600">{{
				reviewsAverage.toFixed(1)
			}}</span>
			<span class="text-sm font-semibold text-yellow-600">/{{ maxRate }}</span>
		</div>
		<div class="flex items-center gap-1">
			<span class="text-sm font-semibold text-yellow-600">{{ reviewsCount }}</span>
			<span class="text-sm font-semibold text-yellow-600">
				{{ $t('components.product.reviews.summary.reviews') }}
			</span>
		</div>
	</div>
</template>
