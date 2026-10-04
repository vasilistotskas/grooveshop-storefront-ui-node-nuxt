<script lang="ts" setup>
/**
 * The gift cards linked to the shopper's account, as the boards draw
 * them: a card each — its code, what is left of what it held, when it
 * expires — inked while it can still pay, quiet once it cannot (used up,
 * expired or disabled). Under them, sending one to someone, with the
 * amounts the store sells when it says.
 */
const { t, n, locale } = useI18n()
useHead({ title: () => t('title') })
const localePath = useLocalePath()

const { data, status, refresh } = await useApi('/api/giftcard/mine', {
  key: 'account-gift-cards',
  method: 'GET',
})

const cards = computed(() => data.value?.results ?? [])

const minAmount = useSettingValue('GIFT_CARD_MIN_AMOUNT')
const maxAmount = useSettingValue('GIFT_CARD_MAX_AMOUNT')

type CardState = 'usable' | 'used_up' | 'expired' | 'disabled'

function stateOf(card: GiftCard): CardState {
  if (card.status === 'DISABLED') return 'disabled'
  if (card.expiresAt && new Date(card.expiresAt).getTime() <= Date.now()) return 'expired'
  if (Number(card.balance) <= 0) return 'used_up'
  return 'usable'
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader
      :title="t('title')"
      :lead="t('lead')"
    />

    <div
      v-if="status === 'pending' && !data"
      class="grid gap-4 sm:grid-cols-2"
    >
      <USkeleton
        v-for="index in 2"
        :key="index"
        class="h-44 rounded-[1.25rem]"
      />
    </div>

    <AccountLoadError
      v-else-if="status === 'error'"
      :message="t('load_error')"
      @retry="() => refresh()"
    />

    <ul
      v-else-if="cards.length"
      class="grid gap-4 sm:grid-cols-2"
    >
      <li
        v-for="card in cards"
        :key="card.uuid"
        :class="[
          'flex flex-col gap-4 rounded-[1.25rem] p-6',
          stateOf(card) === 'usable' ? 'bg-inverted text-inverted' : 'bg-default ring ring-default',
        ]"
      >
        <div class="flex items-start justify-between gap-3">
          <p
            :class="[
              'font-mono text-sm font-bold tracking-[0.08em] break-all',
              stateOf(card) === 'usable' ? 'text-inverted' : 'text-toned',
            ]"
          >
            {{ card.code }}
          </p>
          <UIcon
            name="i-lucide-gift"
            :class="['size-5 shrink-0', stateOf(card) === 'usable' ? 'text-inverted' : 'text-toned']"
          />
        </div>
        <p class="flex flex-wrap items-baseline gap-x-2">
          <span
            :class="[
              'font-mono text-4xl font-bold tracking-[-0.02em]',
              stateOf(card) === 'usable' ? 'text-inverted' : 'text-highlighted',
            ]"
          >{{ n(Number(card.balance), 'currency') }}</span>
          <span :class="['text-sm', stateOf(card) === 'usable' ? 'text-inverted/80' : 'text-toned']">
            {{ t('of', { value: n(Number(card.initialValue), 'currency') }) }}
          </span>
        </p>
        <p :class="['text-sm', stateOf(card) === 'usable' ? 'text-inverted/80' : 'text-toned']">
          <template v-if="stateOf(card) === 'usable' && card.expiresAt">
            <i18n-t keypath="expires">
              <template #date>
                <NuxtTime
                  :datetime="card.expiresAt"
                  :locale="locale"
                  month="short"
                  year="numeric"
                />
              </template>
            </i18n-t>
          </template>
          <template v-else-if="stateOf(card) === 'usable'">
            {{ t('no_expiry') }}
          </template>
          <template v-else-if="stateOf(card) === 'expired' && card.expiresAt">
            <i18n-t keypath="expired">
              <template #date>
                <NuxtTime
                  :datetime="card.expiresAt"
                  :locale="locale"
                  day="numeric"
                  month="short"
                  year="numeric"
                />
              </template>
            </i18n-t>
          </template>
          <template v-else>
            {{ t(stateOf(card)) }}
          </template>
        </p>
      </li>
    </ul>

    <p
      v-else
      class="rounded-[1.25rem] bg-default p-6 text-toned ring ring-default"
    >
      {{ t('empty') }}
    </p>

    <div class="flex flex-wrap items-center justify-between gap-4 rounded-[1.25rem] bg-elevated p-5 sm:px-6">
      <div class="flex min-w-0 flex-col gap-0.5">
        <p class="font-semibold text-highlighted">
          {{ t('send.title') }}
        </p>
        <p class="text-sm text-toned">
          {{ minAmount && maxAmount
            ? t('send.range', { min: n(Number(minAmount), 'currency'), max: n(Number(maxAmount), 'currency') })
            : t('send.lead') }}
        </p>
      </div>
      <UButton
        :label="t('send.buy')"
        :to="localePath('gift-cards')"
        color="neutral"
        class="max-sm:w-full max-sm:justify-center"
      />
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Δωροκάρτες
  lead: Οι κάρτες που σου έκαναν δώρο ή αγόρασες για εσένα.
  load_error: Δεν μπορέσαμε να φορτώσουμε τις δωροκάρτες σου.
  of: από {value}
  expires: Λήγει {date}
  no_expiry: Δεν λήγει
  expired: Έληξε στις {date}
  used_up: Εξαντλήθηκε
  disabled: Απενεργοποιημένη
  empty: Δεν έχεις ακόμα δωροκάρτες στον λογαριασμό σου.
  send:
    title: Στείλε μία σε κάποιον
    range: Από {min} έως {max}, με email.
    lead: Παραδίδεται με email.
    buy: Αγορά δωροκάρτας
en:
  title: Gift cards
  lead: Cards you received or bought for yourself.
  load_error: We could not load your gift cards.
  of: of {value}
  expires: Expires {date}
  no_expiry: Never expires
  expired: Expired on {date}
  used_up: Used up
  disabled: Disabled
  empty: You have no gift cards on your account yet.
  send:
    title: Send one to someone
    range: From {min} to {max}, delivered by email.
    lead: Delivered by email.
    buy: Buy a gift card
</i18n>
