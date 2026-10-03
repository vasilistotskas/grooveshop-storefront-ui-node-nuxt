<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const emit = defineEmits(['passwordReset'])

const { getPasswordReset, passwordReset } = useAllAuthAuthentication()
const { t } = useI18n()
const route = useRoute()
const toast = useToast()
const localePath = useLocalePath()
const router = useRouter()

const key = 'key' in route.params ? route.params.key : undefined

if (!key) {
  navigateTo(localePath('account-password-reset'))
}

await useAsyncData('passwordReset', () => getPasswordReset(String(key)))

const hasError = ref(false)
const isSubmitting = ref(false)

const newPassword1 = ref('')
const newPassword2 = ref('')

const schema = z.object({
  // Mirrors Django's AUTH_PASSWORD_VALIDATORS where a pure function
  // can: MinimumLength (8) and NumericPassword. CommonPassword and
  // UserAttributeSimilarity stay server-side and surface via the
  // translated allauth error codes. The strength meter is advisory
  // only — Django has no character-class rules, so it must not gate.
  newPassword1: z.string()
    .min(8, t('validation.min', { min: 8 }))
    .max(255)
    .refine(value => !/^\d+$/.test(value), {
      error: t('validation.password.entirely_numeric'),
    }),
  newPassword2: z.string()
    .min(8, t('validation.min', { min: 8 }))
    .max(255),
  key: z.string(),
}).refine(data => data.newPassword1 === data.newPassword2, {
  message: t('errors.match'),
  path: ['newPassword2'],
})

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>): Promise<void> {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    hasError.value = false
    await passwordReset({
      password: event.data.newPassword1,
      key: event.data.key,
    })
    toast.add({
      title: t('password.reset.success'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-lucide-circle-check',
    })
    emit('passwordReset')
    await router.push(localePath('account-login'))
  }
  catch (error) {
    if (isAllAuthClientError(error)) {
      // allauth answers a reset that went through without signing the
      // shopper in with a 401: the password changed, sign in with it.
      if (error.data.data.status === 401) {
        toast.add({
          title: t('password.reset.success'),
          color: 'success',
        })
        await navigateTo(localePath('account-login'))
        return
      }
      const errors = 'errors' in error.data.data ? error.data.data.errors : []
      errors.forEach((error) => {
        toast.add({
          title: error.message,
          color: 'error',
        })
      })
      return
    }
    hasError.value = true
    toast.add({
      title: t('error.default'),
      color: 'error',
    })
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="{ newPassword1, newPassword2, key: String(key) }"
    class="flex flex-col gap-4"
    @error="scrollToFirstFormError"
    @submit="onSubmit"
  >
    <UAlert
      v-if="hasError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('error.title')"
      :description="t('error.description')"
      close
      @update:open="hasError = false"
    />

    <UFormField
      name="newPassword1"
      :label="t('new_password')"
      required
    >
      <FormPasswordInput
        v-model="newPassword1"
        autocomplete="new-password"
      />
      <FormPasswordStrengthMeter :password="newPassword1" />
    </UFormField>

    <UFormField
      name="newPassword2"
      :label="t('repeat_password')"
      required
    >
      <FormPasswordInput
        v-model="newPassword2"
        autocomplete="new-password"
      />
    </UFormField>

    <UButton
      :label="t('submit')"
      :loading="isSubmitting"
      size="lg"
      block
      type="submit"
    />
  </UForm>
</template>

<i18n lang="yaml">
el:
  new_password: Νέος κωδικός
  repeat_password: Επανάληψη κωδικού
  submit: Αποθήκευση κωδικού
  errors:
    match: Οι δύο κωδικοί πρέπει να είναι ίδιοι
  success:
    description: Συνδέσου με τον νέο σου κωδικό.
  error:
    title: Ο κωδικός δεν άλλαξε
    description: Ο σύνδεσμος μπορεί να έχει λήξει. Ζήτα έναν νέο.
en:
  new_password: New password
  repeat_password: Repeat password
  submit: Save password
  errors:
    match: The two passwords have to match
  success:
    description: Sign in with your new password.
  error:
    title: The password was not changed
    description: The link may have expired. Ask for a new one.
</i18n>
