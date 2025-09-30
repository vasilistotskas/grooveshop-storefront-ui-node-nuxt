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
  <Account2FaReauthenticateCode />
</template>

<i18n lang="yaml">
el:
  reauthenticate:
    recovery_code: Εισήγαγε έναν κωδικό ανάκτησης
</i18n>
