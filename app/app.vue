<script lang="ts" setup>
import * as uiLocales from '@nuxt/ui/locale'

setupPageHeader()
setupGoogleAnalyticsConsent()
setupCursorState()
setupSocialLogin()

const { enabled } = useAuthPreviewMode()
const { loggedIn, user } = useUserSession()
const config = useRuntimeConfig()
const siteConfig = useSiteConfig()
const { locales, locale, t } = useI18n()

watch([loggedIn, user], ([l, u]) => {
  if (import.meta.dev || process.env.NODE_ENV === 'development') return
  enabled.value = !!(l && u?.isSuperuser)
}, { immediate: true })

useSchemaOrg([
  defineWebPage(),
  defineWebSite({
    url: config.public.baseUrl,
    name: config.public.appTitle,
    description: siteConfig.description,
    inLanguage: locales.value.map((l: any) => l.language),
  }),
  defineOrganization({
    name: config.public.appTitle,
    logo: config.public.appLogo,
    sameAs: [
      config.public.socials.facebook,
      config.public.socials.twitter,
      config.public.socials.instagram,
    ],
  }),
])
defineOgImage({
  alt: config.public.appTitle,
  url: config.public.appLogo,
  width: 1200,
  height: 630,
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <LoadingIndicator />
  <UApp :locale="uiLocales[locale]">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <CookieControl />
  </UApp>
  <SkewNotification v-slot="{ isCurrentChunksOutdated, dismiss, reload }" force-open>
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div v-if="isCurrentChunksOutdated" class="fixed right-4 bottom-4 z-50">
        <div
          class="
            flex items-center gap-3 rounded-full bg-white px-4 py-3 shadow-lg
            ring-1 ring-gray-200
            dark:bg-gray-900 dark:ring-gray-800
          "
        >
          <span class="text-lg">✨</span>
          <div class="text-sm font-medium">
            {{ t('update.available') }}
          </div>
          <UButton color="secondary" size="xs" label="Refresh" @click="reload" />
          <UButton color="error" variant="ghost" size="xs" icon="i-heroicons-x-mark-20-solid" @click="dismiss" />
        </div>
      </div>
    </Transition>
  </SkewNotification>
</template>

<i18n lang="yaml">
el:
  update:
    available: Διαθέσιμη ενημέρωση
</i18n>
