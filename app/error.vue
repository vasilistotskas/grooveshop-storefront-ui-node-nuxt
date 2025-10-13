<script lang="ts" setup>
import type { NuxtError } from '#app'

const props = defineProps({
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

const helpfulTips = computed(() => {
  if (props.error?.statusCode === 404) {
    return [
      t('tip.check.url'),
      t('tip.use.search'),
      t('tip.go.home'),
    ]
  }
  else if (props.error?.statusCode === 500) {
    return [
      t('tip.server.error'),
      t('tip.try.again'),
      t('tip.contact.support'),
    ]
  }
  return [t('tip.general')]
})
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
        v-for="(_blob, index) in 3"
        :key="index"
        class="
          absolute size-72 animate-pulse rounded-full mix-blend-multiply
          blur-3xl
          dark:mix-blend-lighten
        "
        :class="[
          index === 0 && `
            top-20 left-10 bg-primary-300
            dark:bg-primary-700
          `,
          index === 1 && `
            top-40 right-10 bg-warning-300
            [animation-delay:2s]
            dark:bg-warning-700
          `,
          index === 2 && `
            bottom-20 left-1/2 bg-error-300
            [animation-delay:4s]
            dark:bg-error-700
          `,
        ]"
      />
    </div>

    <UMain
      class="
        relative z-10 flex items-center justify-center py-8
        sm:py-12
      "
    >
      <UContainer>
        <div class="flex flex-col items-center gap-8 text-center">
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

          <div class="max-w-2xl space-y-4">
            <h1
              class="
                bg-gradient-to-r from-primary-600 to-primary-900 bg-clip-text
                text-4xl font-bold text-transparent
                sm:text-5xl
                dark:from-primary-400 dark:to-primary-200
              "
            >
              {{ error.statusCode === 404 ? t('hmmm') : t('error.general.title') }}
            </h1>

            <p
              class="
                text-lg text-gray-700
                sm:text-xl
                dark:text-gray-300
              "
            >
              {{ error.statusCode === 404 ? t('page.not.found') : error.statusMessage || t('error.general.message') }}
            </p>
          </div>

          <div
            class="
              flex flex-col gap-4
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

          <UAlert
            v-if="helpfulTips.length > 0"
            color="info"
            variant="soft"
            :title="t('helpful.tips')"
            class="max-w-2xl"
          >
            <template #description>
              <ul class="mt-2 space-y-1 text-sm">
                <li
                  v-for="(tip, index) in helpfulTips" :key="index" class="
                    flex items-start gap-2
                  "
                >
                  <UIcon
                    name="i-heroicons-check-circle" class="
                      mt-0.5 size-4 shrink-0
                    "
                  />
                  <span>{{ tip }}</span>
                </li>
              </ul>
            </template>
          </UAlert>

          <UCard
            v-if="error.message"
            variant="outline"
            class="max-w-2xl"
          >
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-code-bracket" class="size-5" />
                <span class="font-semibold">{{ t('debug.info') }}</span>
              </div>
            </template>

            <div class="space-y-2 text-left text-sm">
              <div v-if="error.message">
                <span
                  class="
                    font-medium text-gray-700
                    dark:text-gray-300
                  "
                >{{ t('error.message') }}:</span>
                <code
                  class="
                    ml-2 text-error-600
                    dark:text-error-400
                  "
                >{{ error.message }}</code>
              </div>
              <div v-if="error.data">
                <span
                  class="
                    font-medium text-gray-700
                    dark:text-gray-300
                  "
                >{{ t('error.data') }}:</span>
                <pre
                  class="
                    mt-1 overflow-auto rounded bg-gray-100 p-2 text-xs
                    dark:bg-gray-800
                  "
                >{{ error.data }}</pre>
              </div>
            </div>
          </UCard>
        </div>
      </UContainer>
    </UMain>
  </div>
</template>

<i18n lang="yaml">
el:
  go:
    back: Επιστροφή Πίσω
  home: Αρχική
  hmmm: Ωχ, κάτι πήγε στραβά!
  error:
    page:
      title: Σφάλμα 404
    general:
      title: Ωχ! Κάτι πήγε στραβά
      message: Παρουσιάστηκε ένα μη αναμενόμενο σφάλμα
    message: Μήνυμα σφάλματος
    data: Δεδομένα σφάλματος
  page:
    not:
      found: H αράχνη δεν μπόρεσε να βρει την σελίδα που ψάχνεις
  helpful:
    tips: Χρήσιμες συμβουλές
  tip:
    check:
      url: Ελέγξτε αν η διεύθυνση URL είναι σωστή
    use:
      search: Χρησιμοποιήστε την αναζήτηση για να βρείτε αυτό που ψάχνετε
    go:
      home: Επιστρέψτε στην αρχική σελίδα
    server:
      error: Παρουσιάστηκε σφάλμα διακομιστή
    try:
      again: Δοκιμάστε ξανά σε λίγα λεπτά
    contact:
      support: Επικοινωνήστε με την υποστήριξη αν το πρόβλημα παραμένει
    general: Κάτι πήγε στραβά, δοκιμάστε ξανά
  debug:
    info: Πληροφορίες αποσφαλμάτωσης
</i18n>
