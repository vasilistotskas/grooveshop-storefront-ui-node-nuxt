<script lang="ts" setup>
import type { PropType } from 'vue'
import type { Favourite } from '~/types/product/favourite'
import type { ButtonSize } from '~/types/global/button'

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
		type: Object as PropType<Favourite | null>,
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
const { favourites } = storeToRefs(userStore)
const { addFavourite, removeFavourite } = userStore

const { t } = useI18n()
const toast = useToast()

const toggleFavourite = async () => {
	if (!props.isAuthenticated || !props.userId || !favourites) {
		toast.add({
			title: t('components.add_to_favourite_button.not_authenticated')
		})
		return
	}
	const favouriteIndex = favourites.value?.findIndex((f) => f.product === props.productId)
	if (favouriteIndex === -1) {
		await addFavourite({
			product: String(props.productId),
			user: String(props.userId)
		})
			.then(() => {
				toast.add({
					title: t('components.add_to_favourite_button.added')
				})
			})
			.catch((err) => {
				toast.add({
					title: err.message
				})
			})
	} else if (favourites.value && favouriteIndex) {
		await removeFavourite(favourites.value[favouriteIndex].id)
			.then(() => {
				toast.add({
					title: t('components.add_to_favourite_button.removed')
				})
			})
			.catch((err) => {
				toast.add({
					title: err.message
				})
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
		@click="toggleFavourite"
	/>
</template>
