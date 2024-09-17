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
        <Account2FaTotpActivateForm />
      </div>
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Ενεργοποίηση εφαρμογής ελέγχου ταυτότητας (TOTP)
</i18n>
