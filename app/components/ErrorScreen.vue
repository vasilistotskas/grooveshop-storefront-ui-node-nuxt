<script lang="ts" setup>
import type { NuxtError } from '#app'

/**
 * The storefront's error page — the 404 as the board draws it, and the
 * same frame for a server error or anything else.
 *
 * `error.vue` is a shell that renders outside every layout, so this body
 * draws the store's own chrome itself, resolved per tenant like the
 * layout does: the header above, the footer and the phone's tab bar
 * below. Between them the status code large, a line saying what
 * happened, a search, and the two ways out.
 */
const props = defineProps({
  error: Object as () => NuxtError,
})

const config = useRuntimeConfig()
const { t } = useI18n()
const localePath = useLocalePath()
const tenantStore = useTenantStore()
const { ogImageUrl } = useTenantBranding()

const navbar = computed(() => resolveChrome('navbar', tenantStore.schemaName))
const footer = computed(() => resolveChrome('footer', tenantStore.schemaName))
const mobileNav = computed(() => resolveChrome('mobile_nav', tenantStore.schemaName))
// Merchant UI toggle — fails OPEN, like the layout's.
const mobileBottomNavEnabled = useSettingFlag('MOBILE_BOTTOM_NAV_ENABLED', {
  fallback: true,
})

const showDebug = import.meta.dev || Boolean((config.public as Record<string, unknown>).debug)

const statusCode = computed(() => props.error?.statusCode ?? 0)
const kind = computed(() =>
  statusCode.value === 404 ? 'not_found' : statusCode.value >= 500 ? 'server' : 'generic',
)

// Localized per kind — the raw statusMessage is an English internal
// string ("Server Error", "Page not found") that has no place on a
// Greek storefront; debug mode still surfaces it in the card below.
const heading = computed(() => t(`${kind.value}.title`))
const lead = computed(() => t(`${kind.value}.lead`))
const pageTitle = computed(() => t('page_title', { code: statusCode.value }))

useSeoMeta({
  title: () => pageTitle.value,
  ogImage: () => ogImageUrl.value,
  ogImageAlt: () => heading.value,
  ogImageWidth: 1200,
  ogImageHeight: 630,
})
useHead({
  title: () => pageTitle.value,
})

/** "404" as three glyphs, so the middle one can take the accent. */
const digits = computed(() => String(statusCode.value).split(''))

const term = ref('')
const search = async () => {
  const query = term.value.trim()
  if (!query) return
  await clearError({ redirect: localePath({ name: 'search', query: { query } }) })
}

const goTo = (name: 'products' | 'contact') =>
  clearError({ redirect: localePath(name) })
</script>

<template>
  <div
    v-if="error"
    class="relative"
  >
    <component :is="navbar" />

    <UMain
      id="main-content"
      as="main"
    >
      <section
        class="
          flex flex-col items-center gap-6 px-4 py-16 text-center
          sm:py-24
        "
      >
        <p
          :aria-label="String(statusCode)"
          class="
            flex font-display text-[7rem]/none font-bold text-highlighted
            sm:text-[11rem]/none
          "
        >
          <span
            v-for="(digit, index) in digits"
            :key="index"
            aria-hidden="true"
            :class="digits.length === 3 && index === 1 ? 'text-accent' : ''"
          >{{ digit }}</span>
        </p>

        <div class="flex max-w-xl flex-col gap-3">
          <h1
            class="
              font-display text-[1.75rem]/[1.15] font-bold tracking-[-0.02em]
              text-balance text-highlighted
              sm:text-[2.5rem]/[1.1]
            "
          >
            {{ heading }}
          </h1>
          <p class="text-toned">
            {{ lead }}
          </p>
        </div>

        <form
          v-if="kind === 'not_found'"
          role="search"
          class="w-full max-w-xl"
          @submit.prevent="search"
        >
          <UInput
            v-model="term"
            type="search"
            icon="i-lucide-search"
            :placeholder="t('search.placeholder')"
            :aria-label="t('search.label')"
            size="xl"
            class="w-full"
            :ui="{ base: 'rounded-full' }"
          />
        </form>

        <div class="flex flex-wrap items-center justify-center gap-3">
          <UButton
            color="neutral"
            variant="solid"
            size="lg"
            class="rounded-full"
            @click="() => goTo('products')"
          >
            {{ t('shop') }}
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="lg"
            class="rounded-full"
            @click="() => goTo('contact')"
          >
            {{ t('contact') }}
          </UButton>
        </div>

        <UCard
          v-if="showDebug && error.message"
          variant="outline"
          class="mt-4 w-full max-w-2xl text-left"
        >
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-code-xml"
                class="size-5"
              />
              <span class="font-semibold">{{ t('debug.info') }}</span>
            </div>
          </template>

          <div class="space-y-2 text-sm">
            <div>
              <span class="font-medium">{{ t('debug.message') }}:</span>
              <code class="ms-2">{{ error.message }}</code>
            </div>
            <div v-if="error.data">
              <span class="font-medium">{{ t('debug.data') }}:</span>
              <pre class="mt-1 overflow-auto rounded bg-elevated p-2 text-xs">{{ error.data }}</pre>
            </div>
          </div>
        </UCard>
      </section>
    </UMain>

    <component :is="footer" />
    <component
      :is="mobileNav"
      v-if="mobileBottomNavEnabled"
      :include-cart="true"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  page_title: 'Σφάλμα {code}'
  not_found:
    title: Δεν βρήκαμε αυτή τη σελίδα.
    lead: Ο σύνδεσμος μπορεί να είναι παλιός ή να έχει λάθος. Δοκίμασε μια αναζήτηση ή γύρνα στο κατάστημα.
  server:
    title: Κάτι πήγε στραβά από τη δική μας πλευρά.
    lead: Δοκίμασε ξανά σε λίγο. Αν το πρόβλημα συνεχίζεται, επικοινώνησε μαζί μας.
  generic:
    title: Παρουσιάστηκε σφάλμα.
    lead: Δοκίμασε ξανά ή γύρνα στο κατάστημα.
  search:
    label: Αναζήτηση στο κατάστημα
    placeholder: Αναζήτηση προϊόντων και άρθρων
  shop: Πήγαινε στο κατάστημα
  contact: Επικοινωνία
  debug:
    info: Πληροφορίες αποσφαλμάτωσης
    message: Μήνυμα σφάλματος
    data: Δεδομένα σφάλματος
en:
  page_title: 'Error {code}'
  not_found:
    title: We could not find that page.
    lead: The link may be old or mistyped. Try a search, or head back to the shop.
  server:
    title: Something went wrong on our side.
    lead: Please try again shortly. If it keeps happening, get in touch.
  generic:
    title: An error occurred.
    lead: Try again, or head back to the shop.
  search:
    label: Search the shop
    placeholder: Search products and articles
  shop: Go to the shop
  contact: Contact us
  debug:
    info: Debug information
    message: Error message
    data: Error data
</i18n>
