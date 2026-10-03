<script lang="ts" setup>
/**
 * The demo store's shared accounts, offered on its sign-in page.
 *
 * A prospect cannot see the signed-in half of a shop — orders, saved
 * addresses, loyalty, favourites — without an account, and asking them
 * to make one to look around is the point at which they leave. So this
 * store publishes one and says so.
 *
 * A second, WHOLESALE account is offered when the store has one. It is
 * deliberately not first: a B2B account changes every price on the
 * storefront, so a prospect handed only that login would read wholesale
 * numbers as the retail ones.
 *
 * One strip, one row per account — who it is, its email, its password
 * masked with a copy button, and a "Sign in" that hands the credentials
 * to the page's form (`login`): the form owns the one sign-in path, the
 * pending two-factor flow and the `next` bookkeeping. Not a second set
 * of form fields — two pairs of them stacked over the real form read as
 * three login forms.
 *
 * Fails CLOSED per account: the merchant setting must be on, and BOTH
 * that account's credentials must be non-empty. They reach the browser
 * through the public settings payload, which is exactly what the
 * operator opts into by turning the flag on — Django's setting
 * description says so — and no other tenant has it on.
 *
 * Client-only: a cached anonymous page is shared by every visitor, and
 * whether the strip renders depends on the settings payload for THIS
 * store rather than on the build.
 */
const emit = defineEmits<{
  (e: 'login', credentials: { email: string, password: string }): void
}>()

defineProps<{
  /** True while the form this strip drives is signing in. */
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
    rows.push({ key: 'wholesale', email: b2bEmail.value, password: b2bPassword.value })
  }
  return rows
})

const { copy, copied } = useClipboard()
const copiedKey = ref<DemoAccount['key'] | null>(null)

async function copyPassword(account: DemoAccount) {
  await copy(account.password)
  copiedKey.value = account.key
}
</script>

<template>
  <ClientOnly>
    <section
      v-if="accounts.length"
      :aria-label="t('title')"
      class="flex flex-col gap-3 rounded-[1.125rem] border border-(--ui-volt-edge) bg-(--ui-volt-soft) p-4.5"
    >
      <div class="flex flex-wrap items-center gap-2">
        <UBadge
          :label="t('title')"
          color="neutral"
          variant="solid"
        />
        <span class="text-[0.8125rem] font-semibold text-highlighted">{{ t('lead') }}</span>
      </div>

      <div
        v-for="account in accounts"
        :key="account.key"
        class="flex items-center gap-3 rounded-[0.875rem] border border-default bg-default py-2.5 ps-3.5 pe-2.5"
      >
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="flex flex-wrap items-baseline gap-x-1.5">
            <strong class="text-sm text-highlighted">{{ t(`account.${account.key}.name`) }}</strong>
            <span class="text-xs text-muted">{{ t(`account.${account.key}.purpose`) }}</span>
          </span>
          <span class="truncate font-mono text-xs text-toned">{{ account.email }}</span>
          <span class="flex items-center gap-1 font-mono text-xs text-muted">
            <span aria-hidden="true">••••••••••</span>
            <span class="sr-only">{{ t('password_hidden') }}</span>
            <UButton
              :icon="copied && copiedKey === account.key ? 'i-lucide-check' : 'i-lucide-copy'"
              color="neutral"
              variant="ghost"
              size="xs"
              square
              :aria-label="t(`account.${account.key}.copy`)"
              @click="copyPassword(account)"
            />
          </span>
        </div>
        <UButton
          :label="t('sign_in')"
          :aria-label="t(`account.${account.key}.sign_in`)"
          size="sm"
          :loading="loading"
          @click="emit('login', { email: account.email, password: account.password })"
        />
      </div>
    </section>
  </ClientOnly>
</template>

<i18n lang="yaml">
el:
  title: Δοκιμαστικός λογαριασμός
  lead: Δες τα πάντα με έτοιμα δεδομένα
  sign_in: Σύνδεση
  password_hidden: Κωδικός κρυμμένος
  account:
    retail:
      name: Πελάτης
      purpose: Παραγγελίες, πόντοι, αγαπημένα
      copy: Αντιγραφή του κωδικού πελάτη
      sign_in: Σύνδεση ως πελάτης
    wholesale:
      name: Χονδρική
      purpose: Τιμές χονδρικής
      copy: Αντιγραφή του κωδικού χονδρικής
      sign_in: Σύνδεση ως πελάτης χονδρικής
en:
  title: Demo account
  lead: Explore everything with sample data
  sign_in: Sign in
  password_hidden: Password hidden
  account:
    retail:
      name: Shopper
      purpose: Orders, points, favourites
      copy: Copy the shopper password
      sign_in: Sign in as the shopper
    wholesale:
      name: Wholesale
      purpose: Wholesale prices
      copy: Copy the wholesale password
      sign_in: Sign in as the wholesale buyer
</i18n>
