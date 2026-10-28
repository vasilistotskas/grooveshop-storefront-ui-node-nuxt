<script lang="ts" setup>
const emit = defineEmits(['changePassword'])

const localePath = useLocalePath()
const { t } = useStoreI18n('components/variants/webside/Account/Password/ChangeForm')

const { state, schema, hasCurrentPassword, isSubmitting, submit } = usePasswordChange({
  fieldLabels: () => ({ field: t('password.new'), other: t('password.confirm') }),
  successIcon: 'i-heroicons-check-circle',
})

const passwordStrengthResult = computed(() => passwordStrength(state.new_password))
const passwordStrengthRequirements = computed(() => passwordStrengthResult.value.requirements.map(requirement => ({
  met: requirement.met,
  text: t(`password.requirements.${requirement.id}`),
})))
const passwordScore = computed(() => passwordStrengthResult.value.score)
const strengthColor = computed(() => passwordStrengthResult.value.color)

const strengthText = computed(() => {
  if (passwordScore.value === 0) return t('password.strength.none')
  if (passwordScore.value <= 2) return t('password.strength.weak')
  if (passwordScore.value === 3) return t('password.strength.medium')
  return t('password.strength.strong')
})

async function onSubmit() {
  if (!await submit()) return
  emit('changePassword')
  await navigateTo(localePath('account'))
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

    <div class="w-full space-y-6">
      <UCard>
        <template #header>
          <!-- The reference for every other text form on the site is
               this header, so it is now a component and this file is
               its first consumer — adopting it here rather than
               leaving the original inline is what stops the two
               drifting apart. -->
          <WebsideFormCardHeader
            icon="i-heroicons-shield-exclamation"
            color="warning"
            :title="hasCurrentPassword ? t('change.title') : t('set.title')"
            :description="hasCurrentPassword ? t('change.description') : t('set.description')"
          />
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
          class="w-full space-y-6"
          @error="scrollToFirstFormError"
          @submit="onSubmit"
        >
          <UFormField
            v-if="hasCurrentPassword"
            :label="t('password.current')"
            name="current_password"
            required
          >
            <WebsideFormPasswordInput
              v-model="state.current_password"
              :placeholder="t('password.current')"
              autocomplete="current-password"
              icon="i-heroicons-lock-closed"
              size="xl"
            />
          </UFormField>

          <UFormField
            :label="t('password.new')"
            name="new_password"
            required
          >
            <WebsideFormPasswordInput
              v-model="state.new_password"
              :placeholder="t('password.new')"
              :color="state.new_password ? strengthColor : 'primary'"
              autocomplete="new-password"
              icon="i-heroicons-key"
              size="xl"
            />

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

              <ul class="mt-3 space-y-1.5" :aria-label="t('password.requirements.title')">
                <li
                  v-for="(req, index) in passwordStrengthRequirements"
                  :key="index"
                  class="flex items-center gap-2 text-xs"
                  :class="req.met ? 'text-success' : `
                    text-gray-500
                    dark:text-gray-200
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
            :label="t('password.confirm')"
            name="confirm_password"
            required
          >
            <WebsideFormPasswordInput
              v-model="state.confirm_password"
              :placeholder="t('password.confirm')"
              autocomplete="new-password"
              icon="i-heroicons-check-badge"
              size="xl"
            />
          </UFormField>

          <div class="flex items-center justify-between gap-3 pt-4">
            <UButton
              type="button"
              color="error"
              variant="subtle"
              size="lg"
              icon="i-heroicons-arrow-left"
              :label="t('common.cancel')"
              @click="() => { navigateTo(localePath('account')) }"
            />
            <UButton
              type="submit"
              color="secondary"
              size="lg"
              icon="i-heroicons-check"
              :loading="isSubmitting"
              :disabled="isSubmitting"
              :label="hasCurrentPassword ? t('change.submit') : t('set.submit')"
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
      title: Απαιτήσεις κωδικού πρόσβασης
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
    description: Ενημέρωσε τον κωδικό σου για να διατηρήσεις τον λογαριασμό σου ασφαλή
    submit: Αλλαγή κωδικού
  set:
    title: Αλλαγή κωδικού πρόσβασης
    description: Δημιούργησε έναν ισχυρό κωδικό για να προστατεύσεις τον λογαριασμό σου
    submit: Όρισε κωδικό
  common:
    cancel: Ακύρωση
  security:
    title: Ασφαλής κωδικός
    description: Βεβαιώσου ότι ο κωδικός σου περιέχει τουλάχιστον 8 χαρακτήρες με συνδυασμό γραμμάτων και αριθμών
  hide_password: Απόκρυψη κωδικού πρόσβασης
  show_password: Εμφάνιση κωδικού πρόσβασης
en:
  password:
    current: Current password
    new: New password
    confirm: Confirm password
    requirements:
      title: Password requirements
      length: At least 8 characters
      number: At least 1 number
      lowercase: At least 1 lowercase letter
      uppercase: At least 1 capital letter
    strength:
      none: Enter a password
      weak: Weak password
      medium: Fair password
      strong: Strong password
  change:
    title: Change password
    description: Update your password to keep your account secure
    submit: Change password
  set:
    title: Change password
    description: Create a strong password to protect your account
    submit: Set password
  common:
    cancel: Cancel
  security:
    title: A secure password
    description: Make sure your password is at least 8 characters and mixes letters with numbers
  hide_password: Hide password
  show_password: Show password
</i18n>
