<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const emit = defineEmits(['confirmLoginCode'])

const { confirmLoginCode } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()
const localePath = useLocalePath()
const router = useRouter()

// Race-free reference for tryAdvanceToPendingFlow (see app/utils/auth.ts).
const formPath = router.currentRoute.value.path

const hasError = ref(false)
const code = ref<string[]>([])

const codeString = computed(() => code.value.join(''))

const schema = z.object({
  code: z.string()
    .min(1, t('validation.required'))
    .length(6, t('validation.code.length')),
})

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    hasError.value = false

    await confirmLoginCode({ code: event.data.code })

    toast.add({
      title: t('logged_in'),
      description: t('welcome_back'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })

    emit('confirmLoginCode')

    await router.push(localePath('index'))
  }
  catch (err) {
    // A valid code on a 2FA-enabled account doesn't finish login — allauth
    // consumes login_by_code and replies 401 with mfa_authenticate pending.
    // That is not an invalid code: advance to the second-factor challenge.
    if (await tryAdvanceToPendingFlow(err, { fromPath: formPath })) return
    hasError.value = true
    handleAllAuthClientError(err)
  }
}

watch(codeString, (newCode) => {
  if (newCode.length === 6) {
    onSubmit({ data: { code: newCode } } as FormSubmitEvent<Schema>)
  }
})
</script>

<template>
  <UForm
    :schema="schema"
    :state="{ code: codeString }"
    class="flex flex-col gap-6"
    @error="scrollToFirstFormError"
    @submit="onSubmit"
  >
    <UFormField
      name="code"
      :label="t('code_label')"
      :ui="{ label: 'sr-only' }"
    >
      <UPinInput
        v-model="code"
        :length="6"
        type="text"
        otp
        size="xl"
        :aria-label="t('code_label')"
      />
    </UFormField>

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

    <UButton
      :label="t('submit')"
      :disabled="codeString.length !== 6"
      size="lg"
      block
      type="submit"
    />

    <p class="text-center text-sm text-muted">
      {{ t('no_code') }}
      <ULink
        :to="localePath('account-login-code')"
        class="font-semibold text-accent"
      >
        {{ t('resend') }}
      </ULink>
    </p>
  </UForm>
</template>

<i18n lang="yaml">
el:
  code_label: Κωδικός 6 ψηφίων
  submit: Σύνδεση
  logged_in: Συνδέθηκες
  welcome_back: Καλώς ήρθες ξανά
  error:
    title: Μη έγκυρος κωδικός
    description: Ο κωδικός δεν είναι σωστός ή έχει λήξει.
  no_code: Δεν τον έλαβες;
  resend: Ζήτα νέο κωδικό
  validation:
    required: Απαιτείται κωδικός
    code:
      length: Ο κωδικός πρέπει να έχει 6 ψηφία
en:
  code_label: 6-digit code
  submit: Sign in
  logged_in: You are signed in
  welcome_back: Welcome back
  error:
    title: That code is not valid
    description: The code you entered is not valid, or it has expired.
  no_code: Didn't get it?
  resend: Request a new code
  validation:
    required: A code is required
    code:
      length: The code must be 6 digits
</i18n>
