<script lang="ts" setup>
import type { UseSeoMetaInput } from '@unhead/schema'
import type { IFetchError } from 'ofetch'

import Json404 from '~/assets/lotties/404.json'

defineProps({
  error: {
    type: Object as PropType<IFetchError | null>,
    required: false,
    default: null,
  },
})

const colorMode = useColorMode()

const themeClass = computed(() =>
  colorMode.value === 'dark' ? 'dark' : 'light',
)
const themeColor = computed(() =>
  colorMode.value === 'dark' ? '#1a202c' : '#ffffff',
)
const { isMobile, isTablet } = useDevice()
const lottieWidth = computed(() => (isMobile || isTablet ? '100%' : '1500px'))
const lottieHeight = computed(() => (isMobile || isTablet ? '300px' : '600px'))

const headOptions = {
  htmlAttrs: {
    class: () => themeClass.value,
  },
}
const seoMetaOptions = {
  colorScheme: colorMode.value === 'dark' ? 'dark' : 'light',
  themeColor: themeColor.value,
  msapplicationTileColor: themeColor.value,
} satisfies UseSeoMetaInput

useHead(headOptions)
useSeoMeta(seoMetaOptions)
</script>

<template>
  <div class="grid bg-white dark:bg-zinc-900">
    <PageHeader>
      <PageNavbar />
    </PageHeader>
    <div class="grid min-h-screen">
      <div class="flex flex-col items-center justify-center gap-2 p-6">
        <h2
          class="text-primary-800 dark:text-primary-100 mb-2 grid items-center justify-center justify-items-center gap-4 text-xl"
        >
          <strong class="text-5xl">{{ $t('pages.error.hmmm') }}</strong>
          <span>
            {{ $t('pages.error.page.not.found') }}
          </span>
        </h2>
        <p class="text-primary-800 dark:text-primary-100">
          {{ $t('pages.error.go.home') }}
        </p>
        <NuxtLink
          to="/"
          class="text-secondary mt-2 block font-bold hover:underline"
        >
          {{ $t('pages.error.home') }}
        </NuxtLink>
        <div class="grid items-center justify-center">
          <LazyLottie
            class="mt-6 grid"
            :animation-data="Json404"
            :width="lottieWidth"
            :height="lottieHeight"
            :show-client-loading-animation="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>
