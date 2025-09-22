<script lang="ts" setup>
import type { NuxtError } from '#app'

defineProps({
  error: Object as () => NuxtError,
})

const config = useRuntimeConfig()
const { t } = useI18n()

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
      grid bg-primary-100
      dark:bg-primary-900
    "
  >
    <PageHeader>
      <PageNavbar />
    </PageHeader>
    <div
      class="
        grid min-h-screen pt-[57px]
        md:pt-[65px]
        lg:pt-[65px]
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
            mb-2 grid items-center justify-center justify-items-center gap-4
            text-xl text-primary-950
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
            text-center text-primary-950
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
