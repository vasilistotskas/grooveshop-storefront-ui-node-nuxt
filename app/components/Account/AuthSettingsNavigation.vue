<script lang="ts" setup>
const localePath = useLocalePath()
const { t } = useI18n({ useScope: 'local' })
const authStore = useAuthStore()
const { totpAuthenticator, webauthnAuthenticator, recoveryCodesAuthenticator } = storeToRefs(authStore)

const links = computed(() => {
  const links = [
    {
      label: t('social_accounts'),
      icon: 'i-heroicons-user-group',
      to: localePath('/account/providers'),
    },
    {
      label: t('sessions'),
      icon: 'i-heroicons-signal',
      to: localePath('/account/sessions'),
    },
    {
      label: t('password.change'),
      icon: 'i-heroicons-lock-closed',
      to: localePath('/account/password/change'),
    },
    !totpAuthenticator.value
      ? {
          label: t('two_factor.activate'),
          icon: 'i-heroicons-lock-open',
          to: localePath('/account/2fa/totp/activate'),
        }
      : {
          label: t('two_factor.deactivate'),
          icon: 'i-heroicons-chart-bar',
          to: localePath('/account/2fa/totp/deactivate'),
        },
  ]

  if (webauthnAuthenticator.value) {
    links.push({
      label: t('two_factor.recovery_codes.title'),
      icon: 'i-heroicons-key',
      to: localePath('/account/2fa/recovery-codes'),
    }, {
      label: t('two_factor.recovery_codes.generate'),
      icon: 'i-heroicons-key',
      to: localePath('/account/2fa/recovery-codes/generate'),
    })
  }

  if (recoveryCodesAuthenticator.value) {
    links.push({
      label: t('two_factor.webauthn.title'),
      icon: 'i-heroicons-key',
      to: localePath('/account/2fa/webauthn'),
    })
  }
  else {
    links.push({
      label: t('two_factor.webauthn.add'),
      icon: 'i-heroicons-key',
      to: localePath('/account/2fa/webauthn/add'),
    })
  }

  return links
})
</script>

<template>
  <UVerticalNavigation
    :links="links"
    :ui="{
      base: 'text-primary-950 dark:text-primary-50',
      inactive: 'text-primary-400 dark:text-primary-400',
      size: 'text-lg md:text-xl',
      icon: {
        base: 'text-primary-950 dark:text-primary-50',
        inactive: 'text-primary-400 dark:text-primary-400',
      },
    }"
  />
</template>
