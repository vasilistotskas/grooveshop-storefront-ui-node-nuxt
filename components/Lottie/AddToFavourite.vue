<script lang="ts" setup>
import type { PropType } from 'vue'

import heartJSON from '~/assets/lotties/heart.json'
import Lottie from '~/components/Lottie/index.vue'
import type { ButtonSize } from '~/types/global/button'
import type { ProductFavourite } from '~/types/product/favourite'

const props = defineProps({
  productId: {
    type: Number as PropType<number>,
    required: true,
  },
  userId: {
    type: Number as PropType<number | undefined>,
    required: false,
    default: undefined,
  },
  isFavourite: {
    type: Boolean,
    required: true,
  },
  favourite: {
    type: Object as PropType<ProductFavourite | null>,
    required: false,
    default: null,
  },
  isAuthenticated: {
    type: Boolean,
    required: true,
  },
  size: {
    type: String as PropType<ButtonSize>,
    default: 'md',
    validator: (value: string) => ['lg', 'md', 'sm', 'xs'].includes(value),
  },
})

const userStore = useUserStore()
const { favouriteProducts } = storeToRefs(userStore)
const { getUserProductFavourite } = userStore

const { t } = useI18n()
const toast = useToast()

const lottie = ref<InstanceType<typeof Lottie>>()

const toggleFavourite = async () => {
  if (!props.isAuthenticated || !props.userId || !favouriteProducts) {
    toast.add({
      title: t('components.add_to_favourite_button.not_authenticated'),
    })
    return
  }
  const isProductInFavorites = getUserProductFavourite(props.productId)
  if (!isProductInFavorites) {
    await useFetch(`/api/products/favourites`, {
      method: 'POST',
      body: {
        product: String(props.productId),
        user: String(props.userId),
      },
      query: {
        expand: 'true',
      },
      onRequestError({ error }) {
        toast.add({
          title: error.message,
          color: 'red',
        })
      },
      onResponse({ response }) {
        favouriteProducts.value?.push(response._data)
        lottie.value?.play()
        toast.add({
          title: t('components.add_to_favourite_button.added'),
        })
      },
      onResponseError({ error }) {
        toast.add({
          title: error?.message,
          color: 'red',
        })
      },
    })
  } else {
    const id = props.favourite?.id
    await useFetch(`/api/products/favourites/${id}`, {
      method: 'DELETE',
      onRequestError({ error }) {
        toast.add({
          title: error.message,
          color: 'red',
        })
      },
      onResponse() {
        favouriteProducts.value =
          favouriteProducts.value?.filter((favourite) => favourite.id !== id) ||
          []
        lottie.value?.goToAndStop(0)
        toast.add({
          title: t('components.add_to_favourite_button.removed'),
        })
      },
      onResponseError({ error }) {
        toast.add({
          title: error?.message,
          color: 'red',
        })
      },
    })
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
  <LazyLottie
    ref="lottie"
    :text="buttonLabel"
    :component-element="'button'"
    :size="size"
    :animation-data="heartJSON"
    :width="'40px'"
    :height="'40px'"
    :loop="false"
    :auto-play="false"
    @on-animation-loaded="onAnimationLoaded"
    @click="toggleFavourite"
  />
</template>
