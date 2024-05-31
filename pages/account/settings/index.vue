<script lang="ts" setup>
import type { HorizontalNavigationLink } from '#ui/types'
import { AuthenticatorType } from '~/types/all-auth'

const localePath = useLocalePath()
const { t } = useI18n()
const { getAuthenticators } = useAllAuthAccount()

const { data } = await getAuthenticators()

const totp = computed(() => {
  return data.value?.data.find(authenticator => authenticator.type === AuthenticatorType.TOTP)
})

const recoveryCodes = computed(() => {
  return data.value?.data.find(authenticator => authenticator.type === AuthenticatorType.RECOVERY_CODES)
})

const links = shallowRef<HorizontalNavigationLink[]>([
  {
    label: t('common.two_factor.authentication'),
    icon: 'i-heroicons-lock-closed',
    to: localePath('/account/2fa'),
  },
  {
    label: t('common.social_accounts'),
    icon: 'i-heroicons-user-group',
    to: localePath('/account/providers'),
  },
  {
    label: t('common.sessions'),
    icon: 'i-heroicons-signal',
    to: localePath('/account/sessions'),
  },
  {
    label: t('common.password.change'),
    icon: 'i-heroicons-lock-closed',
    to: localePath('/account/password/change'),
  },
])

if (!totp.value) {
  links.value.push(
    {
      label: t('common.two_factor.activate'),
      icon: 'i-heroicons-lock-open',
      to: localePath('/account/2fa/totp/activate'),
    },
  )
}
else {
  links.value.push(
    {
      label: t('common.two_factor.deactivate'),
      icon: 'i-heroicons-chart-bar',
      to: localePath('/account/2fa/totp/deactivate'),
    },
  )
}

if (recoveryCodes.value) {
  links.value.push(
    {
      label: t('common.two_factor.recovery_codes.title'),
      icon: 'i-heroicons-key',
      to: localePath('/account/2fa/recovery-codes'),
    },
    {
      label: t('common.two_factor.recovery_codes.generate'),
      icon: 'i-heroicons-key',
      to: localePath('/account/2fa/recovery-codes/generate'),
    },
  )
}

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
    <PageTitle :text="$t('pages.account.settings.title')" />
    <PageBody>
      <AccountSettingsForm>
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
      </AccountSettingsForm>
    </PageBody>
  </PageWrapper>
</template>
