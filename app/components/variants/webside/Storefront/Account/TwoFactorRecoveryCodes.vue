<script lang="ts" setup>
const { t } = useI18n()
// Every account route rendered with the document title left at the
// store name, twice — 46 pages whose browser tab and history entry were
// indistinguishable. The `title` string was already here and simply
// never applied.
useHead({ title: () => t('title') })
</script>

<template>
  <WebsideAccountAreaPageWrapper class="md:!p-0">
    <WebsidePageTitle
      :text="t('title')"
      class="sr-only"
    />

    <WebsideAccount2FaRecoveryCodes>
      <aside
        class="md:sticky md:top-16"
      >
        <WebsideAccountAuthSettingsNavigation />
      </aside>
    </WebsideAccount2FaRecoveryCodes>
  </WebsideAccountAreaPageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Κωδικοί Ανάκτησης
en:
  title: Recovery Codes
</i18n>
