<script lang="ts" setup>
defineProps({
	replicas: {
		type: Number,
		default: 1
	},
	cardWidth: {
		type: [Number, String],
		default: '100%'
	},
	cardHeight: {
		type: [Number, String],
		default: 'auto'
	},
	borderRadius: {
		type: [Number, String],
		default: 'unset'
	},
	loading: {
		type: Boolean,
		default: false
	}
})
defineSlots<{
	default(props: {}): any
}>()
</script>

<template>
	<div
		v-if="loading"
		:class="{
			'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4': replicas > 1
		}"
	>
		<div v-for="i in replicas" :key="i" class="container-skeleton">
			<a
				id="card-link"
				aria-label="skeleton"
				class="card"
				target="_blank"
				:style="`width:${cardWidth}; height:${cardHeight}; border-radius:${borderRadius};`"
			>
				<div class="card__body">
					<div id="card-details" class="card__body body__text">
						<div class="skeleton skeleton-text skeleton-text__body"></div>
					</div>
				</div>
			</a>
		</div>
	</div>
	<div v-else style="display: none">
		<slot />
	</div>
</template>

<style lang="scss" scoped>
//Hides the broken image icon
img[alt] {
	text-indent: -10000px;
}

.container-skeleton {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start;
	align-items: flex-start;

	@media screen and (max-width: 767px) {
		margin: -0.5rem;
	}
}

.card {
	@apply bg-gray-50 dark:bg-gray-900;
	box-shadow: 0 0 transparent, 0 0 transparent,
		0 0.375rem 0.375rem -0.125rem rgba(168, 179, 207, 0.4);
	padding: 0.5rem;
	border: 1px solid rgba(82, 88, 102, 0.2);
	display: flex;
	flex-direction: column;
	justify-content: space-around;
	transition: all 0.2s ease;
	&__body {
		.body__text {
			color: #525866;
			font-size: 0.8125rem;
		}
	}
	&:hover {
		border-color: rgba(82, 88, 102, 0.4);
	}
}

.skeleton {
	animation: skeleton-loading 1s linear infinite alternate;
}

@keyframes skeleton-loading {
	0% {
		background-color: hsl(200, 20%, 80%);
	}
	100% {
		background-color: hsl(200, 20%, 95%);
	}
}

.skeleton-text {
	width: 100%;
	height: 0.7rem;
	border-radius: 0.25rem;
}

.skeleton-text__body {
	width: 100%;
}
</style>
