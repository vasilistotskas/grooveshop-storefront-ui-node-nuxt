<script lang="ts" setup>
/**
 * The member's points and tier.
 *
 * Three things must be true before the band paints anything: the
 * tenant runs a loyalty programme, the visitor is signed in, and the
 * summary has arrived. `LoyaltyProgressHero` renders nothing for a
 * guest, so a band that only checked the tenant flag left an empty
 * strip on every anonymous visit — which is most of them.
 *
 * Client-only because "is this visitor signed in" is not something a
 * cached anonymous render can know.
 */
defineProps<{
  /** The operator's section title, from the section row itself. */
  title?: string
}>()

const tenantStore = useTenantStore()
const { loggedIn } = useUserSession()
</script>

<template>
  <ClientOnly>
    <PageSectionBand
      v-if="tenantStore.loyaltyEnabled && loggedIn"
      :heading="title"
      padding="sm"
    >
      <LazyLoyaltyProgressHero />
    </PageSectionBand>
  </ClientOnly>
</template>
