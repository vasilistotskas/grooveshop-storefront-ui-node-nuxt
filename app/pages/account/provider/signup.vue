<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4

      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')" class="text-center capitalize"
    />
    <div
      class="
        flex flex-col items-center justify-end

        sm:flex-row
      "
    >
      <span
        class="
          text-primary-950 text-sm

          dark:text-primary-50
        "
      >{{
        t('description')
      }}</span>

      <UButton
        :label="$i18n.t('login')"
        :to="localePath('account-login')"
        color="secondary"
        size="md"
        type="button"
        variant="link"
      />
    </div>

    <AccountProviderSignup />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Εγγραφή
  description: Έχεις λογαριασμό;
</i18n>
