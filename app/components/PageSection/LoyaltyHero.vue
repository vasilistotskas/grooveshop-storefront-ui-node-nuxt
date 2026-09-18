<script lang="ts" setup>
/**
 * The member's points and tier. Renders nothing for a guest, and
 * nothing at all when the tenant's loyalty programme is off — so the
 * band must not paint its own ground until it knows there is something
 * inside it.
 */
defineProps<{
  /** The operator's section title, from the section row itself. */
  title?: string
}>()

const tenantStore = useTenantStore()
</script>

<template>
  <PageSectionBand
    v-if="tenantStore.loyaltyEnabled"
    :heading="title"
    padding="sm"
  >
    <LazyLoyaltyProgressHero />
  </PageSectionBand>
</template>
