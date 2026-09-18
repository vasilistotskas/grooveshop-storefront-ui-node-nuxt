<script lang="ts" setup>
/**
 * The demo store's shared account, offered on its login page.
 *
 * A prospect cannot see the signed-in half of a shop — orders, saved
 * addresses, loyalty, favourites — without an account, and asking them
 * to make one to look around is the point at which they leave. So this
 * store publishes one and says so.
 *
 * Fails CLOSED, three times over: the merchant setting must be on, and
 * BOTH credentials must be non-empty. They reach the browser through
 * the public settings payload, which is exactly what the operator opts
 * into by turning the flag on — Django's setting description says so —
 * and no other tenant has it on.
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

const available = computed(
  () => enabled.value && !!email.value && !!password.value,
)

const { copy, copied } = useClipboard()
const copiedField = ref<'email' | 'password' | null>(null)

const copyField = async (field: 'email' | 'password') => {
  await copy(field === 'email' ? email.value : password.value)
  copiedField.value = field
}
</script>

<template>
  <ClientOnly>
    <UPageCard
      v-if="available"
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
      <div class="flex flex-col gap-2">
        <UFormField
          :label="t('email')"
          size="sm"
        >
          <UInput
            :model-value="email"
            readonly
            class="w-full"
            :ui="{ base: 'font-mono' }"
          >
            <template #trailing>
              <UButton
                :icon="copied && copiedField === 'email'
                  ? 'i-heroicons-check'
                  : 'i-heroicons-clipboard-document'"
                color="neutral"
                variant="link"
                size="sm"
                :aria-label="t('copy')"
                @click="copyField('email')"
              />
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="t('password')"
          size="sm"
        >
          <!-- Shown in clear on purpose: it is published to every
               visitor of this store, and hiding it behind a reveal
               would only suggest it is a secret. -->
          <UInput
            :model-value="password"
            readonly
            class="w-full"
            :ui="{ base: 'font-mono' }"
          >
            <template #trailing>
              <UButton
                :icon="copied && copiedField === 'password'
                  ? 'i-heroicons-check'
                  : 'i-heroicons-clipboard-document'"
                color="neutral"
                variant="link"
                size="sm"
                :aria-label="t('copy')"
                @click="copyField('password')"
              />
            </template>
          </UInput>
        </UFormField>
      </div>

      <!-- Below the credentials, not in the card's footer slot: that
           slot renders BEFORE the default one, so the button sat above
           the fields it signs in with. -->
      <div class="flex flex-col gap-2">
        <UButton
          block
          color="secondary"
          size="lg"
          icon="i-heroicons-arrow-right-on-rectangle"
          :label="t('sign_in')"
          :loading="loading"
          @click="emit('login', { email, password })"
        />
        <p class="text-center text-xs text-dimmed">
          {{ t('reset_notice') }}
        </p>
      </div>
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
  reset_notice: Ο λογαριασμός μηδενίζεται κάθε βράδυ.
en:
  title: Demo account
  description: Sign in with a ready-made account to see orders, addresses, favourites and points.
  email: Email
  password: Password
  copy: Copy
  sign_in: Sign in as the demo shopper
  reset_notice: The account is reset every night.
</i18n>
