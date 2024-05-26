<script lang="ts" setup>
import { type AllAuthResponse, type AllAuthResponseError, URLs } from '~/types/all-auth'
import { authInfo } from '~/utils/auth'

const route = useRoute()
const error = route.query.error
const toast = useToast()

const auth = useState<AllAuthResponse | AllAuthResponseError>('authState')
const authStatus = authInfo(auth.value)

const url = ref<string>(URLs.LOGIN_URL)
if (authStatus.isAuthenticated) {
  url.value = URLs.LOGIN_REDIRECT_URL
  console.log('You are already logged in')
  toast.add({
    title: 'You are already logged in',
    color: 'green',
  })
}
else {
  url.value = pathForPendingFlow(auth.value) || url.value
  console.log('You are not logged in', auth.value)
  toast.add({
    title: 'You are not logged in',
    color: 'green',
  })
}

if (!error) {
  console.log('No error')
  toast.add({
    title: 'No error',
    color: 'green',
  })
  // await navigateTo(url.value)
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
      :text="$t('pages.account.provider.callback.title')" class="
        text-center capitalize
      "
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
      class="justify-center"
      color="opposite"
      size="xl"
      type="button"
      variant="link"
    />
  </PageWrapper>
</template>
