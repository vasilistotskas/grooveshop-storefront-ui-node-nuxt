<script lang="ts" setup>
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

if (authEvent.value !== AuthChangeEvent.FLOW_UPDATED) {
  await navigateTo(localePath('index'))
}

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
      :text="$i18n.t('authenticate.totp')"
      class="text-center capitalize"
    />

    <Account2FaAuthenticateCode :authenticator-type="AuthenticatorType.TOTP" />
  </PageWrapper>
</template>
