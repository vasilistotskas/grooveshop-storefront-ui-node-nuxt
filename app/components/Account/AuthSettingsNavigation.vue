<script lang="ts" setup>
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()
const authStore = useAuthStore()
const { totpAuthenticator, webauthnAuthenticator, recoveryCodesAuthenticator } = storeToRefs(authStore)

const items = computed(() => {
  const items = [
    {
      label: $i18n.t('social_accounts'),
      icon: 'i-heroicons-user-group',
      to: localePath('account-providers'),
    },
    {
      label: $i18n.t('sessions'),
      icon: 'i-heroicons-signal',
      to: localePath('account-sessions'),
    },
    {
      label: $i18n.t('password.change'),
      icon: 'i-heroicons-lock-closed',
      to: localePath('account-password-change'),
    },
    !totpAuthenticator.value
      ? {
          label: $i18n.t('two_factor.activate'),
          icon: 'i-heroicons-lock-open',
          to: localePath('account-2fa-totp-activate'),
        }
      : {
          label: $i18n.t('two_factor.deactivate'),
          icon: 'i-heroicons-chart-bar',
          to: localePath('account-2fa-totp-deactivate'),
        },
  ]

  if (webauthnAuthenticator.value) {
    items.push({
      label: $i18n.t('two_factor.recovery_codes.title'),
      icon: 'i-heroicons-key',
      to: localePath('account-2fa-recovery-codes'),
    }, {
      label: $i18n.t('two_factor.recovery_codes.generate'),
      icon: 'i-heroicons-key',
      to: localePath('account-2fa-recovery-codes-generate'),
    })
  }

  if (recoveryCodesAuthenticator.value) {
    items.push({
      label: $i18n.t('two_factor.webauthn.title'),
      icon: 'i-heroicons-key',
      to: localePath('account-2fa-webauthn'),
    })
  }
  else {
    items.push({
      label: $i18n.t('two_factor.webauthn.add'),
      icon: 'i-heroicons-key',
      to: localePath('account-2fa-webauthn-add'),
    })
  }

  return items
})
</script>

<template>
  <UNavigationMenu
    orientation="vertical"
    color="neutral"
    :items="items"
  />
</template>
