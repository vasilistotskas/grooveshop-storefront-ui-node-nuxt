<script lang="ts" setup>
/**
 * The checkout's foot, as the boards draw it: the documents the shopper
 * agrees to and the store's phone, on one quiet line. The checkout has
 * no site footer, and these are what a shopper looks for before paying.
 *
 * Terms and privacy are seeded for every store, so they are always
 * linked, like the site footer does; the return policy only when the
 * store has published one. The phone is the merchant's published
 * contact (`useMerchantIdentity`).
 *
 * Rendered by the default checkout body rather than `layouts/checkout`,
 * which the frozen webside checkout shares.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const { published } = useFooterContentPages()
const { identity } = useMerchantIdentity()

const links = computed(() => [
  { label: t('terms'), to: localePath('terms-of-use') },
  { label: t('privacy'), to: localePath('privacy-policy') },
  ...(published.value.has(LEGAL_ROUTE_SLUGS['return-policy'])
    ? [{ label: t('returns'), to: localePath('return-policy') }]
    : []),
])

const phone = computed(() => identity.value?.phone?.trim() || null)
</script>

<template>
  <footer class="border-t border-default">
    <UContainer>
      <ul class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-5 text-sm text-toned">
        <li
          v-for="link in links"
          :key="link.to"
        >
          <ULink
            :to="link.to"
            class="hover:text-highlighted"
          >
            {{ link.label }}
          </ULink>
        </li>
        <li v-if="phone">
          <ULink
            :to="`tel:${phone.replace(/\s+/g, '')}`"
            class="hover:text-highlighted"
          >
            {{ t('help', { phone }) }}
          </ULink>
        </li>
      </ul>
    </UContainer>
  </footer>
</template>

<i18n lang="yaml">
el:
  terms: Όροι χρήσης
  privacy: Πολιτική απορρήτου
  returns: Πολιτική επιστροφών
  help: "Βοήθεια: {phone}"
en:
  terms: Terms of use
  privacy: Privacy policy
  returns: Return policy
  help: "Help: {phone}"
</i18n>
