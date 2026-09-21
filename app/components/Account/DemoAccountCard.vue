<script lang="ts" setup>
/**
 * The demo store's shared accounts, offered on its login page.
 *
 * A prospect cannot see the signed-in half of a shop — orders, saved
 * addresses, loyalty, favourites — without an account, and asking them
 * to make one to look around is the point at which they leave. So this
 * store publishes one and says so.
 *
 * A second, WHOLESALE account is offered when the store has one. It is
 * deliberately not the default: a B2B account changes every price on
 * the storefront, so a prospect handed only that login would read
 * wholesale numbers as the retail ones.
 *
 * Fails CLOSED per account: the merchant setting must be on, and BOTH
 * that account's credentials must be non-empty. They reach the browser
 * through the public settings payload, which is exactly what the
 * operator opts into by turning the flag on — Django's setting
 * description says so — and no other tenant has it on.
 *
 * Client-only: a cached anonymous page is shared by every visitor, and
 * whether the card renders depends on the settings payload for THIS
 * store rather than on the build.
 */
const emit = defineEmits<{
  (e: 'login', credentials: { email: string, password: string }): void
}>()

defineProps<{
  /** True while the form this card drives is signing in. */
  loading?: boolean
}>()

const { t } = useI18n()

const enabled = useSettingFlag('DEMO_ACCOUNT_ENABLED', { fallback: false })
const email = useSettingValue('DEMO_ACCOUNT_EMAIL')
const password = useSettingValue('DEMO_ACCOUNT_PASSWORD')
const b2bEmail = useSettingValue('DEMO_ACCOUNT_B2B_EMAIL')
const b2bPassword = useSettingValue('DEMO_ACCOUNT_B2B_PASSWORD')

interface DemoAccount {
  key: 'retail' | 'wholesale'
  email: string
  password: string
}

const accounts = computed<DemoAccount[]>(() => {
  if (!enabled.value) return []
  const rows: DemoAccount[] = []
  if (email.value && password.value) {
    rows.push({ key: 'retail', email: email.value, password: password.value })
  }
  if (b2bEmail.value && b2bPassword.value) {
    rows.push({
      key: 'wholesale',
      email: b2bEmail.value,
      password: b2bPassword.value,
    })
  }
  return rows
})

/**
 * One account needs no heading — a label over a single pair of fields
 * only asks the reader what the other kind would have been.
 */
const labelled = computed(() => accounts.value.length > 1)

const { copy, copied } = useClipboard()
const copiedField = ref<string | null>(null)

const copyField = async (account: DemoAccount, field: 'email' | 'password') => {
  await copy(field === 'email' ? account.email : account.password)
  copiedField.value = `${account.key}:${field}`
}

const copyIcon = (account: DemoAccount, field: 'email' | 'password') =>
  copied.value && copiedField.value === `${account.key}:${field}`
    ? 'i-heroicons-check'
    : 'i-heroicons-clipboard-document'
</script>

<template>
  <ClientOnly>
    <UPageCard
      v-if="accounts.length"
      variant="soft"
      highlight
      highlight-color="secondary"
      icon="i-heroicons-sparkles"
      :title="t('title')"
      :description="t('description')"
      :ui="{
        title: 'font-display text-base font-semibold',
        description: 'text-sm',
        container: 'gap-4',
      }"
    >
      <!-- The ACTION first, the credentials under it as a line to
           read or copy — not as form fields.

           Two labelled email+password pairs stacked directly above the
           real login form made the page read as three login forms: six
           input boxes, three submit buttons, one screen. Reported as
           "weird and broken (duplicate content)", and it was. The card
           only ever needed to say "here is a way in, and here are the
           credentials if you want them". -->
      <div
        v-for="account in accounts"
        :key="account.key"
        class="flex flex-col gap-2"
      >
        <p
          v-if="labelled"
          class="text-xs font-semibold tracking-wide text-toned uppercase"
        >
          {{ t(`account.${account.key}`) }}
        </p>

        <UButton
          block
          :color="account.key === 'retail' ? 'secondary' : 'neutral'"
          :variant="account.key === 'retail' ? 'solid' : 'subtle'"
          size="lg"
          icon="i-heroicons-arrow-right-on-rectangle"
          :label="labelled ? t(`sign_in_as.${account.key}`) : t('sign_in')"
          :loading="loading"
          @click="emit('login', {
            email: account.email,
            password: account.password,
          })"
        />

        <!-- Shown in clear on purpose: these are published to every
             visitor of this store, and hiding the password behind a
             reveal would only suggest it is a secret. -->
        <dl
          class="
            grid grid-cols-[auto_1fr_auto] items-center gap-x-2 text-xs
          "
        >
          <template
            v-for="field in (['email', 'password'] as const)"
            :key="field"
          >
            <dt class="text-toned">
              {{ t(field) }}
            </dt>
            <dd class="truncate font-mono text-toned">
              {{ account[field] }}
            </dd>
            <UButton
              :icon="copyIcon(account, field)"
              color="neutral"
              variant="link"
              size="xs"
              :aria-label="t('copy')"
              @click="copyField(account, field)"
            />
          </template>
        </dl>
      </div>

      <!-- `toned`: this card is a soft UPageCard, and the muted token
           is calibrated against `bg-default` — on that surface it
           measured 3.06:1 in dark mode. -->
      <p class="text-center text-xs text-toned">
        {{ t('reset_notice') }}
      </p>
    </UPageCard>
  </ClientOnly>
</template>

<i18n lang="yaml">
el:
  title: Δοκιμαστικός λογαριασμός
  description: Μπες με έτοιμο λογαριασμό για να δεις παραγγελίες, διευθύνσεις, αγαπημένα και πόντους.
  email: Email
  password: Κωδικός
  copy: Αντιγραφή
  sign_in: Σύνδεση ως επισκέπτης δοκιμής
  account:
    retail: Λιανική
    wholesale: Χονδρική
  sign_in_as:
    retail: Σύνδεση ως πελάτης λιανικής
    wholesale: Σύνδεση ως πελάτης χονδρικής
  reset_notice: Οι λογαριασμοί μηδενίζονται κάθε βράδυ.
en:
  title: Demo account
  description: Sign in with a ready-made account to see orders, addresses, favourites and points.
  email: Email
  password: Password
  copy: Copy
  sign_in: Sign in as the demo shopper
  account:
    retail: Retail
    wholesale: Wholesale
  sign_in_as:
    retail: Sign in as a retail shopper
    wholesale: Sign in as a wholesale buyer
  reset_notice: The accounts are reset every night.
</i18n>
