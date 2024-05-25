<script lang="ts" setup>
import { type AllAuthResponse, type AllAuthResponseError, URLs } from '~/types/all-auth'
import { authInfo } from '~/utils/auth'

const route = useRoute()
const error = route.params.error

const auth = useState<AllAuthResponse | AllAuthResponseError>('authState')
const authStatus = authInfo(auth.value)

const url = ref<string>(URLs.LOGIN_URL)
if (authStatus.isAuthenticated) {
  url.value = URLs.LOGIN_REDIRECT_URL
}
else {
  url.value = pathForPendingFlow(auth.value) || url.value
}

if (!error) {
  await navigateTo(url.value)
}

definePageMeta({
  layout: 'auth',
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
      :text="$t('pages.account.provider.callback.title')" class="text-center"
    />
    <p
      class="
        text-primary-950 text-center

        dark:text-primary-50
      "
    >
      {{ $t('pages.account.provider.callback.description') }}
    </p>
    <UButton
      :label="$t('common.continue')"
      :to="url"
      color="opposite"
      size="md"
      type="button"
      variant="link"
    />
  </PageWrapper>
</template>
