<script lang="ts" setup>
const emit = defineEmits(['generateRecoveryCodes'])

const { getRecoveryCodes, generateRecoveryCodes } = useAllAuthAccount()
const { t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()
const { $i18n } = useNuxtApp()

const { data, refresh, error } = await useAsyncData(
  'recoveryCodes',
  () => getRecoveryCodes(),
)

if (error.value) {
  toast.add({
    title: t('auth.mfa.required'),
    color: 'error',
  })
  navigateTo(localePath('account-settings'))
}

const hasCodes = computed(() => {
  if (!data.value?.data?.unused_code_count) {
    return false
  }
  return data.value?.data?.unused_code_count > 0
})

const loading = ref(false)

async function onSubmit() {
  try {
    loading.value = true
    await generateRecoveryCodes()
    toast.add({
      title: t('codes.generated'),
      color: 'success',
    })
    emit('generateRecoveryCodes')
    await navigateTo(localePath('account-2fa-recovery-codes'))
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}

onReactivated(async () => {
  await refresh()
})
</script>

<template>
  <div
    class="
      grid gap-4
      lg:flex
    "
  >
    <slot />
    <section class="flex w-full flex-col items-center gap-4">
      <p
        class="
          text-primary-950
          dark:text-primary-50
        "
      >
        {{ t('description') }}
        {{ hasCodes ? t('invalidate') : '' }}
        {{ t('confirm') }}
      </p>

      <UButton
        :label="
          $i18n.t('generate')
        "
        color="neutral"
        size="xl"
        @click="onSubmit"
      />
    </section>
  </div>
</template>

<i18n lang="yaml">
el:
  description: Είσαι έτοιμος να δημιουργήσεις ένα νέο σύνολο κωδικών ανάκτησης
    για το λογαριασμό σας.
  invalidate: Αυτή η ενέργεια θα ακυρώσει τους υπάρχοντες κωδικούς σας.
  confirm: Είσαι σίγουρος;
</i18n>
