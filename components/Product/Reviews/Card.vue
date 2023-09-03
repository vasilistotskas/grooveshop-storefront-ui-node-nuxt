<script lang="ts" setup>
import { PropType } from 'vue'
import { Review } from '~/types/product/review'

const props = defineProps({
	review: {
		type: Object as PropType<Review>,
		required: true
	},
	displayImageOf: {
		type: String as PropType<'user' | 'product'>,
		required: true,
		validator: (value: string) => ['user', 'product'].includes(value)
	}
})

const product = computed(() => {
	if (typeof props.review?.product === 'number') return undefined
	return props.review?.product
})

const userAccount = computed(() => {
	if (typeof props.review?.user === 'number') return undefined
	return props.review?.user
})

const { resolveImageSrc } = useImageResolver()
const { locale } = useLang()
const { extractTranslated } = useTranslationExtractor()
</script>

<template>
	<div class="card reviews-list-item-content">
		<div class="reviews-list-item-content-header">
			<div class="reviews-list-item-content-header-user">
				<div class="reviews-list-item-content-header-avatar">
					<UserAvatar
						v-if="userAccount && displayImageOf === 'user'"
						:user-account="userAccount"
					/>
					<div
						v-if="displayImageOf === 'product' && product"
						class="reviews-list-item-content-header-avatar-product"
					>
						<Anchor
							:to="`/product${product.absoluteUrl}`"
							:text="extractTranslated(product, 'name', locale)"
						>
							<NuxtImg
								preload
								placeholder
								loading="lazy"
								provider="mediaStream"
								class="product-img"
								:style="{ objectFit: 'contain' }"
								:width="120"
								:height="80"
								:fit="'contain'"
								:position="'entropy'"
								:background="'transparent'"
								:trim-threshold="5"
								:format="'webp'"
								sizes="sm:100vw md:50vw lg:120px"
								:src="
									resolveImageSrc(
										product.mainImageFilename,
										`media/uploads/products/${product.mainImageFilename}`
									)
								"
								:alt="extractTranslated(product, 'name', locale)"
							/>
						</Anchor>
						<Anchor
							:to="`/product${product.absoluteUrl}`"
							:text="extractTranslated(product, 'name', locale)"
						>
							<span class="reviews-list-item-content-header-avatar-product-name">
								{{ extractTranslated(product, 'name', locale) }}
							</span>
						</Anchor>
					</div>
				</div>
				<div class="reviews-list-item-content-header-rate">
					<Rating :rate="review.rate" />
				</div>
			</div>
			<div class="reviews-list-item-content-body">
				<div class="reviews-list-item-content-body-comment">
					<span>{{ extractTranslated(review, 'comment', locale) }}</span>
				</div>
			</div>
			<div class="reviews-list-item-content-footer">
				<div class="reviews-list-item-content-footer-date">
					<span>{{ review.createdAt }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.reviews-list-item-content {
	&-header {
		display: grid;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;

		@media screen and (width >= 768px) {
			display: flex;
		}

		&-avatar {
			margin-right: 1rem;

			&-product {
				display: grid;
				gap: 0.5rem;

				&-name {
					font-size: 1.2rem;
					font-weight: 500;
				}
			}
		}

		&-rate {
			font-size: 1.5rem;
		}

		&-user {
			display: grid;
			align-items: center;
			gap: 1rem;
		}
	}

	&-body {
		&-comment {
			font-size: 1.2rem;
		}
	}

	&-footer {
		display: flex;
		justify-content: flex-end;

		&-date {
			font-size: 0.8rem;
		}
	}
}
</style>
