<script lang="ts" setup>
/**
 * The footer's last line in webside's design: the copyright, then how the
 * store takes payment and which carriers it ships with («Κάρτα ·
 * Αντικαταβολή · ACS · BOX NOW»), read from its pay ways and its shipping
 * policy (`useStoreAssuranceFacts`), never typed, and the cookie settings
 * where the store has optional services to consent to.
 *
 * `stacked` is the phone's: the copyright on its own line over the rest,
 * centred. Otherwise the two halves sit at either end of one row.
 */
withDefaults(defineProps<{
  stacked?: boolean
}>(), {
  stacked: false,
})

const siteConfig = useSiteConfig()
const localePath = useLocalePath()
const { t } = useStoreI18n('components/variants/webside/Footer/Legal')
const { isModalActive } = useCookieControl()
const tenantStore = useTenantStore()
const facts = await useStoreAssuranceFacts()

const currentYear = new Date().getFullYear()
const ways = computed(() => [...(facts.value?.paymentWays ?? []), ...(facts.value?.carriers ?? [])])

const openCookieModal = () => {
  isModalActive.value = true
}
</script>

<template>
  <div
    class="flex gap-x-3 gap-y-1 text-muted"
    :class="stacked ? 'flex-col items-center text-center text-xs/normal' : `
      flex-wrap items-center justify-between text-[0.8125rem]
    `"
  >
    <p>
      &copy; {{ currentYear }}&nbsp;<NuxtLink
        :to="localePath('index')"
        class="
          text-muted
          hover:text-default
        "
      >{{ siteConfig.name }}™</NuxtLink>. {{ t('all_rights_reserved') }}.
    </p>
    <p
      v-if="ways.length || tenantStore.hasOptionalServices"
    >
      <template
        v-for="(way, index) in ways"
        :key="way"
      >
        <template v-if="index">
          ·
        </template>{{ way }}
      </template>
      <template v-if="tenantStore.hasOptionalServices">
        <template v-if="ways.length">
          ·
        </template>
        <button
          type="button"
          class="
            inline-flex min-h-11 items-center text-accent
            hover:underline
            focus-visible:outline-2 focus-visible:outline-secondary
            sm:min-h-0
          "
          @click="openCookieModal"
        >
          {{ t('cookie_settings') }}
        </button>
      </template>
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  all_rights_reserved: Με επιφύλαξη παντός δικαιώματος
  cookie_settings: Ρυθμίσεις cookies
en:
  all_rights_reserved: All rights reserved
  cookie_settings: Cookie settings
</i18n>
