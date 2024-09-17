<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')"
      class="text-center capitalize"
    />
    <PageBody>
      <div
        class="
          container-2xs grid gap-4 rounded !p-0

          md:px-6
        "
      >
        <Account2FaWebAuthnAddForm />
      </div>
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Προσθήκη κλειδιού WebAuthn
</i18n>
