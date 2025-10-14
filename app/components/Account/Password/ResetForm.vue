<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

const emit = defineEmits(['passwordRequest'])

const { passwordRequest } = useAllAuthAuthentication()
const toast = useToast()
const { $i18n } = useNuxtApp()
const localePath = useLocalePath()
const { t } = useI18n()

const loading = ref(false)
const hasError = ref(false)

const schema = z.object({
  email: z.email({
    error: issue => issue.input === undefined
      ? $i18n.t('validation.required')
      : $i18n.t('validation.email.valid'),
  }),
})

type Schema = z.output<typeof schema>

const fields: AuthFormField[] = [
  {
    name: 'email',
    type: 'email',
    label: t('email.title'),
    placeholder: 'example@email.com',
    required: true,
  },
]

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    loading.value = true
    hasError.value = false

    await passwordRequest({
      email: event.data.email,
    })

    toast.add({
      title: $i18n.t('password.reset.request.success'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })

    emit('passwordRequest')
  }
  catch (error) {
    hasError.value = true
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <UAuthForm
      :schema="schema"
      :fields="fields"
      :loading="loading"
      :submit="{
        label: t('reset'),
        icon: 'i-heroicons-paper-airplane',
        block: true,
        size: 'lg',
        color: 'neutral',
        variant: 'subtle',
      }"
      @submit="onSubmit"
    >
      <template #validation>
        <UAlert
          v-if="hasError"
          color="error"
          variant="soft"
          icon="i-heroicons-exclamation-circle"
          :title="t('error.title')"
          :description="t('error.description')"
        />
      </template>

      <template #footer>
        <div class="text-center text-sm text-muted">
          {{ t('footer.text') }}
          <ULink
            :to="localePath('account-login')"
            class="
              font-medium text-primary
              hover:underline
            "
          >
            {{ t('footer.link') }}
          </ULink>
        </div>
      </template>
    </UAuthForm>
  </div>
</template>

<i18n lang="yaml">
el:
  email:
    title: Email
  reset: Αποστολή συνδέσμου
  success:
    description: Ελέγξτε το email σας για οδηγίες επαναφοράς.
  error:
    title: Σφάλμα αποστολής
    description: Δεν ήταν δυνατή η αποστολή του συνδέσμου. Παρακαλώ δοκιμάστε ξανά.
  footer:
    text: Θυμήθηκες τον κωδικό σου;
    link: Σύνδεση
</i18n>
