<script lang="ts" setup>
import { AuthenticatorType } from '~/types/all-auth'

const localePath = useLocalePath()
const { t } = useI18n({ useScope: 'local' })
const { getAuthenticators } = useAllAuthAccount()

const { data, refresh } = await useLazyAsyncData(
  'authenticators',
  () => getAuthenticators(),
)

const totp = computed(() => {
  return data.value?.data.find(authenticator => authenticator.type === AuthenticatorType.TOTP)
})

const webauthn = computed(() => {
  return data.value?.data.find(authenticator => authenticator.type === AuthenticatorType.WEBAUTHN)
})

const recoveryCodes = computed(() => {
  return data.value?.data.find(authenticator => authenticator.type === AuthenticatorType.RECOVERY_CODES)
})

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
    !totp.value
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

  if (recoveryCodes.value) {
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

  if (webauthn.value) {
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

onReactivated(async () => {
  await refresh()
})

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle :text="t('title')" />
    <PageBody>
      <AccountSettingsForm>
        <UVerticalNavigation
          :links="links"
          :ui="{
            base: 'text-primary-950 dark:text-primary-50 pl-0',
            inactive: 'text-primary-400 dark:text-primary-400',
            size: 'text-lg md:text-xl',
            icon: {
              base: 'text-primary-950 dark:text-primary-50',
              inactive: 'text-primary-400 dark:text-primary-400',
            },
          }"
        />
      </AccountSettingsForm>
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Ρυθμίσεις
</i18n>
