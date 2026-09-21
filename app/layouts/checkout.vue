<script lang="ts" setup>
const { t } = useI18n()
const tenantStore = useTenantStore()

// The checkout header resolves like every other piece of chrome: the
// platform's unless the tenant ships its own (app/utils/variantRegistry.ts).
const checkoutHeader = computed(() =>
  resolveChrome('checkout_header', tenantStore.schemaName),
)
</script>

<template>
  <div class="relative">
    <a
      href="#main-content"
      class="
        sr-only z-50 rounded-md bg-secondary px-4 py-2 text-sm font-medium
        text-white
        focus:not-sr-only focus:fixed focus:top-2 focus:left-2
      "
    >
      {{ t('a11y.skipToContent') }}
    </a>

    <component :is="checkoutHeader" />

    <UMain
      id="main-content"
      as="main"
    >
      <section class="flex w-full flex-1 flex-col">
        <slot />
      </section>
    </UMain>
  </div>
</template>

<i18n lang="yaml">
el:
  a11y:
    skipToContent: Μετάβαση στο κύριο περιεχόμενο
en:
  a11y:
    skipToContent: Skip to main content
</i18n>
