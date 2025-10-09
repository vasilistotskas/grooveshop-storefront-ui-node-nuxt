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

const handleGoHome = () => {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div
    v-if="error"
    class="
      relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-50
      via-white to-primary-100
      dark:from-gray-950 dark:via-gray-900 dark:to-primary-950
    "
  >
    <div class="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
      <div
        class="
          absolute top-20 left-10 size-72 animate-pulse rounded-full
          bg-primary-300 mix-blend-multiply blur-3xl
          dark:bg-primary-700
        "
      />
      <div
        class="
          absolute top-40 right-10 size-72 animate-pulse rounded-full
          bg-warning-300 mix-blend-multiply blur-3xl
          [animation-delay:2s]
          dark:bg-warning-700
        "
      />
      <div
        class="
          absolute bottom-20 left-1/2 size-72 animate-pulse rounded-full
          bg-error-300 mix-blend-multiply blur-3xl
          [animation-delay:4s]
          dark:bg-error-700
        "
      />
    </div>

    <UMain class="relative z-10 flex items-center justify-center">
      <UContainer>
        <div class="flex flex-col items-center gap-6 py-12 text-center">
          <div class="group relative">
            <div
              class="
                text-9xl font-black text-primary-300 transition-all duration-500
                select-none
                group-hover:scale-110
                dark:text-primary-700
              "
            >
              {{ error.statusCode }}
            </div>
            <div class="absolute inset-0 flex items-center justify-center">
              <UIcon
                name="i-heroicons-face-frown"
                class="
                  size-32 text-secondary-600 transition-all duration-500
                  group-hover:rotate-12
                  dark:text-secondary-400
                "
              />
            </div>
          </div>
          <template v-if="error.statusCode === 404">
            <div
              class="max-w-2xl space-y-4"
            >
              <h1
                class="
                  bg-gradient-to-r from-primary-600 to-primary-900 bg-clip-text
                  text-4xl font-bold text-transparent
                  sm:text-5xl
                  dark:from-primary-400 dark:to-primary-200
                "
              >
                {{ t('hmmm') }}
              </h1>

              <p
                class="
                  text-lg text-gray-700
                  sm:text-xl
                  dark:text-gray-300
                "
              >
                {{ t('page.not.found') }}
              </p>

              <p
                class="
                  text-base text-gray-600
                  dark:text-gray-400
                "
              >
                {{ t('go.home') }}
              </p>
            </div>

            <div
              class="
                mt-8 flex flex-col gap-4
                sm:flex-row
              "
            >
              <UButton
                size="xl"
                color="neutral"
                variant="solid"
                icon="i-heroicons-home-20-solid"
                class="
                  rounded-full shadow-lg transition-all duration-300
                  hover:scale-105 hover:shadow-xl
                "
                @click="handleGoHome"
              >
                {{ t('home') }}
              </UButton>

              <UButton
                size="xl"
                color="neutral"
                variant="outline"
                icon="i-heroicons-arrow-left-20-solid"
                class="
                  rounded-full shadow-lg transition-all duration-300
                  hover:scale-105 hover:shadow-xl
                "
                @click="$router.back()"
              >
                {{ t('go.back') }}
              </UButton>
            </div>

            <div
              class="mt-12"
            >
              <p
                class="
                  mb-4 text-sm font-medium text-gray-600
                  dark:text-gray-400
                "
              >
                {{ t('popular.pages') }}
              </p>
              <div class="flex flex-wrap justify-center gap-3">
                <UButton
                  v-for="link in [
                    { to: '/', label: t('homepage'), icon: 'i-heroicons-home' },
                    { to: '/about', label: t('about'), icon: 'i-heroicons-information-circle' },
                    { to: '/contact', label: t('contact'), icon: 'i-heroicons-envelope' },
                  ]"
                  :key="link.to"
                  :to="link.to"
                  size="sm"
                  variant="soft"
                  color="neutral"
                  :icon="link.icon"
                  class="
                    rounded-full transition-transform duration-300
                    hover:scale-105
                  "
                >
                  {{ link.label }}
                </UButton>
              </div>
            </div>
          </template>
        </div>
      </UContainer>
    </UMain>
  </div>
</template>

<i18n lang="yaml">
el:
  home: Αρχική Σελίδα
  go:
    back: Επιστροφή Πίσω
    home: Μπορεί όμως να σε οδηγήσει στην αρχική σελίδα!
  hmmm: Ωχ, κάτι πήγε στραβά!
  error:
    page:
      title: Σφάλμα 404
  page:
    not:
      found: H αράχνη δεν μπόρεσε να βρει την σελίδα που ψάχνεις
  popular:
    pages: Δημοφιλείς σελίδες
  homepage: Αρχική
  about: Σχετικά με εμάς
  contact: Επικοινωνία
</i18n>
