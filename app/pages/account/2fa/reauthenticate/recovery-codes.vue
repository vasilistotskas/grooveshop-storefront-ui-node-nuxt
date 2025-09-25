<script lang="ts" setup>
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()
const { t } = useI18n()

if (authEvent.value !== AuthChangeEvent.REAUTHENTICATION_REQUIRED) {
  await navigateTo(localePath('index'))
}

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <Account2FaReauthenticateCode>
    <p>{{ t('reauthenticate.recovery_code') }}:</p>
  </Account2FaReauthenticateCode>
</template>

<i18n lang="yaml">
el:
  reauthenticate:
    recovery_code: Εισήγαγε έναν κωδικό ανάκτησης
</i18n>
