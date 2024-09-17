<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const authStore = useAuthStore()
const { hasCurrentPassword } = storeToRefs(authStore)

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
      :text="hasCurrentPassword ? t('change.title') : t('set.title')"
      class="text-center capitalize"
    />
    <PageBody>
      <p
        class="
          text-primary-950 text-center

          dark:text-primary-50
        "
      >
        {{ hasCurrentPassword ? t('change.description') : t('set.description')
        }}
      </p>
      <AccountPasswordChangeForm />
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  change:
    title: Αλλαγή κωδικού πρόσβασης
    description: Εισήγαγε τον τρέχον κωδικό πρόσβασης, ακολουθούμενο από τον νέο
      κωδικό πρόσβασης.
  set:
    title: Όρισε έναν κωδικό πρόσβασης
    description: Αυτή τη στιγμή δεν έχεις καθορίσει κωδικό πρόσβασης. Εισήγαγε
      τον (νέο) κωδικό πρόσβασης.
</i18n>
