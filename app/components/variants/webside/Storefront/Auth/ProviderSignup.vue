<script lang="ts" setup>
const { t } = useStoreI18n('components/variants/webside/Storefront/Auth/ProviderSignup')
const localePath = useLocalePath()
// Links between auth pages keep the destination the shopper came with.
const { authLink } = useAuthLinks()
</script>

<template>
  <WebsidePageWrapper
    class="
      flex flex-col gap-4
      md:gap-8
    "
  >
    <WebsidePageTitle
      :text="t('title')"
      class="text-center capitalize"
    />
    <div
      class="
        flex flex-col items-center justify-end
        sm:flex-row
      "
    >
      <span
        class="
          text-sm text-primary-950
          dark:text-primary-50
        "
      >{{
        t('description')
      }}</span>

      <UButton
        :label="t('login')"
        :to="localePath(authLink('account-login'))"
        color="secondary"
        size="md"
        type="button"
        variant="link"
      />
    </div>

    <WebsideAccountProviderSignup />
  </WebsidePageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Εγγραφή
  description: Έχεις λογαριασμό;
</i18n>
