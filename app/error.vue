<script lang="ts" setup>
import Json404 from '~/assets/lotties/404.json'
import type { NuxtError } from '#app'

defineProps({
  error: Object as () => NuxtError,
})

const { isMobile, isTablet } = useDevice()
const config = useRuntimeConfig()
const { t } = useI18n({ useScope: 'local' })

const lottieWidth = computed(() => (isMobile || isTablet ? '100%' : '1500px'))
const lottieHeight = computed(() => (isMobile || isTablet ? '300px' : '500px'))

const ogImageOptions = reactive({
  alt: 'Page not found ⚠️',
  url: config.public.appLogo,
  width: 1200,
  height: 630,
})

useSeoMeta({
  title: t('error.page.title'),
})

useHead({
  title: t('error.page.title'),
})

defineOgImage(ogImageOptions)
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
        grid min-h-screen pt-[57px]

        lg:pt-[65px]

        md:pt-[65px]
      "
    >
      <div
        class="
          flex flex-col items-center gap-2 p-4

          md:justify-center
        "
      >
        <h2
          class="
            text-primary-950 mb-2 grid items-center justify-center
            justify-items-center gap-4 text-xl

            dark:text-primary-50
          "
        >
          <strong class="text-5xl">{{ t('hmmm') }}</strong>
          <span class="text-center">
            {{ t('page.not.found') }}
          </span>
        </h2>
        <p
          class="
            text-primary-950 text-center

            dark:text-primary-50
          "
        >
          {{ t('go.home') }}
        </p>
        <Anchor
          :to="'index'"
          class="
            mt-2 block font-bold

            hover:underline
          "
        >
          {{ t('home') }}
        </Anchor>
        <div class="grid items-center justify-center">
          <Lottie
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

<i18n lang="yaml">
el:
  home: Πίσω στην Αρχική
  hmmm: Χμμμ
  error:
    page:
      title: Σφαλμα 404
  page:
    not:
      found: H αράχνη δεν μπόρεσε να βρει την σελίδα που ψάχνεις.
  go:
    home: Μπορεί όμως να σε οδηγήσει στην αρχική σελίδα!
</i18n>
