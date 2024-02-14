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

const { review, displayImageOf } = toRefs(props)

const product = computed(() => {
	return typeof review.value?.product !== 'number' ? review.value?.product : undefined
})

const userAccount = computed(() => {
	return typeof review.value?.user !== 'number' ? review.value?.user : undefined
})

const { resolveImageSrc } = useImageResolver()
const { locale } = useI18n()
const { extractTranslated } = useTranslationExtractor()
const { contentShorten } = useText()

const src = computed(() => {
	const path =
		displayImageOf.value === 'user' ? `media/uploads/users/` : `media/uploads/products/`
	return resolveImageSrc(
		displayImageOf.value === 'user'
			? userAccount.value?.mainImageFilename
			: product.value?.mainImageFilename,
		path +
			(displayImageOf.value === 'user'
				? userAccount.value?.mainImageFilename
				: product.value?.mainImageFilename)
	)
})

const alt = computed(() => {
	return displayImageOf.value === 'user'
		? userAccount.value?.firstName + ' ' + userAccount.value?.lastName
		: extractTranslated(product?.value, 'name', locale.value)
})

const productName = computed(() =>
	extractTranslated(product?.value, 'name', locale.value)
)

const reviewComment = computed(() => {
	return contentShorten(extractTranslated(review.value, 'comment', locale.value), 0, 120)
})
</script>

<template>
	<div class="card">
		<div
			class="grid items-center justify-center justify-items-center gap-2 md:grid-cols-3 md:justify-between md:gap-14"
		>
			<div class="flex items-center gap-6">
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
								sizes="sm:100vw md:50vw lg:auto"
								:src="src"
								:alt="alt"
							/>
						</Anchor>
					</div>
				</div>
				<div class="grid gap-4 text-2xl">
					<Anchor
						v-if="displayImageOf === 'product' && product"
						:to="`/product${product.absoluteUrl}`"
						:text="productName"
					>
						<span class="text-lg font-medium">{{ productName }}</span>
					</Anchor>
					<Rating :rate="review.rate" />
				</div>
			</div>
			<div class="grid h-full w-full">
				<ClientOnly>
					<span>{{ reviewComment }}</span>
				</ClientOnly>
			</div>
			<div class="flex justify-end">
				<div class="text-xs">
					<span>{{ review.createdAt }}</span>
				</div>
			</div>
		</div>
	</div>
</template>
