<script lang="ts" setup>
import type { AuthFormField } from '#ui/types'

const emit = defineEmits(['requestLoginCode'])

const { t } = useStoreI18n('components/variants/webside/Account/Login/Code/Form')
const localePath = useLocalePath()

const { schema, loading, hasError, onSubmit } = useLoginCodeRequest({
  sent: () => ({
    title: t('success.title'),
    description: t('success.description'),
    color: 'success',
    icon: 'i-heroicons-check-circle',
  }),
  onRequested: () => emit('requestLoginCode'),
})

const fields: AuthFormField[] = [
  {
    name: 'email',
    type: 'email',
    label: t('email.title'),
    placeholder: 'example@email.com',
    required: true,
  },
]
</script>

<template>
  <UAuthForm
    :schema="schema"
    :fields="fields"
    :loading="loading"
    :submit="{
      label: t('submit'),
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
    text: Έχεις ήδη κωδικό;
    link: Εισήγαγε τον εδώ
</i18n>
