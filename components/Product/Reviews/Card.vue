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

const src = computed(() => {
	if (props.displayImageOf === 'user') {
		return resolveImageSrc(
			userAccount.value?.mainImageFilename,
			`media/uploads/users/${userAccount.value?.mainImageFilename}`
		)
	} else {
		return resolveImageSrc(
			product.value?.mainImageFilename,
			`media/uploads/products/${product.value?.mainImageFilename}`
		)
	}
})

const alt = computed(() => {
	if (props.displayImageOf === 'user' && userAccount && userAccount?.value) {
		return userAccount.value?.firstName + ' ' + userAccount.value?.lastName
	} else if (props.displayImageOf === 'product' && product && product?.value) {
		return extractTranslated(product?.value, 'name', locale.value)
	}
	return ''
})
</script>

<template>
	<div class="card">
		<div class="grid justify-between items-center mb-4 md:flex">
			<div class="grid items-center gap-4 mr-4 md:grid-cols-2">
				<div class="w-auto h-auto">
					<UserAvatar
						v-if="userAccount && displayImageOf === 'user'"
						:user-account="userAccount"
					/>
					<div v-if="displayImageOf === 'product' && product" class="grid gap-2">
						<Anchor
							:to="`/product${product.absoluteUrl}`"
							:text="extractTranslated(product, 'name', locale)"
						>
							<NuxtImg
								preload
								loading="lazy"
								provider="mediaStream"
								class="product-img w-30 h-20 object-contain"
								sizes="sm:100vw md:50vw lg:auto"
								:src="src"
								:alt="alt"
							/>
						</Anchor>
						<Anchor
							:to="`/product${product.absoluteUrl}`"
							:text="extractTranslated(product, 'name', locale)"
						>
							<span class="text-lg font-medium">
								{{ extractTranslated(product, 'name', locale) }}
							</span>
						</Anchor>
					</div>
				</div>
				<div class="text-2xl">
					<Rating :rate="review.rate" />
				</div>
			</div>
			<div class="text-lg">
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
