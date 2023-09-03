<script lang="ts" setup>
import { PropType } from 'vue'
import { Favourite } from '~/types/product/favourite'
import { ButtonSize } from '~/types/global/button'
import heartJSON from '~/assets/lotties/heart.json'
import LottieClient from '~/components/global/Lottie/index.client.vue'
import { GlobalEvents } from '~/events/global'

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
	}
})

const { t } = useLang()
const toast = useToast()
const userStore = useUserStore()
const { favourites } = storeToRefs(userStore)
const lottie = ref<InstanceType<typeof LottieClient>>()
const bus = useEventBus<string>(GlobalEvents.USER_ACCOUNT_FAVOURITE)

const toggleFavourite = () => {
	if (!props.isAuthenticated || !props.userId || !favourites.value) {
		toast.error(t('components.add_to_favourite_button.not_authenticated'))
		return
	}
	const favouriteIndex = favourites.value.findIndex((f) => f.product === props.productId)
	if (favouriteIndex === -1) {
		bus.emit('create', {
			productId: String(props.productId),
			userId: String(props.userId)
		})
		lottie.value?.play()
		toast.success(t('components.add_to_favourite_button.added'))
	} else {
		bus.emit('delete', favourites.value[favouriteIndex].id)
		lottie.value?.goToAndStop(0)
		toast.success(t('components.add_to_favourite_button.removed'))
	}
}

const buttonLabel = computed(() => {
	return props.isFavourite
		? t('components.add_to_favourite_button.remove')
		: t('components.add_to_favourite_button.add')
})

const onAnimationLoaded = () => {
	if (props.isFavourite) {
		lottie.value?.goToAndStop(lottie.value?.getDuration() - 1 || 0)
	} else {
		lottie.value?.goToAndStop(0)
	}
}
</script>

<template>
	<Lottie
		ref="lottie"
		:text="buttonLabel"
		:component-element="'button'"
		:size="size"
		:animation-data="heartJSON"
		:width="'40px'"
		:loop="false"
		:auto-play="false"
		@on-animation-loaded="onAnimationLoaded"
		@click="toggleFavourite"
	/>
</template>
