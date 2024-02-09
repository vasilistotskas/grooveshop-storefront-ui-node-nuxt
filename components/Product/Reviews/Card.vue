<script lang="ts" setup>
import type { PropType } from 'vue'
import type { Review } from '~/types/product/review'

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
	return typeof props.review?.product !== 'number' ? props.review?.product : undefined
})

const userAccount = computed(() => {
	return typeof props.review?.user !== 'number' ? props.review?.user : undefined
})

const { resolveImageSrc } = useImageResolver()
const { locale } = useI18n()
const { extractTranslated } = useTranslationExtractor()

const src = computed(() => {
	const path =
		props.displayImageOf === 'user' ? `media/uploads/users/` : `media/uploads/products/`
	return resolveImageSrc(
		props.displayImageOf === 'user'
			? userAccount.value?.mainImageFilename
			: product.value?.mainImageFilename,
		path +
			(props.displayImageOf === 'user'
				? userAccount.value?.mainImageFilename
				: product.value?.mainImageFilename)
	)
})

const alt = computed(() => {
	return props.displayImageOf === 'user'
		? userAccount.value?.firstName + ' ' + userAccount.value?.lastName
		: extractTranslated(product?.value, 'name', locale.value)
})

const productName = computed(() =>
	extractTranslated(product?.value, 'name', locale.value)
)
</script>

<template>
	<div class="card">
		<div
			class="grid items-center justify-center justify-items-center gap-2 md:flex md:justify-between"
		>
			<div class="grid items-center gap-4">
				<div class="h-auto w-auto">
					<UserAvatar
						v-if="userAccount && displayImageOf === 'user'"
						:user-account="userAccount"
					/>
					<div v-if="displayImageOf === 'product' && product" class="grid gap-2">
						<Anchor :to="`/product${product.absoluteUrl}`" :text="productName">
							<NuxtImg
								loading="lazy"
								provider="mediaStream"
								class="product-img w-30 h-20 bg-white object-cover"
								placeholder="/assets/images/placeholder.png"
								sizes="sm:100vw md:50vw lg:auto"
								:src="src"
								:alt="alt"
							/>
						</Anchor>
						<Anchor :to="`/product${product.absoluteUrl}`" :text="productName">
							<span class="text-lg font-medium">{{ productName }}</span>
						</Anchor>
					</div>
				</div>
				<div class="text-2xl">
					<Rating :rate="review.rate" />
				</div>
			</div>
			<div class="grid">
				<span>{{ extractTranslated(review, 'comment', locale) }}</span>
			</div>
			<div class="flex justify-end">
				<div class="text-xs">
					<span>{{ review.createdAt }}</span>
				</div>
			</div>
		</div>
	</div>
</template>
