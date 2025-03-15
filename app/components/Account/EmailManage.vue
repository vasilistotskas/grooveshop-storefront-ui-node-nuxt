<script lang="ts" setup>
import * as z from 'zod'

import type { DropdownItem } from '#ui/types'

const emit = defineEmits(['addEmailAddress', 'requestEmailVerification', 'removeEmailAddress', 'changePrimaryEmailAddress'])

const {
  getEmailAddresses,
  addEmailAddress,
  requestEmailVerification,
  removeEmailAddress,
  changePrimaryEmailAddress,
} = useAllAuthAccount()
const toast = useToast()
const { t } = useI18n()
const { $i18n } = useNuxtApp()

const loading = ref(false)

const { data: emailAddresses, refresh: refreshEmailAddresses } = await useAsyncData<EmailGetResponse>(
  'emailAddresses',
  () => getEmailAddresses(),
)

async function addEmail(values: EmailPostBody) {
  try {
    loading.value = true
    await addEmailAddress(values)
    await refreshEmailAddresses()
    toast.add({
      title: t('email.added'),
      color: 'green',
    })
    emit('addEmailAddress')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}

async function emailVerificationRequest(values: EmailPutBody) {
  try {
    loading.value = true
    await requestEmailVerification(values)
    toast.add({
      title: 'ee',
      color: 'green',
    })
    emit('requestEmailVerification')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}

async function removeEmail(values: EmailDeleteBody) {
  try {
    loading.value = true
    await removeEmailAddress(values)
    await refreshEmailAddresses()
    toast.add({
      title: t('email.removed'),
      color: 'green',
    })
    emit('removeEmailAddress')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}

async function markAsPrimaryEmail(values: EmailPatchBody) {
  try {
    loading.value = true
    await changePrimaryEmailAddress(values)
    await refreshEmailAddresses()
    toast.add({
      title: t('email.marked_as_primary'),
      color: 'green',
    })
    emit('changePrimaryEmailAddress')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}

const columns = [{
  key: 'email',
  label: t('email.title'),
}, {
  key: 'verified',
  label: t('verified'),
}, {
  key: 'primary',
  label: t('primary'),
}, {
  key: 'actions',
}]

const rows = computed(() => {
  return emailAddresses.value?.data.map((email) => {
    return {
      email: email.email,
      verified: email.verified,
      primary: email.primary,
    }
  })
})

const actionItems = (row: { email: string, verified: boolean, primary: boolean }) => {
  const items: DropdownItem[] = []
  if (!row.primary) {
    items.push({
      label: t('email.mark_as_primary'),
      icon: 'i-heroicons-star-20-solid',
      click: () => markAsPrimaryEmail({ email: row.email, primary: true }),
    })
    items.push({
      label: t('email.remove'),
      icon: 'i-heroicons-trash-20-solid',
      click: () => removeEmail({ email: row.email }),
    })
  }
  if (!row.verified) {
    items.push({
      label: t('email.request_verification'),
      icon: 'i-heroicons-mail-20-solid',
      click: () => emailVerificationRequest({ email: row.email }),
    })
  }

  if (items.length === 0) {
    return []
  }
  return [items]
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t('email.title'),
      name: 'email',
      as: 'input',
      rules: z.string({ required_error: $i18n.t('validation.required') }).email($i18n.t('validation.email.valid')),
      autocomplete: 'email',
      readonly: false,
      required: true,
      placeholder: t('email.title'),
      type: 'email',
    },
  ],
}
</script>

<template>
  <div
    class="
      grid gap-4

      md:gap-12
    "
  >
    <UTable :columns="columns" :rows="rows">
      <template #actions-data="{ row }">
        <LazyUDropdown v-if="actionItems(row).length > 0" :items="actionItems(row)">
          <UButton color="gray" icon="i-heroicons-ellipsis-horizontal-20-solid" variant="ghost" />
        </LazyUDropdown>
      </template>

      <template #verified-data="{ row }">
        <UIcon
          :class="row.verified ? `
            text-green-500

            dark:text-green-400
          ` : `
            text-red-500

            dark:text-red-400
          `"
          :name="row.verified ? 'i-heroicons-check-20-solid' : 'i-heroicons-x-mark'"
          class="size-6"
        />
      </template>
      <template #primary-data="{ row }">
        <UIcon
          :class="row.primary ? `
            text-green-500

            dark:text-green-400
          ` : `
            text-red-500

            dark:text-red-400
          `"
          :name="row.primary ? 'i-heroicons-check-20-solid' : 'i-heroicons-x-mark'"
          class="size-6"
        />
      </template>
    </UTable>

    <div class="grid">
      <h2
        class="
          text-primary-950 text-center

          dark:text-primary-50
        "
      >
        {{ $i18n.t('email.add') }}
      </h2>
      <div
        class="
          container-2xs p-0

          md:px-6
        "
      >
        <section class="grid items-center">
          <DynamicForm
            :button-label="$i18n.t('submit')"
            :loading="loading"
            :reset-on-submit="true"
            :schema="formSchema"
            @submit="addEmail"
          />
        </section>
      </div>
    </div>
  </div>
</template>
