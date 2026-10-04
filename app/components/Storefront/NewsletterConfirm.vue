<script lang="ts" setup>
/**
 * The page a newsletter confirmation email links to.
 *
 * Opening the link confirms NOTHING: mail providers and link scanners
 * prefetch URLs in messages, and a GET that confirmed would subscribe
 * people who never clicked. The visitor presses the button, which
 * POSTs the token (`server/api/subscriptions/confirm/[token].post.ts`).
 * Django then answers 200 (confirmed), 410 (the week-long link has
 * expired) or 400 (unknown or already used).
 */
const { t, locale } = useI18n()
const route = useRoute(`newsletter-confirm-token___${locale.value}`)
const localePath = useLocalePath()
const { loggedIn } = useUserSession()

useSeoMeta({
  title: () => t('title'),
})

type Phase = 'idle' | 'confirmed' | 'expired' | 'invalid' | 'failed'

const phase = ref<Phase>('idle')
const confirming = ref(false)
const topic = ref('')

function statusOf(error: unknown): number | undefined {
  return error && typeof error === 'object' && 'statusCode' in error
    ? (error as { statusCode?: number }).statusCode
    : undefined
}

async function confirm() {
  if (confirming.value) return
  confirming.value = true
  try {
    const response = await $api(
      `/api/subscriptions/confirm/${encodeURIComponent(route.params.token)}`,
      { method: 'POST' },
    )
    topic.value = response?.topic ?? ''
    phase.value = 'confirmed'
  }
  catch (error) {
    const status = statusOf(error)
    phase.value = status === 410
      ? 'expired'
      : status === 400
        ? 'invalid'
        : 'failed'
  }
  finally {
    confirming.value = false
  }
}
</script>

<template>
  <UContainer class="flex justify-center py-12 lg:py-20">
    <section
      class="
        flex w-full max-w-xl flex-col items-start gap-5 rounded-[1.5rem]
        bg-default p-6 ring ring-default
        sm:p-10
      "
    >
      <!-- The tile is lime while the news is good and neutral while it is
           not, so the state reads before the words do. -->
      <span
        class="flex size-16 items-center justify-center rounded-2xl"
        :class="phase === 'expired' || phase === 'invalid' ? 'bg-elevated text-highlighted' : 'bg-volt text-on-volt'"
      >
        <UIcon
          :name="phase === 'expired' || phase === 'invalid' ? 'i-lucide-mail-x' : phase === 'confirmed' ? 'i-lucide-mail-check' : 'i-lucide-mail'"
          class="size-7"
          aria-hidden="true"
        />
      </span>

      <template v-if="phase === 'confirmed'">
        <div
          role="status"
          class="flex flex-col gap-3"
        >
          <h1 class="font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em] text-highlighted sm:text-[2.25rem]/[1.1]">
            {{ t('confirmed.title') }}
          </h1>
          <p class="text-toned">
            {{ topic ? t('confirmed.topic', { topic }) : t('confirmed.description') }}
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <UButton
            :to="localePath('products')"
            color="neutral"
            size="lg"
            class="rounded-full"
          >
            {{ t('shop') }}
          </UButton>
          <UButton
            v-if="loggedIn"
            :to="localePath('account-subscriptions')"
            color="neutral"
            variant="outline"
            size="lg"
            class="rounded-full"
          >
            {{ t('topics') }}
          </UButton>
        </div>
      </template>

      <template v-else-if="phase === 'expired' || phase === 'invalid'">
        <div
          role="alert"
          class="flex flex-col gap-3"
        >
          <h1 class="font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em] text-highlighted sm:text-[2.25rem]/[1.1]">
            {{ t(`${phase}.title`) }}
          </h1>
          <p class="text-toned">
            {{ t(`${phase}.description`) }}
          </p>
        </div>
        <UButton
          :to="localePath('index')"
          color="neutral"
          size="lg"
          class="rounded-full"
        >
          {{ t('home') }}
        </UButton>
      </template>

      <template v-else>
        <div class="flex flex-col gap-3">
          <h1 class="font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em] text-highlighted sm:text-[2.25rem]/[1.1]">
            {{ t('title') }}
          </h1>
          <p class="text-toned">
            {{ t('prompt') }}
          </p>
          <p
            v-if="phase === 'failed'"
            role="alert"
            class="rounded-xl bg-(--ui-error-soft) px-4 py-3 text-sm text-highlighted"
          >
            {{ t('failed') }}
          </p>
        </div>
        <UButton
          color="neutral"
          size="lg"
          class="rounded-full"
          :loading="confirming"
          @click="confirm"
        >
          {{ t('confirm') }}
        </UButton>
      </template>
    </section>
  </UContainer>
</template>

<i18n lang="yaml">
el:
  title: Επιβεβαίωση εγγραφής
  prompt: Πάτησε το κουμπί για να ολοκληρώσεις την εγγραφή σου στο ενημερωτικό δελτίο.
  confirm: Επιβεβαίωση εγγραφής
  failed: Η επιβεβαίωση δεν ολοκληρώθηκε. Δοκίμασε ξανά σε λίγο.
  home: Στην αρχική
  shop: Ξεκίνα τις αγορές
  topics: Διαχείριση θεμάτων
  confirmed:
    title: Η εγγραφή σου επιβεβαιώθηκε
    description: Από εδώ και πέρα θα λαμβάνεις το ενημερωτικό μας δελτίο.
    topic: 'Από εδώ και πέρα θα λαμβάνεις: {topic}.'
  expired:
    title: Ο σύνδεσμος έληξε
    description: Οι σύνδεσμοι επιβεβαίωσης ισχύουν μία εβδομάδα. Κάνε ξανά εγγραφή για να λάβεις νέο.
  invalid:
    title: Μη έγκυρος σύνδεσμος
    description: Ο σύνδεσμος δεν είναι έγκυρος ή έχει ήδη χρησιμοποιηθεί.
en:
  title: Confirm your subscription
  prompt: Press the button to complete your newsletter subscription.
  confirm: Confirm subscription
  failed: The confirmation did not go through. Please try again shortly.
  home: Back to the homepage
  shop: Start shopping
  topics: Manage topics
  confirmed:
    title: Your subscription is confirmed
    description: From now on you will receive our newsletter.
    topic: 'From now on you will receive: {topic}.'
  expired:
    title: This link has expired
    description: Confirmation links are valid for a week. Subscribe again to get a new one.
  invalid:
    title: Invalid link
    description: This link is not valid or has already been used.
</i18n>
