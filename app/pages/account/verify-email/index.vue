<script lang="ts" setup>
import * as z from 'zod'

const emit = defineEmits(['emailVerify'])

const { emailVerify } = useAllAuthAuthentication()

const { t } = useI18n({ useScope: 'local' })
const toast = useToast()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const loading = ref(false)

async function onSubmit(values: EmailVerifyPostBody) {
  try {
    loading.value = true
    const data = await emailVerify(values)
    if (data && [200, 401].includes(data.status)) {
      toast.add({
        title: t('auth.email.verified'),
        color: 'green',
      })
      emit('emailVerify')
      await navigateTo(localePath('account'))
    }
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t('key'),
      name: 'key',
      as: 'input',
      rules: z.string({ required_error: $i18n.t('validation.required') }),
      autocomplete: 'one-time-code',
      readonly: false,
      required: true,
      placeholder: '123456',
      type: 'text',
    },
  ],
}

definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
</script>

<template>
  <PageWrapper
    class="
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')" class="text-center capitalize"
    />
    <p
      class="
        text-primary-950 text-center

        dark:text-primary-50
      "
    >
      {{ t('description') }}
    </p>
    <div class="grid items-center justify-center">
      <DynamicForm
        :button-label="t('entry')"
        :schema="formSchema"
        class="grid"
        @submit="onSubmit"
      />
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επιβεβαίωση Email
  description: Θα πρέπει να επιβεβαιώσεις το email σου πριν συνεχίσεις.
  key: Κωδικός
</i18n>
