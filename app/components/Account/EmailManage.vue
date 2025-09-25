<script lang="ts" setup>
import * as z from 'zod'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

const emit = defineEmits([
  'addEmailAddress',
  'requestEmailVerification',
  'removeEmailAddress',
  'changePrimaryEmailAddress',
])

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
      title: t('email.added'),
      color: 'success',
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
      title: t('email.verification_requested'),
      color: 'success',
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
      color: 'success',
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
      color: 'success',
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

const columns: TableColumn<EmailAddress>[] = [
  {
    accessorKey: 'email',
    header: $i18n.t('email.title'),
  },
  {
    accessorKey: 'verified',
    header: t('verified'),
  },
  {
    accessorKey: 'primary',
    header: t('primary'),
  },
  {
    id: 'actions',
    header: '',
  },
]

const data = computed(() => {
  return emailAddresses.value?.data.map(email => ({
    email: email.email,
    verified: email.verified,
    primary: email.primary,
  })) || []
})

const actionItems = (row: { email: string, verified: boolean, primary: boolean }): DropdownMenuItem[][] => {
  const items: DropdownMenuItem[] = []
  if (!row.primary) {
    items.push({
      label: t('email.mark_as_primary'),
      icon: 'i-heroicons-star-20-solid',
      onSelect: () => markAsPrimaryEmail({ email: row.email, primary: true }),
    })
    items.push({
      label: t('email.remove'),
      icon: 'i-heroicons-trash-20-solid',
      onSelect: () => removeEmail({ email: row.email }),
    })
  }
  if (!row.verified) {
    items.push({
      label: t('email.request_verification'),
      icon: 'i-heroicons-mail-20-solid',
      onSelect: () => emailVerificationRequest({ email: row.email }),
    })
  }
  return items.length ? [items] : []
}

const formSchema = computed<DynamicFormSchema>(() => ({
  fields: [
    {
      label: $i18n.t('email.title'),
      name: 'email',
      as: 'input',
      rules: z.email({
        error: issue => issue.input === undefined
          ? $i18n.t('validation.required')
          : $i18n.t('validation.email.valid'),
      }),
      autocomplete: 'email',
      readonly: false,
      required: true,
      placeholder: $i18n.t('email.title'),
      condition: () => true,
      disabledCondition: () => false,
      type: 'email',
    },
  ],
}))
</script>

<template>
  <div
    class="
      grid gap-4
      md:gap-12
    "
  >
    <UTable
      :columns="columns"
      :data="data"
    >
      <template #actions-cell="{ row }">
        <LazyUDropdownMenu
          v-if="actionItems(row.original).length > 0"
          :items="actionItems(row.original)"
        >
          <UButton
            color="neutral"
            icon="i-heroicons-ellipsis-horizontal-20-solid"
            variant="ghost"
          />
        </LazyUDropdownMenu>
      </template>
      <template #verified-cell="{ row }">
        <UIcon
          :class="row.original.verified ? `
            text-green-500
            dark:text-green-400
          ` : `
            text-red-500
            dark:text-red-400
          `"
          :name="row.original.verified ? 'i-heroicons-check-20-solid' : 'i-heroicons-x-mark'"
          class="size-6"
        />
      </template>
      <template #primary-cell="{ row }">
        <UIcon
          :class="row.original.primary ? `
            text-green-500
            dark:text-green-400
          ` : `
            text-red-500
            dark:text-red-400
          `"
          :name="row.original.primary ? 'i-heroicons-check-20-solid' : 'i-heroicons-x-mark'"
          class="size-6"
        />
      </template>
    </UTable>

    <div class="grid">
      <h2
        class="
          text-center text-primary-950
          dark:text-primary-50
        "
      >
        {{ $i18n.t('email.add') }}
      </h2>
      <div
        class="
          container mx-auto p-0
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
