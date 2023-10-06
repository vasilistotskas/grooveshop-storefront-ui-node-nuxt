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
				<div class="card-body">
					<div id="card-details" class="card-body body-text">
						<div class="skeleton skeleton-text skeleton-text-body"></div>
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
img[alt] {
	text-indent: -10000px;
}

.container-skeleton {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start;
	align-items: flex-start;

	@media screen and (width <= 767px) {
		margin: -0.5rem;
	}
}

.card {
	@apply bg-zinc-50 dark:bg-zinc-900;

	box-shadow:
		0 0 transparent,
		0 0 transparent,
		0 0.375rem 0.375rem -0.125rem rgb(168 179 207 / 40%);
	padding: 0.5rem;
	border: 1px solid rgb(82 88 102 / 20%);
	display: flex;
	flex-direction: column;
	justify-content: space-around;
	transition: all 0.2s ease;

	&-body {
		.body-text {
			color: #525866;
			font-size: 0.8125rem;
		}
	}

	&:hover {
		border-color: rgb(82 88 102 / 40%);
	}
}

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

.skeleton-text {
	width: 100%;
	height: 0.7rem;
	border-radius: 0.25rem;
}

.skeleton-text-body {
	width: 100%;
}
</style>
