<script lang="ts" setup>
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
	}
})

const { t } = useLang()

const maxRate = 10
</script>

<template>
	<div class="summary">
		<div v-if="reviewsAverage > 0" class="summary-average">
			<span class="summary-average-value">{{ reviewsAverage.toFixed(1) }}</span>
			<span class="summary-average-label">/{{ maxRate }}</span>
		</div>
		<div class="summary-count">
			<span class="summary-count-value">{{ reviewsCount }}</span>
			<span class="summary-count-label">
				{{ $t('components.product.reviews.summary.reviews') }}</span
			>
		</div>
	</div>
</template>

<style lang="scss" scoped>
$color-primary: #f0c14b;

.summary {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 2rem;

	&-average {
		display: flex;
		align-items: center;
		gap: 0.25rem;

		&-value {
			font-size: 1.5rem;
			font-weight: 600;
			color: $color-primary;
		}

		&-label {
			font-size: 0.75rem;
			font-weight: 600;
			color: $color-primary;
		}
	}

	&-count {
		display: flex;
		align-items: center;
		gap: 0.25rem;

		&-value {
			font-size: 0.75rem;
			font-weight: 600;
			color: $color-primary;
		}

		&-label {
			font-size: 0.75rem;
			font-weight: 600;
			color: $color-primary;
		}
	}
}
</style>
