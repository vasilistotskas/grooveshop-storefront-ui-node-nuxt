<script lang="ts" setup>
import * as z from 'zod'

const emit = defineEmits(['signUpByPasskey'])

const { signUpByPasskey } = useAllAuthAuthentication()
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const loading = ref(false)

async function onSubmit(values: WebAuthnSignupPostBody) {
  try {
    loading.value = true
    await signUpByPasskey(values)
    emit('signUpByPasskey')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}

const formSchema = computed<DynamicFormSchema>(() => ({
  fields: [
    {
      name: 'email',
      as: 'input',
      rules: z.string({ required_error: $i18n.t('validation.required') }).email($i18n.t('validation.email.valid')),
      autocomplete: 'email',
      readonly: false,
      required: true,
      placeholder: $i18n.t('email.title'),
      type: 'email',
    },
  ],
}))
</script>

<template>
  <div
    class="
      container mx-auto grid gap-1 p-0

      md:px-6
    "
  >
    <p
      class="
        text-primary-950 flex items-center text-center

        dark:text-primary-50
      "
    >
      {{ t('description') }}
      <UButton
        :label="t('login_here')"
        :to="localePath('account-login')"
        color="secondary"
        size="lg"
        type="submit"
        variant="link"
      />
    </p>
    <section class="grid items-center">
      <DynamicForm
        :button-label="$i18n.t('submit')"
        :schema="formSchema"
        @submit="onSubmit"
      />
    </section>
    <div class="flex items-center justify-end">
      <UButton
        class="!px-0"
        :label="t('using_password')"
        :to="localePath('account-signup')"
        color="secondary"
        size="lg"
        type="submit"
        variant="link"
      />
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  description: Έχεις ήδη λογαριασμό;
  login_here: Συνδέσου εδώ
  using_password: Εγγράψου με κωδικό
</i18n>
