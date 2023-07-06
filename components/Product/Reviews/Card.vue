<script lang="ts" setup>
import { PropType } from 'vue'
import { Review } from '~/zod/product/review'

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

const { resolveImageFilenameNoExt, resolveImageFileExtension, resolveImageSrc } =
	useImageResolver()
</script>

<template>
	<div class="card reviews_list__item__content">
		<div class="reviews_list__item__content__header">
			<div class="reviews_list__item__content__header__user">
				<div class="reviews_list__item__content__header__avatar">
					<UserAvatar
						v-if="userAccount && displayImageOf === 'user'"
						:user-account="userAccount"
					/>
					<div
						v-if="displayImageOf === 'product' && product"
						class="reviews_list__item__content__header__avatar__product"
					>
						<Anchor :to="`/product${product.absoluteUrl}`" :text="product.name">
							<NuxtImg
								preload
								placeholder
								loading="lazy"
								provider="mediaStream"
								class="product_img"
								:style="{ objectFit: 'contain' }"
								:width="120"
								:height="80"
								:fit="'contain'"
								:position="'entropy'"
								:background="'transparent'"
								:trim-threshold="5"
								:format="resolveImageFileExtension(product.mainImageFilename)"
								sizes="sm:100vw md:50vw lg:120px"
								:src="
									resolveImageSrc(
										product.mainImageFilename,
										`media/uploads/products/${resolveImageFilenameNoExt(
											product.mainImageFilename
										)}`
									)
								"
								:alt="product.name"
							/>
						</Anchor>
						<Anchor :to="`/product${product.absoluteUrl}`" :text="product.name">
							<span class="reviews_list__item__content__header__avatar__product__name">
								{{ product.name }}
							</span>
						</Anchor>
					</div>
				</div>
				<div class="reviews_list__item__content__header__rate">
					<Rating :rate="review.rate" />
				</div>
			</div>
			<div class="reviews_list__item__content__body">
				<div class="reviews_list__item__content__body__comment">
					<span>{{ review.comment }}</span>
				</div>
			</div>
			<div class="reviews_list__item__content__footer">
				<div class="reviews_list__item__content__footer__date">
					<span>{{ review.createdAt }}</span>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.reviews_list__item__content {
	&__header {
		display: grid;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		@media screen and (min-width: 768px) {
			display: flex;
		}
		&__avatar {
			margin-right: 1rem;
			&__product {
				display: grid;
				gap: 0.5rem;
				&__name {
					font-size: 1.2rem;
					font-weight: 500;
				}
			}
		}
		&__rate {
			font-size: 1.5rem;
		}
		&__user {
			display: grid;
			align-items: center;
			gap: 1rem;
		}
	}
	&__body {
		&__comment {
			font-size: 1.2rem;
		}
	}
	&__footer {
		display: flex;
		justify-content: flex-end;
		&__date {
			font-size: 0.8rem;
		}
	}
}
</style>
