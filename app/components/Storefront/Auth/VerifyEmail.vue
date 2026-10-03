<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const emit = defineEmits(['emailVerify'])

const { emailVerify } = useAllAuthAuthentication()
const { t } = useI18n()
useHead({ title: () => t('title') })
const toast = useToast()
const localePath = useLocalePath()
const router = useRouter()

const hasError = ref(false)
const code = ref<string[]>([])

const codeString = computed(() => code.value.join(''))

const schema = z.object({
  key: z.string()
    .min(1, t('validation.required'))
    .length(6, t('validation.code.length')),
})

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>): Promise<void> {
  try {
    hasError.value = false

    const data = await emailVerify({ key: event.data.key })

    if (data && [200, 401].includes(data.status)) {
      toast.add({
        title: t('auth.email.verified'),
        description: t('success.description'),
        color: 'success',
        icon: 'i-lucide-circle-check',
      })

      emit('emailVerify')
      await router.push(localePath('account'))
    }
  }
  catch (error) {
    hasError.value = true
    handleAllAuthClientError(error)
  }
}

watch(codeString, (newCode) => {
  if (newCode.length === 6) {
    onSubmit({ data: { key: newCode } } as FormSubmitEvent<Schema>)
  }
})
</script>

<template>
  <!-- 5 minutes: Django's ACCOUNT_EMAIL_VERIFICATION_BY_CODE_TIMEOUT is 300 s. -->
  <AuthPanel
    icon="i-lucide-mail-check"
    :title="t('title')"
    :lead="t('lead')"
  >
    <UForm
      :schema="schema"
      :state="{ key: codeString }"
      class="flex flex-col gap-6"
      @error="scrollToFirstFormError"
      @submit="onSubmit"
    >
      <UFormField
        name="key"
        :label="t('key')"
        :ui="{ label: 'sr-only' }"
      >
        <UPinInput
          v-model="code"
          :length="6"
          type="text"
          otp
          size="xl"
          :aria-label="t('key')"
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
        {{ t('wrong_address') }}
        <ULink
          :to="localePath('account-signup')"
          class="font-semibold text-accent"
        >
          {{ t('change') }}
        </ULink>
      </p>
    </UForm>
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Επιβεβαίωσε το email σου
  lead: Σου στείλαμε έναν κωδικό. Γράψε τον μέσα σε 5 λεπτά για να ολοκληρώσεις τη δημιουργία του λογαριασμού σου.
  key: Κωδικός 6 ψηφίων
  submit: Επιβεβαίωση email
  wrong_address: Λάθος διεύθυνση;
  change: Άλλαξέ την
  success:
    description: Το email σου επιβεβαιώθηκε.
  error:
    title: Μη έγκυρος κωδικός
    description: Ο κωδικός δεν είναι σωστός ή έχει λήξει.
  validation:
    code:
      length: Ο κωδικός πρέπει να έχει 6 ψηφία
en:
  title: Confirm your email
  lead: We sent you a code. Enter it within 5 minutes to finish creating your account.
  key: 6-digit code
  submit: Confirm email
  wrong_address: Wrong address?
  change: Change it
  success:
    description: Your email is confirmed.
  error:
    title: That code is not valid
    description: The code is not right, or it has expired.
  validation:
    code:
      length: The code must be 6 digits
</i18n>
