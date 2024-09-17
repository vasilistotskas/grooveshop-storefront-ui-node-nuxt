<script lang="ts" setup>
const emit = defineEmits(['generateRecoveryCodes'])

const { getRecoveryCodes, generateRecoveryCodes } = useAllAuthAccount()
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()
const toast = useToast()

const { data, refresh } = await useAsyncData(
  'recoveryCodes',
  () => getRecoveryCodes(),
)

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
      color: 'green',
    })
    emit('generateRecoveryCodes')
    await navigateTo(localePath('/account/2fa/recovery-codes'))
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
      container-2xs p-0

      md:px-6
    "
  >
    <section class="grid items-center justify-center justify-items-center gap-4">
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
          $t('generate')
        "
        color="primary"
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
