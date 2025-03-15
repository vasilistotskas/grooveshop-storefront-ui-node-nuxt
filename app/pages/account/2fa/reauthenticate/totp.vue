<script lang="ts" setup>
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

if (authEvent.value !== AuthChangeEvent.REAUTHENTICATION_REQUIRED) {
  await navigateTo(localePath('index'))
}

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <Account2FaReauthenticateCode>
    <p>{{ $i18n.t('reauthenticate.totp') }}:</p>
  </Account2FaReauthenticateCode>
</template>
