<script lang="ts" setup>
import { z } from 'zod'

import type { DynamicFormSchema } from '~/types/form'
import type { EmailDeleteBody, EmailPatchBody, EmailPostBody, EmailPutBody } from '~/types/all-auth'
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

const loading = ref(false)

const { data: emailAddresses, refresh: refreshEmailAddresses } = await useAsyncData(
  'emailAddresses',
  () => getEmailAddresses(),
)

async function addEmail(values: EmailPostBody) {
  try {
    loading.value = true
    await addEmailAddress(values)
    await refreshEmailAddresses()
    toast.add({
      title: t('common.email.added'),
      color: 'green',
    })
    emit('addEmailAddress')
  }
  catch (error) {
    if (isAllAuthClientError(error)) {
      const errors = 'errors' in error.data.data ? error.data.data.errors : []
      errors.forEach((error) => {
        toast.add({
          title: error.message,
          color: 'red',
        })
      })
    }
    else {
      toast.add({
        title: t('common.error.default'),
        color: 'red',
      })
    }
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
    if (isAllAuthClientError(error)) {
      if (error.data.data.status === 403) {
        toast.add({
          title: t('common.email.verification.too_many_requests'),
          color: 'red',
        })
      }
      return
    }
    toast.add({
      title: t('common.error.default'),
      color: 'red',
    })
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
      title: t('common.email.removed'),
      color: 'green',
    })
    emit('removeEmailAddress')
  }
  catch {
    toast.add({
      title: t('common.error.default'),
      color: 'red',
    })
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
      title: t('common.email.marked_as_primary'),
      color: 'green',
    })
    emit('changePrimaryEmailAddress')
  }
  catch (error) {
    if (isAllAuthClientError(error)) {
      if (error.data.data.status === 403) {
        toast.add({
          title: t('common.email.verification.too_many_requests'),
          color: 'red',
        })
      }
      return
    }
    toast.add({
      title: t('common.error.default'),
      color: 'red',
    })
  }
  finally {
    loading.value = false
  }
}

const columns = [{
  key: 'email',
  label: t('common.email.title'),
}, {
  key: 'verified',
  label: t('common.verified'),
}, {
  key: 'primary',
  label: t('common.primary'),
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
      label: t('common.email.mark_as_primary'),
      icon: 'i-heroicons-star-20-solid',
      click: () => markAsPrimaryEmail({ email: row.email, primary: true }),
    })
    items.push({
      label: t('common.email.remove'),
      icon: 'i-heroicons-trash-20-solid',
      click: () => removeEmail({ email: row.email }),
    })
  }
  if (!row.verified) {
    items.push({
      label: t('common.email.request_verification'),
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
      label: t('common.email.title'),
      name: 'email',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }).email(t('common.validation.email.valid')),
      autocomplete: 'email',
      readonly: false,
      required: true,
      placeholder: t('common.email.title'),
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
        <UDropdown v-if="actionItems(row).length > 0" :items="actionItems(row)">
          <UButton color="gray" icon="i-heroicons-ellipsis-horizontal-20-solid" variant="ghost" />
        </UDropdown>
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
          class="h-6 w-6"
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
          class="h-6 w-6"
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
        {{ $t('common.email.add') }}
      </h2>
      <div
        class="
          container-2xs p-0

          md:px-6
        "
      >
        <section class="grid items-center">
          <DynamicForm
            :button-label="t('common.submit')"
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
