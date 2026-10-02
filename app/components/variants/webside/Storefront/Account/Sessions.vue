<script lang="ts" setup>
const { t } = useI18n()
// Every account route rendered with the document title left at the
// store name, twice — 46 pages whose browser tab and history entry were
// indistinguishable. The `title` string was already here and simply
// never applied.
useHead({ title: () => t('title') })
</script>

<template>
  <WebsideAccountAreaPageWrapper
    class="
      flex flex-col gap-4
      md:gap-8 md:!p-0
    "
  >
    <WebsidePageTitle
      :text="t('title')"
      class="hidden"
    />

    <WebsideAccountSessionsManage>
      <aside
        class="md:sticky md:top-16"
      >
        <WebsideAccountAuthSettingsNavigation />
      </aside>
    </WebsideAccountSessionsManage>
  </WebsideAccountAreaPageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Συνεδρίες
en:
  title: Sessions
</i18n>
