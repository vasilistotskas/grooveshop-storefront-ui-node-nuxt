<script lang="ts" setup>
import type { NuxtError } from '#app'

const props = defineProps({
  error: Object as () => NuxtError,
})

const config = useRuntimeConfig()
const { t } = useI18n()

useSeoMeta({
  title: t('error.page.title'),
  ogImage: config.public.appLogo,
  ogImageAlt: 'Page not found',
  ogImageWidth: 1200,
  ogImageHeight: 630,
})

useHead({
  title: t('error.page.title'),
})

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

    <UError
      :error="error"
      redirect="/"
      :clear="false"
      class="relative z-10 flex min-h-screen items-center justify-center py-8 sm:py-12"
    >
      <template #message>
        <UAlert
          v-if="helpfulTips.length > 0"
          color="info"
          variant="soft"
          :title="t('helpful.tips')"
          class="mt-6 max-w-2xl text-left"
        >
          <template #description>
            <ul class="mt-2 space-y-1 text-sm">
              <li
                v-for="(tip, tipIndex) in helpfulTips"
                :key="tipIndex"
                class="flex items-start gap-2"
              >
                <UIcon
                  name="i-heroicons-check-circle"
                  class="mt-0.5 size-4 shrink-0"
                />
                <span>{{ tip }}</span>
              </li>
            </ul>
          </template>
        </UAlert>

        <UCard
          v-if="error.message"
          variant="outline"
          class="mt-4 max-w-2xl text-left"
        >
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-code-bracket" class="size-5" />
              <span class="font-semibold">{{ t('debug.info') }}</span>
            </div>
          </template>

          <div class="space-y-2 text-sm">
            <div v-if="error.message">
              <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('error.message') }}:</span>
              <code class="ml-2 text-error-600 dark:text-error-400">{{ error.message }}</code>
            </div>
            <div v-if="error.data">
              <span class="font-medium text-gray-700 dark:text-gray-300">{{ t('error.data') }}:</span>
              <pre class="mt-1 overflow-auto rounded bg-gray-100 p-2 text-xs dark:bg-gray-800">{{ error.data }}</pre>
            </div>
          </div>
        </UCard>
      </template>

      <template #links>
        <UButton
          size="xl"
          color="neutral"
          variant="solid"
          icon="i-heroicons-home-20-solid"
          class="rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
          @click="clearError({ redirect: '/' })"
        >
          {{ t('home') }}
        </UButton>

        <UButton
          size="xl"
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-left-20-solid"
          class="rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
          @click="$router.back()"
        >
          {{ t('go.back') }}
        </UButton>
      </template>
    </UError>
  </div>
</template>

<i18n lang="yaml">
el:
  go:
    back: Επιστροφή Πίσω
  home: Αρχική
  error:
    page:
      title: Σφάλμα 404
    message: Μήνυμα σφάλματος
    data: Δεδομένα σφάλματος
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
