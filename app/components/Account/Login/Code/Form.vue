<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const emit = defineEmits(['requestLoginCode'])

const { t } = useI18n()
const localePath = useLocalePath()
const { requestLoginCode } = useAllAuthAuthentication()
const toast = useToast()

// Race-free reference for tryAdvanceToPendingFlow (see app/utils/auth.ts).
const formPath = useRoute().path

const loading = ref(false)
const hasError = ref(false)

const schema = z.object({
  email: z.email({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.email.valid'),
  }),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ email: undefined })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    loading.value = true
    hasError.value = false
    await requestLoginCode(event.data)

    toast.add({
      title: t('success.title'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })

    emit('requestLoginCode')
  }
  catch (err) {
    // allauth accepts the request and emails the code, then signals the next
    // step as a 401 with `login_by_code` pending — which `$fetch` throws. That
    // is success, not failure: advance to the confirm step instead of
    // surfacing a false "could not send the code".
    if (await tryAdvanceToPendingFlow(err, { fromPath: formPath })) {
      toast.add({
        title: t('success.title'),
        description: t('success.description'),
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
      emit('requestLoginCode')
      return
    }
    hasError.value = true
    handleAllAuthClientError(err)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="flex flex-col gap-4"
    @error="scrollToFirstFormError"
    @submit="onSubmit"
  >
    <UFormField
      :label="t('email.title')"
      name="email"
      required
    >
      <UInput
        v-model="state.email"
        type="email"
        autocomplete="email"
        inputmode="email"
        icon="i-lucide-mail"
        class="w-full"
      />
    </UFormField>

    <UAlert
      v-if="hasError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('error.title')"
      :description="t('error.description')"
    />

    <UButton
      :label="t('submit')"
      :loading="loading"
      size="lg"
      block
      type="submit"
    />

    <p class="text-center text-sm text-muted">
      {{ t('footer.text') }}
      <ULink
        :to="localePath('account-login')"
        class="font-semibold text-accent"
      >
        {{ t('footer.link') }}
      </ULink>
    </p>
  </UForm>
</template>

<i18n lang="yaml">
el:
  email:
    title: Email
  submit: Αποστολή κωδικού
  success:
    title: Το Email στάλθηκε
    description: Έλεγξε το email σου για τον κωδικό σύνδεσης.
  error:
    title: Σφάλμα αποστολής
    description: Δεν ήταν δυνατή η αποστολή του κωδικού.
  footer:
    text: Τον θυμήθηκες;
    link: Σύνδεση με κωδικό πρόσβασης
en:
  email:
    title: Email
  submit: Send code
  success:
    title: Email sent
    description: Check your email for the sign-in code.
  error:
    title: The email could not be sent
    description: We could not send the code.
  footer:
    text: Remembered it?
    link: Sign in with password
</i18n>
