<script setup lang="ts">
/**
 * The cookie banner: what the shop uses cookies for, the two answers at
 * equal weight — necessary only, or all — and the way into the choices.
 * It stays until the visitor decides. The preferences
 * (`Cookie/Preferences.vue`) open from here and from the footer.
 *
 * A card, not a full-width bar: in the bottom-left corner on a wide
 * screen, inset from the edges on a phone, where all three buttons fit
 * at 360px.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const tenantStore = useTenantStore()
const { isConsentGiven, isModalActive } = useCookieControl()
const { acceptAll, necessaryOnly } = useCookieConsent()
useCookieConsentSync()

/** The analytics and ad services this store has switched on, by name. */
const services = computed(() => [
  (tenantStore.gaTrackingId || tenantStore.googleAdsConversionId) && 'Google',
  tenantStore.metaPixelId && 'Meta',
  tenantStore.tiktokPixelId && 'TikTok',
].filter((name): name is string => Boolean(name)))
</script>

<template>
  <div>
    <!-- Client-only: the decision lives in the visitor's cookie, but the
         cached routes are rendered once, anonymously, for everyone — a
         server-rendered banner flashed on every returning visit until
         hydration read the cookie and removed it. -->
    <ClientOnly>
      <section
        v-if="!isConsentGiven && !isModalActive"
        aria-labelledby="cookie-consent-title"
        class="
          fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))]
          z-60 flex flex-col gap-3.5 rounded-[1.5rem] bg-default p-5.5 shadow-xl
          ring ring-default
          sm:inset-x-auto sm:start-8 sm:bottom-8 sm:w-115
        "
      >
        <div class="flex items-center gap-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-[0.75rem] bg-volt text-on-volt">
            <UIcon
              name="i-lucide-cookie"
              class="size-5"
            />
          </span>
          <h2
            id="cookie-consent-title"
            class="text-[1.0625rem] font-bold text-highlighted"
          >
            {{ t('title') }}
          </h2>
        </div>

        <p class="text-sm text-muted">
          {{ services.length ? t('body_services', { services: services.join(', ') }) : t('body') }}
          <ULink
            :to="localePath('cookies-policy')"
            class="font-semibold text-accent hover:underline"
          >
            {{ t('policy') }}
          </ULink>
        </p>

        <!-- Side by side while both labels fit, one above the other when
             they do not — never a truncated answer. -->
        <div class="flex flex-wrap gap-2">
          <UButton
            color="neutral"
            variant="outline"
            class="flex-auto justify-center"
            :label="t('necessary_only')"
            @click="necessaryOnly"
          />
          <UButton
            color="primary"
            class="flex-auto justify-center"
            :label="t('accept_all')"
            @click="acceptAll"
          />
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          class="justify-center"
          :label="t('customise')"
          @click="() => { isModalActive = true }"
        />
      </section>
    </ClientOnly>

    <LazyCookiePreferences v-if="isModalActive" />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Τα cookies, με δυο λόγια
  body: Χρησιμοποιούμε τα απαραίτητα cookies για να λειτουργεί το κατάστημα. Με τη συγκατάθεσή σου χρησιμοποιούμε και προαιρετικά cookies, για να το βελτιώνουμε.
  body_services: "Χρησιμοποιούμε τα απαραίτητα cookies για να λειτουργεί το κατάστημα. Με τη συγκατάθεσή σου χρησιμοποιούμε και cookies στατιστικών και διαφημίσεων ({services}), για να το βελτιώνουμε."
  policy: Πολιτική cookies
  necessary_only: Μόνο τα απαραίτητα
  accept_all: Αποδοχή όλων
  customise: Προσαρμογή
en:
  title: Cookies, briefly
  body: We use necessary cookies to run the shop. With your OK we also use optional cookies to improve it.
  body_services: "We use necessary cookies to run the shop. With your OK we also use analytics and ad cookies ({services}) to improve it."
  policy: Cookie policy
  necessary_only: Necessary only
  accept_all: Accept all
  customise: Customise
</i18n>
