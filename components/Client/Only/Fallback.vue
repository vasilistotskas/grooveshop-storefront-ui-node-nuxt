<script lang="ts" setup>
const props = defineProps({
	width: {
		type: [Number, String],
		default: 'auto'
	},
	height: {
		type: [Number, String],
		default: 'auto'
	}
})
</script>

<template>
	<div class="client-only-fallback skeleton">
		<p class="client-only-fallback-text">
			{{ $t('common.client_only_fallback') }}
		</p>
	</div>
</template>

<style lang="scss" scoped>
.skeleton {
	animation: skeleton-loading 1s linear infinite alternate;
}

@keyframes skeleton-loading {
	0% {
		background-color: hsl(200deg 20% 80%);
	}

	100% {
		background-color: hsl(200deg 20% 95%);
	}
}

.client {
	&-only {
		&-fallback {
			border-radius: 5px;
			display: grid;
			width: v-bind(width);
			height: v-bind(height);

			&-text {
				visibility: hidden;
			}
		}
	}
}
</style>
