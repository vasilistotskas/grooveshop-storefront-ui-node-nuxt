<script lang="ts" setup>
import { PropType } from 'vue'

export type Direction = 'column' | 'row' | 'column-reverse' | 'row-reverse'

const props = defineProps({
	showImage: {
		type: Boolean,
		default: true
	},
	showBodyImage: {
		type: Boolean,
		default: false
	},
	imageWidth: {
		type: [Number, String],
		default: '2rem'
	},
	imageHeight: {
		type: [Number, String],
		default: '2rem'
	},
	isCircle: {
		type: Boolean,
		default: false
	},
	showHeading: {
		type: Boolean,
		default: true
	},
	showParagraph: {
		type: Boolean,
		default: true
	},
	showFooter: {
		type: Boolean,
		default: true
	},
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
	loading: {
		type: Boolean,
		default: false
	},
	direction: {
		type: String as PropType<Direction>,
		default: () => 'column'
	},
	columns: {
		type: Number,
		default: 1
	},
	columnsMd: {
		type: Number,
		default: 2
	},
	columnsLg: {
		type: Number,
		default: 4
	},
	cardHeadParagraphs: {
		type: Number,
		default: 2
	},
	cardBodyParagraphs: {
		type: Number,
		default: 10
	},
	headerDirection: {
		type: String as PropType<Direction>,
		default: () => 'column'
	},
	footerParagraphs: {
		type: Number,
		default: 1
	}
})
</script>

<template>
	<div
		v-if="loading"
		:class="`wrapper grid grid-cols-${columns} md:grid-cols-${columnsMd} lg:grid-cols-${columnsLg} gap-4`"
	>
		<div v-for="i in replicas" :key="i" class="container-skeleton">
			<a
				id="card-link"
				aria-label="skeleton"
				:class="`card card__${direction}`"
				target="_blank"
				:style="`width:${cardWidth}; height:${cardHeight};`"
			>
				<div
					:class="[
						'card__header gap-2 w-full items-center',
						{ 'flex-row': headerDirection === 'row' },
						{ 'flex-col': headerDirection === 'column' }
					]"
				>
					<div v-if="showImage">
						<div
							id="logo-img"
							class="header__img skeleton"
							:style="{
								borderRadius: isCircle ? '50%' : 'none',
								width: imageWidth,
								height: imageHeight
							}"
						/>
					</div>
					<h3
						v-if="showHeading"
						id="card-title"
						class="card__header header__title grid gap-3"
						:class="
							headerDirection === 'row'
								? 'w-full flex-col items-center'
								: 'flex-row w-3/5'
						"
					>
						<span
							v-for="n in cardHeadParagraphs"
							:key="n"
							class="skeleton skeleton-text"
						></span>
					</h3>
				</div>

				<div class="card__body w-full grid">
					<div
						v-if="showParagraph"
						id="card-details"
						class="card__body body__text grid gap-3"
					>
						<div
							v-for="n in cardBodyParagraphs"
							:key="n"
							class="skeleton skeleton-text skeleton-text__body"
						></div>
					</div>

					<div v-if="showBodyImage" class="card__body body__img">
						<div
							id="cover-img"
							class="skeleton"
							:style="{ borderRadius: isCircle ? '50%' : 'none' }"
						/>
					</div>
				</div>

				<div v-if="showFooter" id="card-footer" class="card__footer w-full">
					<span
						v-for="n in footerParagraphs"
						:key="n"
						class="skeleton skeleton-text skeleton-footer"
					></span>
				</div>
			</a>
		</div>
	</div>
	<div v-else class="hidden"></div>
</template>

<style lang="scss" scoped>
//Hides the broken image icon
img[alt] {
	text-indent: -10000px;
}

.container-skeleton {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	align-items: center;

	@media screen and (max-width: 768px) {
		margin: -0.5rem;
	}
}

.card {
	@apply bg-gray-50 dark:bg-gray-900;
	box-shadow:
		0 0 transparent,
		0 0 transparent,
		0 0.375rem 0.375rem -0.125rem rgba(168, 179, 207, 0.4);
	padding: 0.5rem;
	border-radius: 0.5rem;
	border: 1px solid rgba(82, 88, 102, 0.2);
	display: flex;
	flex-direction: column;
	justify-content: space-around;
	transition: all 0.2s ease;

	&__header {
		display: flex;
		margin: 0.5rem 0 0.5rem 0.5rem;

		.header__img {
			height: 2rem;
			width: 2rem;
			object-fit: cover;
			border-radius: 50%;
		}

		.header__title {
			font-size: 1.0625rem;
			line-height: 1.375rem;
			color: #0e1217;
			font-weight: 700;
			margin: 0.5rem;
		}
	}

	&__body {
		margin: 0 0.5rem;

		.body__text {
			color: #525866;
			font-size: 0.8125rem;
			display: grid;
			justify-items: center;
			align-items: center;
		}

		.body__img {
			height: 10rem;
			margin: 0.5rem 0;

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
				margin: auto;
				border-radius: 0.75rem;
			}
		}
	}

	&__footer {
		display: flex;
		justify-content: space-around;
		align-items: center;
		margin: 0.5rem;
	}

	&:hover {
		border-color: rgba(82, 88, 102, 0.4);
	}
	&.card__row {
		flex-direction: row;
	}
	&.card__column {
		flex-direction: column;
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
	width: 75%;
}

.skeleton-footer {
	width: 30%;
}
</style>
