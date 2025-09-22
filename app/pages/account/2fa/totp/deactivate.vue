<script lang="ts" setup>
const emit = defineEmits(['deactivateTotp'])

const { deactivateTotp, totpAuthenticatorStatus } = useAllAuthAccount()
const { t } = useI18n()
const toast = useToast()
const { $i18n } = useNuxtApp()
const localePath = useLocalePath()

const loading = ref(false)

const { error, refresh } = await useAsyncData(
  'totpAuthenticatorStatus',
  () => totpAuthenticatorStatus(),
)

watchEffect(async () => {
  if (error.value) {
    await navigateTo(localePath('account-settings'))
  }
})

async function onSubmit() {
  try {
    loading.value = true
    await deactivateTotp()
    toast.add({
      title: $i18n.t('success.title'),
      color: 'success',
    })
    emit('deactivateTotp')
    await navigateTo(localePath('account-settings'))
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
      flex flex-col gap-4
      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')"
      class="text-center capitalize"
    />
    <p
      class="
        text-center text-primary-950
        dark:text-primary-50
      "
    >
      {{ t('description') }}
    </p>

    <div
      class="grid items-center justify-center justify-items-center"
    >
      <UButton
        :label="$i18n.t('deactivate')"
        color="error"
        size="lg"
        @click="onSubmit"
      />
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Απενεργοποίηση εφαρμογής ελέγχου ταυτότητας (TOTP)
  description: Είσαι σίγουρος ότι θέλεις να απενεργοποιήσεις την εφαρμογή
    ελέγχου ταυτότητας;
</i18n>
