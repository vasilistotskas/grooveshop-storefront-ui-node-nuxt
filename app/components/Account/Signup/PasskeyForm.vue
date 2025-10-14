<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

const emit = defineEmits(['signUpByPasskey'])

const { signUpByPasskey } = useAllAuthAuthentication()
const { t } = useI18n()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()
const toast = useToast()

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

async function onSubmit(event: FormSubmitEvent<Schema>): Promise<void> {
  try {
    loading.value = true
    hasError.value = false

    await signUpByPasskey(event.data)

    toast.add({
      title: t('success.title'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })

    emit('signUpByPasskey')
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
  <div class="space-y-6">
    <UAuthForm
      :schema="schema"
      :fields="fields"
      :loading="loading"
      :submit="{
        label: $i18n.t('submit'),
        icon: 'i-heroicons-finger-print',
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
        <div class="space-y-3">
          <USeparator :label="t('or')" />

          <div class="flex flex-col items-center gap-2 text-sm">
            <div class="text-muted">
              {{ t('already_have_account') }}
              <ULink
                :to="localePath('account-login')"
                class="
                  font-medium text-primary
                  hover:underline
                "
              >
                {{ t('login_here') }}
              </ULink>
            </div>

            <div class="text-muted">
              {{ t('prefer_password') }}
              <ULink
                :to="localePath('account-signup')"
                class="
                  font-medium text-primary
                  hover:underline
                "
              >
                {{ t('using_password') }}
              </ULink>
            </div>
          </div>
        </div>
      </template>
    </UAuthForm>
  </div>
</template>

<i18n lang="yaml">
el:
  email:
    title: Email
  success:
    title: Επιτυχία
    description: Το κλειδί πρόσβασης δημιουργήθηκε επιτυχώς.
  error:
    title: Σφάλμα εγγραφής
    description: Δεν ήταν δυνατή η εγγραφή με κλειδί πρόσβασης.
  or: ή
  already_have_account: Έχεις ήδη λογαριασμό;
  login_here: Συνδέσου εδώ
  prefer_password: Προτιμάς κωδικό πρόσβασης;
  using_password: Εγγραφή με κωδικό
</i18n>
