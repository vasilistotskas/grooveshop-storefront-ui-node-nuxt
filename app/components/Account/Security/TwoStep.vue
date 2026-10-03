<script lang="ts" setup>
/**
 * Two-step verification at a glance, as the boards draw it: a tile per
 * second factor the store supports — the authenticator app, passkeys and
 * security keys, recovery codes — saying whether it is on, with the one
 * action that changes it. Each action opens that factor's own page, but
 * managing passkeys, whose list is on the Security page itself.
 *
 * Recovery codes exist only once another factor is on (allauth creates
 * them with it), so their tile waits for one.
 */
const { t, locale } = useI18n()
const localePath = useLocalePath()
const authStore = useAuthStore()
const { config, totpAuthenticator, recoveryCodesAuthenticator, authenticators } = storeToRefs(authStore)

const supports = (type: 'totp' | 'webauthn' | 'recovery_codes') =>
  config.value?.mfa?.supported_types.includes(type) ?? false

const passkeys = computed(() =>
  (authenticators.value ?? []).filter(authenticator => authenticator.type === AuthenticatorType.WEBAUTHN),
)

const hasSecondFactor = computed(() => Boolean(totpAuthenticator.value) || passkeys.value.length > 0)

const epoch = (seconds: number) => new Date(seconds * 1000).toISOString()
</script>

<template>
  <!-- As many tiles to a row as fit, each sharing the row: two tiles
       (no recovery codes yet) fill it as three do. -->
  <ul class="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-3">
    <li
      v-if="supports('totp')"
      class="flex flex-col gap-3 rounded-[1rem] bg-elevated p-4"
    >
      <div class="flex items-start justify-between gap-2">
        <UIcon
          name="i-lucide-qr-code"
          class="size-5 text-highlighted"
        />
        <UBadge
          :label="totpAuthenticator ? t('on') : t('off')"
          :color="totpAuthenticator ? 'success' : 'neutral'"
          variant="soft"
          size="sm"
        />
      </div>
      <div class="flex flex-1 flex-col gap-0.5">
        <p class="font-semibold text-highlighted">
          {{ t('totp.title') }}
        </p>
        <p class="text-sm text-toned">
          <i18n-t
            v-if="totpAuthenticator"
            keypath="totp.since"
          >
            <template #date>
              <NuxtTime
                :datetime="epoch(totpAuthenticator.created_at)"
                :locale="locale"
                month="short"
                year="numeric"
              />
            </template>
          </i18n-t>
          <template v-else>
            {{ t('totp.off') }}
          </template>
        </p>
      </div>
      <UButton
        :label="totpAuthenticator ? t('totp.turn_off') : t('totp.set_up')"
        :to="localePath(totpAuthenticator ? 'account-2fa-totp-deactivate' : 'account-2fa-totp-activate')"
        color="neutral"
        :variant="totpAuthenticator ? 'outline' : 'solid'"
        size="sm"
        class="self-start"
      />
    </li>

    <li
      v-if="supports('webauthn')"
      class="flex flex-col gap-3 rounded-[1rem] bg-elevated p-4"
    >
      <div class="flex items-start justify-between gap-2">
        <UIcon
          name="i-lucide-fingerprint"
          class="size-5 text-highlighted"
        />
        <UBadge
          :label="passkeys.length ? t('on') : t('off')"
          :color="passkeys.length ? 'success' : 'neutral'"
          variant="soft"
          size="sm"
        />
      </div>
      <div class="flex flex-1 flex-col gap-0.5">
        <p class="font-semibold text-highlighted">
          {{ t('webauthn.title') }}
        </p>
        <p class="text-sm text-toned">
          {{ t('webauthn.count', passkeys.length) }}
        </p>
      </div>
      <UButton
        :label="passkeys.length ? t('webauthn.manage') : t('webauthn.add')"
        :to="passkeys.length ? localePath({ name: 'account-security', hash: '#passkeys' }) : localePath('account-2fa-webauthn-add')"
        color="neutral"
        variant="outline"
        size="sm"
        class="self-start"
      />
    </li>

    <li
      v-if="supports('recovery_codes') && hasSecondFactor"
      class="flex flex-col gap-3 rounded-[1rem] bg-elevated p-4"
    >
      <div class="flex items-start justify-between gap-2">
        <UIcon
          name="i-lucide-key-round"
          class="size-5 text-highlighted"
        />
        <UBadge
          v-if="recoveryCodesAuthenticator"
          :label="t('codes.left', { count: recoveryCodesAuthenticator.unused_code_count ?? 0 })"
          :color="recoveryCodesRunningLow(recoveryCodesAuthenticator.unused_code_count ?? 0) ? 'warning' : 'neutral'"
          variant="soft"
          size="sm"
        />
      </div>
      <div class="flex flex-1 flex-col gap-0.5">
        <p class="font-semibold text-highlighted">
          {{ t('codes.title') }}
        </p>
        <p class="text-sm text-toned">
          {{ recoveryCodesAuthenticator
            ? t('codes.unused', { unused: recoveryCodesAuthenticator.unused_code_count ?? 0, total: recoveryCodesAuthenticator.total_code_count ?? 0 })
            : t('codes.none') }}
        </p>
      </div>
      <UButton
        :label="recoveryCodesAuthenticator ? t('codes.view') : t('codes.generate')"
        :to="localePath(recoveryCodesAuthenticator ? 'account-2fa-recovery-codes' : 'account-2fa-recovery-codes-generate')"
        color="neutral"
        variant="outline"
        size="sm"
        class="self-start"
      />
    </li>
  </ul>
</template>

<i18n lang="yaml">
el:
  "on": Ενεργό
  "off": Ανενεργό
  totp:
    title: Εφαρμογή επαλήθευσης
    since: Ενεργή από {date}
    "off": Κωδικοί από το κινητό σου, κάθε φορά που συνδέεσαι.
    set_up: Ενεργοποίηση
    turn_off: Απενεργοποίηση
  webauthn:
    title: Passkeys & κλειδιά ασφαλείας
    count: "Κανένα ακόμα | {n} καταχωρημένο | {n} καταχωρημένα"
    manage: Διαχείριση
    add: Προσθήκη
  codes:
    title: Κωδικοί ανάκτησης
    left: "Απομένουν {count}"
    unused: "{unused} από {total} αχρησιμοποίητοι"
    none: Δεν έχουν δημιουργηθεί ακόμα.
    view: Προβολή
    generate: Δημιουργία
en:
  "on": "On"
  "off": "Off"
  totp:
    title: Authenticator app
    since: Active since {date}
    "off": Codes from your phone each time you sign in.
    set_up: Set up
    turn_off: Turn off
  webauthn:
    title: Passkeys & security keys
    count: "None yet | {n} registered | {n} registered"
    manage: Manage
    add: Add
  codes:
    title: Recovery codes
    left: "{count} left"
    unused: "{unused} of {total} unused"
    none: Not generated yet.
    view: View
    generate: Generate
</i18n>
