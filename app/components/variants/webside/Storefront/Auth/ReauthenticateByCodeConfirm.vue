<script lang="ts" setup>
const { t } = useStoreI18n('components/variants/webside/Storefront/Auth/ReauthenticateByCodeConfirm')
useHead({ title: () => t('title') })

await useAuthEventGuard(AuthChangeEvent.REAUTHENTICATION_REQUIRED)

const { maskedAddress, submitting, hasError, confirm, resend } = useEmailCodeReauthentication()

const code = ref<string[]>([])

async function onSubmit() {
  const codeValue = code.value.join('')
  if (codeValue.length !== 6) return
  const confirmed = await confirm(
    codeValue,
    () => ({ title: t('success'), color: 'success', icon: 'i-heroicons-check-circle' }),
    () => ({ title: t('start_over'), color: 'warning' }),
  )
  if (!confirmed) code.value = []
}
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center px-4 py-12">
    <UCard
      class="w-full max-w-lg"
      :ui="{
        body: 'space-y-6',
      }"
    >
      <template #header>
        <div class="space-y-2 text-center">
          <div
            class="
              mx-auto flex size-12 items-center justify-center rounded-full
              bg-primary/10
            "
          >
            <UIcon
              name="i-heroicons-envelope-open"
              class="size-6 text-info"
            />
          </div>
          <h2 class="text-2xl font-bold tracking-tight">
            {{ t('title') }}
          </h2>
          <p class="text-sm text-muted">
            {{ t('description', { address: maskedAddress }) }}
          </p>
        </div>
      </template>

      <WebsideAccount2FaReauthenticateFlow :flow="Flows.REAUTHENTICATE_BY_CODE">
        <form
          class="space-y-6"
          @submit.prevent="onSubmit"
        >
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

          <div class="flex flex-col items-center space-y-4">
            <UFormField
              name="code"
              class="w-full text-center"
            >
              <div class="flex justify-center">
                <UPinInput
                  v-model="code"
                  :length="6"
                  type="text"
                  size="xl"
                  otp
                  :aria-label="t('code.label')"
                  @complete="onSubmit"
                />
              </div>
            </UFormField>

            <p class="text-xs text-muted">
              {{ t('code.hint') }}
            </p>
          </div>

          <UButton
            type="submit"
            color="neutral"
            size="lg"
            block
            :loading="submitting"
            :disabled="code.join('').length !== 6"
            icon="i-heroicons-arrow-right"
            trailing
          >
            {{ t('submit') }}
          </UButton>

          <AuthResendCode
            :send="resend"
            start-over="account-reauthenticate-code"
          />
        </form>
      </WebsideAccount2FaReauthenticateFlow>
    </UCard>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Δείτε το email σας
  description: Εισάγετε τον κωδικό που στείλαμε στο {address}. Λήγει σε 5 λεπτά
  code:
    label: Κωδικός 6 ψηφίων
    hint: Ο κωδικός είναι 6 ψηφία και βρίσκεται στο email μας
  submit: Επιβεβαίωση
  success: Επιτυχής επαναπιστοποίηση
  start_over: Ο κωδικός έληξε. Ζητήστε νέο.
  error:
    title: Μη έγκυρος κωδικός
    description: Ο κωδικός που εισαγάγατε δεν είναι έγκυρος ή έχει λήξει.
</i18n>
