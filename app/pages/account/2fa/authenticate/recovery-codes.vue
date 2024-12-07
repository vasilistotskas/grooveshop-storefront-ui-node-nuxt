<script lang="ts" setup>
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()

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
      container-3xs flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="$t('authenticate.recovery_code')"
      class="text-center capitalize"
    />

    <Account2FaAuthenticateCode :authenticator-type="AuthenticatorType.RECOVERY_CODES" />
  </PageWrapper>
</template>
