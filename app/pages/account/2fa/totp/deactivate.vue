<script lang="ts" setup>
const emit = defineEmits(['deactivateTotp'])

const { deactivateTotp, totpAuthenticatorStatus } = useAllAuthAccount()
const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()

const loading = ref(false)

const { error, refresh } = await useAsyncData(
  'totpAuthenticatorStatus',
  () => totpAuthenticatorStatus(),
)

watchEffect(async () => {
  if (error.value) {
    await navigateTo(localePath('/account/settings'))
  }
})

async function onSubmit() {
  try {
    loading.value = true
    await deactivateTotp()
    toast.add({
      title: t('common.success.title'),
      color: 'green',
    })
    emit('deactivateTotp')
    await navigateTo(localePath('/account/settings'))
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}

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
      container-3xs flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="$t('pages.account.2fa.totp.deactivate.title')"
      class="text-center capitalize"
    />
    <p
      class="
        text-primary-950 text-center

        dark:text-primary-50
      "
    >
      {{ $t('pages.account.2fa.totp.deactivate.description') }}
    </p>
    <PageBody>
      <div
        class="grid items-center justify-center justify-items-center"
      >
        <UButton
          :label="$t('common.deactivate')"
          color="red"
          size="lg"
          @click="onSubmit"
        />
      </div>
    </PageBody>
  </PageWrapper>
</template>
