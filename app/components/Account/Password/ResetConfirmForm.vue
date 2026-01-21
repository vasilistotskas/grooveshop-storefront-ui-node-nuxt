<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const emit = defineEmits(['passwordReset'])

const { getPasswordReset, passwordReset } = useAllAuthAuthentication()
const { t } = useI18n()
const route = useRoute()
const toast = useToast()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()
const router = useRouter()

const key = 'key' in route.params ? route.params.key : undefined

if (!key) {
  navigateTo(localePath('account-password-reset'))
}

await useAsyncData('passwordReset', () => getPasswordReset(String(key)))

const loading = ref(false)
const hasError = ref(false)
const showPassword1 = ref(false)
const showPassword2 = ref(false)

function checkStrength(str: string) {
  const requirements = [
    { regex: /.{8,}/, text: t('password.requirements.length') },
    { regex: /\d/, text: t('password.requirements.number') },
    { regex: /[a-z]/, text: t('password.requirements.lowercase') },
    { regex: /[A-Z]/, text: t('password.requirements.uppercase') },
  ]
  return requirements.map(req => ({ met: req.regex.test(str), text: req.text }))
}

const newPassword1 = ref('')
const newPassword2 = ref('')

const strength = computed(() => checkStrength(newPassword1.value))
const score = computed(() => strength.value.filter(req => req.met).length)

const color = computed(() => {
  if (score.value === 0) return 'neutral'
  if (score.value <= 1) return 'error'
  if (score.value <= 2) return 'warning'
  if (score.value === 3) return 'warning'
  return 'success'
})

const strengthText = computed(() => {
  if (score.value === 0) return t('password.strength.none')
  if (score.value <= 2) return t('password.strength.weak')
  if (score.value === 3) return t('password.strength.medium')
  return t('password.strength.strong')
})

const schema = z.object({
  newPassword1: z.string()
    .min(8, $i18n.t('validation.min', { min: 8 }))
    .max(255),
  newPassword2: z.string()
    .min(8, $i18n.t('validation.min', { min: 8 }))
    .max(255),
  key: z.string(),
}).refine(data => data.newPassword1 === data.newPassword2, {
  message: t('form.newPassword2.errors.match'),
  path: ['newPassword2'],
})

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>): Promise<void> {
  try {
    loading.value = true
    hasError.value = false

    await passwordReset({
      password: event.data.newPassword1,
      key: event.data.key,
    })

    toast.add({
      title: $i18n.t('password.reset.success'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })

    emit('passwordReset')

    await router.push(localePath('account-login'))
  }
  catch (error) {
    if (isAllAuthClientError(error)) {
      if (error.data.data.status === 401) {
        toast.add({
          title: $i18n.t('password.reset.success'),
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
      title: $i18n.t('error.default'),
      color: 'error',
    })
  }
  finally {
    loading.value = false
  }
}
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
      :state="{ newPassword1, newPassword2, key: String(key) }"
      class="space-y-5"
      @submit="onSubmit"
    >
      <UFormField
        name="newPassword1"
        :label="t('form.newPassword1.label')"
        required
      >
        <UInput
          v-model="newPassword1"
          :type="showPassword1 ? 'text' : 'password'"
          :color="color"
          autocomplete="new-password"
          :placeholder="t('password.placeholder')"
          :ui="{
            root: 'w-full',
            trailing: 'pe-1',
          }"
        >
          <template #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              :icon="showPassword1 ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
              :aria-label="showPassword1 ? 'Hide password' : 'Show password'"
              @click="showPassword1 = !showPassword1"
            />
          </template>
        </UInput>

        <template v-if="newPassword1" #hint>
          <div class="mt-2 space-y-2">
            <UProgress
              :color="color"
              :model-value="score"
              :max="4"
              size="sm"
            />

            <p class="text-xs font-medium text-muted">
              {{ strengthText }}. {{ t('password.requirements.title') }}
            </p>

            <ul class="space-y-1">
              <li
                v-for="(req, index) in strength"
                :key="index"
                class="flex items-center gap-1"
                :class="req.met ? 'text-success' : 'text-muted'"
              >
                <UIcon
                  :name="req.met ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                  class="size-4 shrink-0"
                />
                <span class="text-xs">{{ req.text }}</span>
              </li>
            </ul>
          </div>
        </template>
      </UFormField>

      <UFormField
        name="newPassword2"
        :label="t('form.newPassword2.label')"
        required
      >
        <UInput
          v-model="newPassword2"
          :type="showPassword2 ? 'text' : 'password'"
          autocomplete="new-password"
          :placeholder="t('password.placeholder_confirm')"
          :ui="{
            root: 'w-full',
            trailing: 'pe-1',
          }"
        >
          <template #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              :icon="showPassword2 ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
              :aria-label="showPassword2 ? 'Hide password' : 'Show password'"
              @click="showPassword2 = !showPassword2"
            />
          </template>
        </UInput>
      </UFormField>

      <UButton
        type="submit"
        color="neutral"
        variant="subtle"
        :loading="loading"
        :disabled="loading || score < 4"
        block
        size="lg"
        icon="i-heroicons-check-circle"
      >
        {{ t('form.submit') }}
      </UButton>

      <p v-if="score < 4 && newPassword1" class="text-center text-xs text-muted">
        {{ t('password.requirements.complete') }}
      </p>
    </UForm>
  </div>
</template>

<i18n lang="yaml">
el:
  form:
    newPassword1:
      label: Κωδικός πρόσβασης
    newPassword2:
      label: Επιβεβαίωση κωδικού πρόσβασης
      errors:
        match: Η επιβεβαίωση κωδικού πρόσβασης πρέπει να ταιριάζει με τον κωδικό πρόσβασης
    submit: Επαναφορά
  password:
    placeholder: Εισάγετε νέο κωδικό πρόσβασης
    placeholder_confirm: Επιβεβαιώστε τον νέο κωδικό
    strength:
      none: Εισάγετε κωδικό πρόσβασης
      weak: Αδύναμος κωδικός
      medium: Μέτριος κωδικός
      strong: Ισχυρός κωδικός
    requirements:
      title: Πρέπει να περιέχει
      length: Τουλάχιστον 8 χαρακτήρες
      number: Τουλάχιστον 1 αριθμό
      lowercase: Τουλάχιστον 1 πεζό γράμμα
      uppercase: Τουλάχιστον 1 κεφαλαίο γράμμα
      complete: Ολοκληρώστε όλες τις απαιτήσεις για να συνεχίσετε
  success:
    description: Ο κωδικός σας έχει επαναφερθεί επιτυχώς.
  error:
    title: Σφάλμα επαναφοράς
    description: Ο σύνδεσμος επαναφοράς μπορεί να έχει λήξει ή να είναι άκυρος.
</i18n>
