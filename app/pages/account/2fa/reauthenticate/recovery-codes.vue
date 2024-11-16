<script lang="ts" setup>
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()

if (authEvent.value !== AuthChangeEvent.REAUTHENTICATION_REQUIRED) {
  await navigateTo(localePath('index'))
}

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <Account2FaReauthenticateCode>
    <p>{{ $t('reauthenticate.recovery_code') }}:</p>
  </Account2FaReauthenticateCode>
</template>
