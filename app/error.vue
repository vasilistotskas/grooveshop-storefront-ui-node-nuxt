<script lang="ts" setup>
import type { IFetchError } from 'ofetch'

import Json404 from '~/assets/lotties/404.json'

defineProps({
  error: {
    type: Object as PropType<IFetchError | null>,
    required: false,
    default: null,
  },
})

const { isMobile, isTablet } = useDevice()
const localePath = useLocalePath()

const lottieWidth = computed(() => (isMobile || isTablet ? '100%' : '1500px'))
const lottieHeight = computed(() => (isMobile || isTablet ? '300px' : '600px'))
</script>

<template>
  <div
    class="
      bg-primary-100 grid

      dark:bg-primary-900
    "
  >
    <PageHeader>
      <PageNavbar />
    </PageHeader>
    <div
      class="
        grid min-h-screen pt-[48px]

        lg:pt-[63px]

        md:pt-[56px]
      "
    >
      <div class="flex flex-col items-center justify-center gap-2 p-6">
        <h2
          class="
            text-primary-950 mb-2 grid items-center justify-center
            justify-items-center gap-4 text-xl

            dark:text-primary-50
          "
        >
          <strong class="text-5xl">{{ $t('pages.error.hmmm') }}</strong>
          <span>
            {{ $t('pages.error.page.not.found') }}
          </span>
        </h2>
        <p
          class="
            text-primary-950

            dark:text-primary-50
          "
        >
          {{ $t('pages.error.go.home') }}
        </p>
        <NuxtLink
          :to="localePath('/')"
          class="
            mt-2 block font-bold text-secondary

            hover:underline
          "
        >
          {{ $t('pages.error.home') }}
        </NuxtLink>
        <div class="grid items-center justify-center">
          <LazyLottie
            :animation-data="Json404"
            :height="lottieHeight"
            :show-client-loading-animation="false"
            :width="lottieWidth"
            class="mt-6 grid"
          />
        </div>
      </div>
    </div>
  </div>
</template>
