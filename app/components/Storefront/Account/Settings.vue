<script lang="ts" setup>
const { t } = useI18n()
// Every account route rendered with the document title left at the
// store name, twice — 46 pages whose browser tab and history entry were
// indistinguishable. The `title` string was already here and simply
// never applied.
useHead({ title: () => t('title') })
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader :title="t('title')" />

    <AccountSettingsForm />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Προφίλ
en:
  title: Profile
</i18n>
