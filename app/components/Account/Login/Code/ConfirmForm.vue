<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const emit = defineEmits(['confirmLoginCode'])

const { confirmLoginCode } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()
const localePath = useLocalePath()
const router = useRouter()

const loading = ref(false)
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
    loading.value = true
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
    hasError.value = true
    handleAllAuthClientError(err)
  }
  finally {
    loading.value = false
  }
}

watch(codeString, (newCode) => {
  if (newCode.length === 6) {
    onSubmit({ data: { code: newCode } } as FormSubmitEvent<Schema>)
  }
})
</script>

<template>
  <div class="space-y-6">
    <UAlert
      v-if="hasError"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-circle"
      :title="t('error.title')"
      :description="t('error.description')"
      close
      @update:open="hasError = false"
    />

    <UForm
      :schema="schema"
      :state="{ code: codeString }"
      class="space-y-6"
      @submit="onSubmit"
    >
      <UFormField
        name="code"
        :label="t('code_label')"
      >
        <div class="flex justify-center pt-2">
          <UPinInput
            v-model="code"
            :length="6"
            type="text"
            otp
            size="xl"
            placeholder="○"
            :disabled="loading"
            class="gap-2"
          />
        </div>

        <template #hint>
          <div class="mt-2 text-center text-sm text-muted">
            {{ t('code_hint') }}
          </div>
        </template>
      </UFormField>

      <UButton
        type="submit"
        :loading="loading"
        :disabled="codeString.length !== 6"
        block
        color="neutral"
        variant="subtle"
        size="lg"
        icon="i-heroicons-arrow-right-on-rectangle"
      >
        {{ t('submit') }}
      </UButton>
    </UForm>

    <div class="text-center">
      <USeparator :label="t('separator')" />

      <div class="mt-4 text-sm text-muted">
        {{ t('no_code') }}
        <UButton
          variant="link"
          :to="localePath('account-login-code')"
          class="p-0 font-medium"
        >
          {{ t('resend') }}
        </UButton>
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  code_label: Κωδικός επιβεβαίωσης
  code_hint: Εισάγετε τον 6-ψήφιο κωδικό από το email σας
  submit: Σύνδεση
  logged_in: Συνδεθήκατε επιτυχώς
  welcome_back: Καλώς ήρθατε πίσω!
  error:
    title: Μη έγκυρος κωδικός
    description: Ο κωδικός που εισαγάγατε δεν είναι έγκυρος ή έχει λήξει.
  separator: ή
  no_code: Δεν λάβατε κωδικό;
  resend: Αποστολή ξανά
  validation:
    required: Απαιτείται κωδικός
    code:
      length: Ο κωδικός πρέπει να έχει 6 ψηφία
</i18n>
