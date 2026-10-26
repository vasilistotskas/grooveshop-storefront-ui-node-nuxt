<script lang="ts" setup>
import type { PropType } from 'vue'

defineProps({
  flow: { type: String as PropType<Flow['id']>, required: false },
})

defineSlots<{
  default(props: object): any
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const { next, routeName, methods: choices } = useMfaReauthenticationMethods()

const flowIcons: Record<string, string> = {
  [Flows.REAUTHENTICATE]: 'i-heroicons-lock-closed',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.TOTP}`]: 'i-heroicons-device-phone-mobile',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: 'i-heroicons-key',
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: 'i-heroicons-finger-print',
}

const flowLabels: Record<string, string> = {
  [Flows.REAUTHENTICATE]: t('reauthenticate.title'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.TOTP}`]: t('mfa_reauthenticate.totp'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: t('mfa_reauthenticate.recovery_codes'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: t('mfa_reauthenticate.webauthn'),
}

const flowDescriptions: Record<string, string> = {
  [Flows.REAUTHENTICATE]: t('reauthenticate.description'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.TOTP}`]: t('mfa_reauthenticate.totp_description'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.RECOVERY_CODES}`]: t('mfa_reauthenticate.recovery_codes_description'),
  [`${Flows.MFA_REAUTHENTICATE}:${AuthenticatorType.WEBAUTHN}`]: t('mfa_reauthenticate.webauthn_description'),
}

const methods = computed(() => choices.value.map(method => ({
  ...method,
  label: flowLabels[method.key] || method.id,
  description: flowDescriptions[method.key] || '',
  icon: flowIcons[method.key] || 'i-heroicons-shield-check',
  iconColor: 'text-info',
})))
</script>

<template>
  <div class="space-y-6">
    <slot />

    <div v-if="methods.length > 0" class="space-y-4">
      <USeparator :label="t('alternative_options')" />

      <div class="space-y-2">
        <ULink
          v-for="method in methods"
          :key="method.id"
          :disabled="method.path === routeName"
          :to="localePath({
            name: method.path,
            query: { next },
          })"
          :class="[
            'flex items-center gap-3 rounded-lg border p-4 transition-colors',
            method.path === routeName ? 'border-primary bg-primary/5' : `
              border-default
              hover:bg-elevated
            `,
          ]"
        >
          <div
            :class="[
              'flex size-10 shrink-0 items-center justify-center rounded-full',
              method.path === routeName ? 'bg-primary/20' : 'bg-primary/10',
            ]"
          >
            <UIcon
              :name="method.icon"
              :class="method.iconColor"
              class="size-5"
            />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-default">
                {{ method.label }}
              </p>
              <UBadge
                v-if="method.path === routeName"
                :label="t('current_method')"
                color="info"
                variant="subtle"
                size="sm"
              />
            </div>
            <p class="truncate text-xs text-muted">
              {{ method.description }}
            </p>
          </div>

          <UIcon
            name="i-heroicons-chevron-right"
            class="size-5 shrink-0 text-muted"
          />
        </ULink>
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  alternative_options: Εναλλακτικές μέθοδοι
  current_method: Τρέχουσα
  mfa_reauthenticate:
    totp: Εφαρμογή επαλήθευσης
    totp_description: Χρησιμοποιήστε τον 6ψήφιο κωδικό από την εφαρμογή σας
    recovery_codes: Κωδικοί ανάκτησης
    recovery_codes_description: Χρησιμοποιήστε έναν εφεδρικό κωδικό ανάκτησης
    webauthn: Κλειδί ασφαλείας
    webauthn_description: Χρησιμοποιήστε το κλειδί ασφαλείας ή βιομετρικά στοιχεία
  reauthenticate:
    title: Κωδικός πρόσβασης
    description: Επιβεβαιώστε την ταυτότητά σας με τον κωδικό σας
en:
  alternative_options: Other methods
  current_method: Current
  mfa_reauthenticate:
    totp: Authenticator app
    totp_description: Use the 6-digit code from your app
    recovery_codes: Recovery codes
    recovery_codes_description: Use one of your backup recovery codes
    webauthn: Security key
    webauthn_description: Use your security key or your biometrics
  reauthenticate:
    title: Password
    description: Confirm it is you with your password
</i18n>
