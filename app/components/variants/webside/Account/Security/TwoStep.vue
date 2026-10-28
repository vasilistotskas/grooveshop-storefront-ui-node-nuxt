<script lang="ts" setup>
/**
 * Two-step verification at a glance, in webside's design: a tile per
 * second factor the store supports — the authenticator app, passkeys and
 * security keys, recovery codes — saying whether it is on, with the one
 * action that changes it. What each tile says and when it shows is the
 * default design's rule (`useAccountSecurity`); recovery codes exist
 * only once another factor is on, so their tile waits for one, and a
 * set running low is flagged.
 */
const { t, locale } = useStoreI18n('components/variants/webside/Account/Security/TwoStep')
const localePath = useLocalePath()
const { supports, totpAuthenticator, recoveryCodesAuthenticator, passkeys, hasSecondFactor } = useAccountSecurity()

const epoch = (seconds: number) => new Date(seconds * 1000).toISOString()
</script>

<template>
  <ul
    class="
      grid gap-4
      md:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]
    "
  >
    <li
      v-if="supports('totp')"
      class="
        flex flex-col gap-3 rounded-lg border border-gray-200 p-4
        dark:border-gray-800
      "
    >
      <div class="flex items-start justify-between gap-2">
        <UIcon
          name="i-heroicons-device-phone-mobile"
          class="size-6 text-primary"
        />
        <UBadge
          :label="totpAuthenticator ? t('on') : t('off')"
          :color="totpAuthenticator ? 'success' : 'neutral'"
          variant="soft"
          size="sm"
        />
      </div>
      <div class="flex flex-1 flex-col gap-1">
        <p
          class="
            font-semibold text-primary-950
            dark:text-primary-50
          "
        >
          {{ t('totp.title') }}
        </p>
        <p
          class="
            text-sm text-gray-500
            dark:text-gray-200
          "
        >
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
        class="self-start"
      />
    </li>

    <li
      v-if="supports('webauthn')"
      class="
        flex flex-col gap-3 rounded-lg border border-gray-200 p-4
        dark:border-gray-800
      "
    >
      <div class="flex items-start justify-between gap-2">
        <UIcon
          name="i-heroicons-key"
          class="size-6 text-primary"
        />
        <UBadge
          :label="passkeys.length ? t('on') : t('off')"
          :color="passkeys.length ? 'success' : 'neutral'"
          variant="soft"
          size="sm"
        />
      </div>
      <div class="flex flex-1 flex-col gap-1">
        <p
          class="
            font-semibold text-primary-950
            dark:text-primary-50
          "
        >
          {{ t('webauthn.title') }}
        </p>
        <p
          class="
            text-sm text-gray-500
            dark:text-gray-200
          "
        >
          {{ t('webauthn.count', passkeys.length) }}
        </p>
      </div>
      <UButton
        :label="passkeys.length ? t('webauthn.manage') : t('webauthn.add')"
        :to="passkeys.length ? localePath({ name: 'account-security', hash: '#passkeys' }) : localePath('account-2fa-webauthn-add')"
        color="neutral"
        variant="outline"
        class="self-start"
      />
    </li>

    <li
      v-if="supports('recovery_codes') && hasSecondFactor"
      class="
        flex flex-col gap-3 rounded-lg border border-gray-200 p-4
        dark:border-gray-800
      "
    >
      <div class="flex items-start justify-between gap-2">
        <UIcon
          name="i-heroicons-ticket"
          class="size-6 text-primary"
        />
        <UBadge
          v-if="recoveryCodesAuthenticator"
          :label="t('codes.left', { count: recoveryCodesAuthenticator.unused_code_count ?? 0 })"
          :color="recoveryCodesRunningLow(recoveryCodesAuthenticator.unused_code_count ?? 0) ? 'warning' : 'neutral'"
          variant="soft"
          size="sm"
        />
      </div>
      <div class="flex flex-1 flex-col gap-1">
        <p
          class="
            font-semibold text-primary-950
            dark:text-primary-50
          "
        >
          {{ t('codes.title') }}
        </p>
        <p
          class="
            text-sm text-gray-500
            dark:text-gray-200
          "
        >
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
