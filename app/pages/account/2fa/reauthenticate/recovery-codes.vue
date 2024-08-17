<script lang="ts" setup>
import { AuthChangeEvent, type AuthChangeEventType } from '~/types/all-auth'

const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()

if (authEvent.value !== AuthChangeEvent.REAUTHENTICATION_REQUIRED) {
  await navigateTo(localePath('/'))
}

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <Account2FaReauthenticateCode>
    <p>{{ $t('common.reauthenticate.recovery_code') }}:</p>
  </Account2FaReauthenticateCode>
</template>
