<script lang="ts" setup>
import emptyIcon from '~icons/mdi/package-variant-remove'

const userStore = useUserStore()
const { productReviews } = storeToRefs(userStore)

definePageMeta({
	layout: 'user'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4 md:gap-8">
		<PageHeader>
			<PageTitle :text="$t('pages.account.reviews.title')" />
		</PageHeader>
		<PageBody>
			<ProductReviewsList
				v-if="productReviews && productReviews.length"
				:reviews="productReviews"
				:reviews-count="productReviews.length"
				display-image-of="product"
			/>
			<EmptyState v-if="!productReviews" :icon="emptyIcon">
				<template #actions>
					<UButton :label="$t('common.empty.button')" :to="'index'" color="white" />
				</template>
			</EmptyState>
		</PageBody>
	</PageWrapper>
</template>
