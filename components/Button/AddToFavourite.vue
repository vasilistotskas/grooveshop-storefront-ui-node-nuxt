<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ButtonSize } from '~/types/global/button'
import type { ProductFavourite } from '~/types/product/favourite'

const props = defineProps({
	productId: {
		type: Number as PropType<number>,
		required: true
	},
	userId: {
		type: Number as PropType<number | undefined>,
		required: false,
		default: undefined
	},
	isFavourite: {
		type: Boolean,
		required: true
	},
	favourite: {
		type: Object as PropType<ProductFavourite | null>,
		required: false,
		default: null
	},
	isAuthenticated: {
		type: Boolean,
		required: true
	},
	size: {
		type: String as PropType<ButtonSize>,
		default: 'md',
		validator: (value: string) => ['lg', 'md', 'sm', 'xs'].includes(value)
	},
	showLabel: {
		type: Boolean,
		default: false
	}
})

const userStore = useUserStore()
const { favouriteProducts } = storeToRefs(userStore)
const { getIsProductInFavourites } = userStore

const { t } = useI18n()
const toast = useToast()

const toggleFavourite = async () => {
	if (!props.isAuthenticated || !props.userId || !favouriteProducts) {
		toast.add({
			title: t('components.add_to_favourite_button.not_authenticated')
		})
		return
	}
	const isProductInFavorites = getIsProductInFavourites(props.productId)
	if (!isProductInFavorites) {
		await useFetch<ProductFavourite>(`/api/products/favourites`, {
			method: 'POST',
			body: {
				product: String(props.productId),
				user: String(props.userId)
			},
			query: {
				expand: 'true'
			},
			onRequestError({ error }) {
				toast.add({
					title: error.message,
					color: 'red'
				})
			},
			onResponse({ response }) {
				favouriteProducts.value?.push(response._data)
				toast.add({
					title: t('components.add_to_favourite_button.added')
				})
			},
			onResponseError({ error }) {
				toast.add({
					title: error?.message,
					color: 'red'
				})
			}
		})
	} else {
		const id = props.favourite?.id
		await useFetch(`/api/products/favourites/${id}`, {
			method: 'DELETE',
			onRequestError({ error }) {
				toast.add({
					title: error.message,
					color: 'red'
				})
			},
			onResponse() {
				favouriteProducts.value =
					favouriteProducts.value?.filter((favourite) => favourite.id !== id) || []
				toast.add({
					title: t('components.add_to_favourite_button.removed')
				})
			},
			onResponseError({ error }) {
				toast.add({
					title: error?.message,
					color: 'red'
				})
			}
		})
	}
}

const buttonLabel = computed(() => {
	if (!props.showLabel) return ''
	return props.isFavourite
		? t('components.add_to_favourite_button.remove')
		: t('components.add_to_favourite_button.add')
})

const buttonColor = computed(() => {
	return props.isFavourite ? 'rose' : 'white'
})
</script>

<template>
  <UButton
    :size="size"
    :label="buttonLabel"
    :icon="!isFavourite ? 'i-heroicons-heart' : 'i-heroicons-heart'"
    :color="buttonColor"
    :aria-label="buttonLabel || $t('components.add_to_favourite_button.add')"
    @click="toggleFavourite"
  />
</template>
