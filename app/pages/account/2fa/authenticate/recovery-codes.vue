<script lang="ts" setup>
import { AuthChangeEvent, type AuthChangeEventType, AuthenticatorType } from '~/types/all-auth'

const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()

watchEffect(async () => {
  if (authEvent.value !== AuthChangeEvent.FLOW_UPDATED) {
    await navigateTo(localePath('/'))
  }
})

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
      :text="$t('common.authenticate.recovery_code')"
      class="text-center capitalize"
    />
    <PageBody>
      <Account2FaAuthenticateCode :authenticator-type="AuthenticatorType.RECOVERY_CODES" />
    </PageBody>
  </PageWrapper>
</template>
