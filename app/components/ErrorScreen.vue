<script lang="ts" setup>
import type { NuxtError } from '#app'

const props = defineProps({
  error: Object as () => NuxtError,
})

const config = useRuntimeConfig()
const { t } = useI18n()
const { ogImageUrl } = useTenantBranding()

const showDebug = import.meta.dev || Boolean((config.public as Record<string, unknown>).debug)

useSeoMeta({
  title: t('error.page.title'),
  ogImage: () => ogImageUrl.value,
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

const statusHeading = computed(() => {
  const statusCode = props.error?.statusCode ?? 0
  if (statusCode === 404) return t('status.not.found')
  if (statusCode >= 500) return t('status.server')
  return t('status.generic')
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
    <!-- Theme-token visual (was a Lottie with baked-in platform-blue
         paths — every non-blue tenant got an off-brand error page, and
         the 50KB animation runtime shipped for it). -->
    <div
      v-if="error.statusCode === 404"
      class="
        pointer-events-none mx-auto flex max-w-md items-center
        justify-center px-6 pt-10
        sm:pt-16
      "
    >
      <div
        class="
          relative flex size-48 items-center justify-center rounded-full
          bg-(--ui-color-primary-100)
          dark:bg-(--ui-color-primary-900)
        "
      >
        <div
          aria-hidden="true"
          class="
            absolute -top-4 -right-4 size-24 rounded-full
            bg-(--ui-color-secondary-300)/30 blur-2xl
          "
        />
        <UIcon
          name="i-heroicons-map"
          class="
            size-24 text-primary-500
            dark:text-primary-400
          "
          aria-hidden="true"
        />
      </div>
    </div>
    <div
      v-else
      class="pointer-events-none absolute inset-0 overflow-hidden opacity-20"
    >
      <div
        v-for="(_blob, index) in 3"
        :key="index"
        class="
          absolute size-72 animate-pulse rounded-full mix-blend-multiply
          blur-3xl
          motion-reduce:animate-none
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

    <main
      class="
        relative z-10 flex min-h-screen flex-col items-center justify-center
        gap-6 py-8 text-center
        sm:py-12
      "
    >
      <h1
        class="
          font-display text-6xl font-bold text-primary-700
          sm:text-7xl
          dark:text-primary-300
        "
      >
        {{ error.statusCode }}
      </h1>
      <!-- Localized per status — the raw statusMessage is an English
           internal string ("Server Error", "Page not found") that has
           no place on a Greek storefront; debug mode still surfaces it
           in the card below. -->
      <p class="mt-4 max-w-2xl text-lg text-balance text-muted">
        {{ statusHeading }}
      </p>

      <UAlert
        v-if="helpfulTips.length > 0"
        color="neutral"
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
        v-if="showDebug && error.message"
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

      <div class="mt-8 flex items-center justify-center gap-6">
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
      </div>
    </main>
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
  status:
    not:
      found: Η σελίδα που ψάχνετε δεν βρέθηκε.
    server: Κάτι πήγε στραβά, δοκιμάστε ξανά σε λίγο.
    generic: Παρουσιάστηκε σφάλμα.
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
