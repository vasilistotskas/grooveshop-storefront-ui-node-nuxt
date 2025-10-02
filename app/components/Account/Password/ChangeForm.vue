<script lang="ts" setup>
import * as z from 'zod'

const emit = defineEmits(['changePassword'])

const { changePassword } = useAllAuthAccount()
const authStore = useAuthStore()
const { hasCurrentPassword } = storeToRefs(authStore)

const { $i18n } = useNuxtApp()
const toast = useToast()
const localePath = useLocalePath()
const { t } = useI18n()

const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

const state = reactive({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

function checkPasswordStrength(password: string) {
  const requirements = [
    { regex: /.{8,}/, text: t('password.requirements.length') },
    { regex: /\d/, text: t('password.requirements.number') },
    { regex: /[a-z]/, text: t('password.requirements.lowercase') },
    { regex: /[A-Z]/, text: t('password.requirements.uppercase') },
  ]

  return requirements.map(req => ({
    met: req.regex.test(password),
    text: req.text,
  }))
}

const passwordStrength = computed(() => checkPasswordStrength(state.new_password))
const passwordScore = computed(() => passwordStrength.value.filter(req => req.met).length)

const strengthColor = computed(() => {
  if (passwordScore.value === 0) return 'neutral'
  if (passwordScore.value <= 1) return 'error'
  if (passwordScore.value <= 2) return 'warning'
  if (passwordScore.value === 3) return 'warning'
  return 'success'
})

const strengthText = computed(() => {
  if (passwordScore.value === 0) return t('password.strength.none')
  if (passwordScore.value <= 2) return t('password.strength.weak')
  if (passwordScore.value === 3) return t('password.strength.medium')
  return t('password.strength.strong')
})

const schema = computed(() => {
  return z
    .object({
      current_password: hasCurrentPassword.value
        ? z.string().min(1, $i18n.t('validation.required'))
        : z.string().optional(),
      new_password: z
        .string({ error: issue => issue.input === undefined
          ? $i18n.t('validation.required')
          : $i18n.t('validation.string.invalid') })
        .min(8, $i18n.t('validation.min', { min: 8 }))
        .max(255, $i18n.t('validation.max', { max: 255 })),
      confirm_password: z.string({ error: issue => issue.input === undefined
        ? $i18n.t('validation.required')
        : $i18n.t('validation.string.invalid') })
        .min(1, $i18n.t('validation.required')),
    })
    .superRefine((val, ctx) => {
      if (val.new_password !== val.confirm_password) {
        ctx.addIssue({
          code: 'custom',
          message: $i18n.t('validation.must_match', {
            field: $i18n.t('password.new'),
            other: $i18n.t('password.confirm'),
          }),
          path: ['confirm_password'],
        })
      }

      if (hasCurrentPassword.value && val.current_password && val.current_password === val.new_password) {
        ctx.addIssue({
          code: 'custom',
          message: $i18n.t('validation.password.must_not_be_same'),
          path: ['new_password'],
        })
      }
    })
})

async function onSubmit() {
  const body = {
    current_password: state.current_password || '',
    new_password: state.new_password,
  }

  try {
    await changePassword(body)
    toast.add({
      title: $i18n.t('auth.password.change.success'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
    emit('changePassword')
    await navigateTo(localePath('account'))
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}
</script>

<template>
  <div
    class="
      grid gap-4
      lg:flex
    "
  >
    <slot />

    <div class="space-y-6">
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="
                flex size-10 min-w-10 items-center justify-center rounded-full
                bg-warning/10
              "
            >
              <UIcon
                name="i-lucide-shield-off"
                class="size-5 text-warning"
              />
            </div>
            <div>
              <h2
                class="
                  text-lg font-semibold text-primary-950
                  md:text-xl
                  dark:text-primary-50
                "
              >
                {{ hasCurrentPassword ? t('change.title') : t('set.title') }}
              </h2>
              <p
                class="
                  mt-1 text-sm text-gray-500
                  dark:text-gray-400
                "
              >
                {{ hasCurrentPassword ? t('change.description') : t('set.description') }}
              </p>
            </div>
          </div>
        </template>

        <UAlert
          v-if="!hasCurrentPassword"
          icon="i-heroicons-shield-exclamation"
          color="warning"
          variant="soft"
          :title="t('security.title')"
          :description="t('security.description')"
          class="mb-6"
        />
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-6"
          @submit="onSubmit"
        >
          <UFormField
            v-if="hasCurrentPassword"
            :label="$i18n.t('password.current')"
            name="current_password"
            required
          >
            <UInput
              v-model="state.current_password"
              :type="showCurrent ? 'text' : 'password'"
              :placeholder="$i18n.t('password.current')"
              autocomplete="current-password"
              icon="i-heroicons-lock-closed"
              size="lg"
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
                  :icon="showCurrent ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                  :aria-label="showCurrent ? 'Hide password' : 'Show password'"
                  @click="showCurrent = !showCurrent"
                />
              </template>
            </UInput>
          </UFormField>

          <UFormField
            :label="$i18n.t('password.new')"
            name="new_password"
            required
          >
            <UInput
              v-model="state.new_password"
              :type="showNew ? 'text' : 'password'"
              :placeholder="$i18n.t('password.new')"
              :color="state.new_password ? strengthColor : 'primary'"
              autocomplete="new-password"
              icon="i-heroicons-key"
              size="lg"
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
                  :icon="showNew ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                  :aria-label="showNew ? 'Hide password' : 'Show password'"
                  @click="showNew = !showNew"
                />
              </template>
            </UInput>

            <div v-if="state.new_password" class="mt-3 space-y-2">
              <UProgress
                :color="strengthColor"
                :model-value="passwordScore"
                :max="4"
                size="sm"
              />

              <p class="flex items-center gap-2 text-sm font-medium">
                <UIcon
                  :name="passwordScore === 4 ? 'i-heroicons-shield-check' : 'i-heroicons-shield-exclamation'"
                  :class="passwordScore === 4 ? 'text-success' : 'text-warning'"
                  class="size-4"
                />
                {{ strengthText }}
              </p>

              <ul class="mt-3 space-y-1.5" aria-label="Password requirements">
                <li
                  v-for="(req, index) in passwordStrength"
                  :key="index"
                  class="flex items-center gap-2 text-xs"
                  :class="req.met ? 'text-success' : `
                    text-gray-500
                    dark:text-gray-400
                  `"
                >
                  <UIcon
                    :name="req.met ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                    class="size-4 shrink-0"
                  />
                  <span>{{ req.text }}</span>
                </li>
              </ul>
            </div>
          </UFormField>

          <UFormField
            :label="$i18n.t('password.confirm')"
            name="confirm_password"
            required
          >
            <UInput
              v-model="state.confirm_password"
              :type="showConfirm ? 'text' : 'password'"
              :placeholder="$i18n.t('password.confirm')"
              autocomplete="new-password"
              icon="i-heroicons-check-badge"
              size="lg"
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
                  :icon="showConfirm ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                  :aria-label="showConfirm ? 'Hide password' : 'Show password'"
                  @click="showConfirm = !showConfirm"
                />
              </template>
            </UInput>
          </UFormField>

          <div class="flex items-center gap-3 pt-4">
            <UButton
              type="submit"
              color="neutral"
              variant="outline"
              size="lg"
              icon="i-heroicons-check"
              :label="hasCurrentPassword ? t('change.submit') : $i18n.t('set.submit')"
            />

            <UButton
              type="button"
              color="neutral"
              variant="outline"
              size="lg"
              icon="i-heroicons-arrow-left"
              :label="t('common.cancel')"
              @click="navigateTo(localePath('account'))"
            />
          </div>
        </UForm>
      </UCard>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  password:
    current: Τρέχων κωδικός
    new: Νέος κωδικός
    confirm: Επιβεβαίωση κωδικού
    requirements:
      length: Τουλάχιστον 8 χαρακτήρες
      number: Τουλάχιστον 1 αριθμός
      lowercase: Τουλάχιστον 1 πεζό γράμμα
      uppercase: Τουλάχιστον 1 κεφαλαίο γράμμα
    strength:
      none: Εισάγετε κωδικό
      weak: Αδύναμος κωδικός
      medium: Μέτριος κωδικός
      strong: Ισχυρός κωδικός
  change:
    title: Αλλαγή κωδικού πρόσβασης
    description: Ενημερώστε τον κωδικό σας για να διατηρήσετε τον λογαριασμό σας ασφαλή
    submit: Αλλαγή κωδικού
  set:
    title: Αλλαγή κωδικού πρόσβασης
    description: Δημιουργήστε έναν ισχυρό κωδικό για να προστατεύσετε τον λογαριασμό σας
    submit: Όρισε κωδικό
  common:
    cancel: Ακύρωση
  security:
    title: Ασφαλής κωδικός
    description: Βεβαιωθείτε ότι ο κωδικός σας περιέχει τουλάχιστον 8 χαρακτήρες με συνδυασμό γραμμάτων και αριθμών
</i18n>
