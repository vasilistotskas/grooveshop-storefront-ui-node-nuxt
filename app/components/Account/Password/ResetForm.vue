<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const emit = defineEmits(['passwordRequest'])

const { passwordRequest } = useAllAuthAuthentication()
const localePath = useLocalePath()
const { t } = useI18n()

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
// Said in place once the request went through: Django answers the same
// whether or not the address has an account, and so does the page.
const sent = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    loading.value = true
    hasError.value = false

    await passwordRequest({
      email: event.data.email,
    })

    sent.value = true

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

    <UButton
      :label="t('reset')"
      :loading="loading"
      size="lg"
      block
      type="submit"
    />

    <UAlert
      v-if="sent"
      color="success"
      variant="soft"
      icon="i-lucide-mail-check"
      :title="t('sent.title')"
      :description="t('sent.description')"
      role="status"
    />
    <UAlert
      v-else-if="hasError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('error.title')"
      :description="t('error.description')"
    />

    <p class="text-center text-sm">
      <ULink
        :to="localePath('account-login')"
        class="font-semibold text-accent"
      >
        {{ t('back') }}
      </ULink>
    </p>
  </UForm>
</template>

<i18n lang="yaml">
el:
  email:
    title: Email
  reset: Στείλε σύνδεσμο επαναφοράς
  sent:
    title: Δες το email σου
    description: Αν υπάρχει λογαριασμός με αυτό το email, ο σύνδεσμος είναι καθ' οδόν.
  error:
    title: Ο σύνδεσμος δεν στάλθηκε
    description: Δοκίμασε ξανά σε λίγο.
  back: Πίσω στη σύνδεση
en:
  email:
    title: Email
  reset: Send reset link
  sent:
    title: Check your inbox
    description: If an account exists for that email, a link is on its way.
  error:
    title: The link could not be sent
    description: Try again in a moment.
  back: Back to sign in
</i18n>
