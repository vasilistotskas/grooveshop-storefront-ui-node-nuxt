<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper
    class="
      container-3xs flex flex-col gap-4 !p-0

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
        :label="$t('login')"
        :to="localePath('account-login')"
        color="opposite"
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
