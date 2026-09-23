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
    const response = await $fetch(
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
  <PageWrapper class="flex flex-col gap-6">
    <PageTitle :text="t('title')" />

    <div class="mx-auto w-full max-w-xl">
      <UCard>
        <div
          v-if="phase === 'confirmed'"
          role="status"
          class="space-y-4 py-6 text-center"
        >
          <UIcon
            name="i-heroicons-check-circle"
            class="mx-auto size-12 text-success"
          />
          <h2 class="text-xl font-semibold">
            {{ t('confirmed.title') }}
          </h2>
          <p class="text-muted">
            {{ topic ? t('confirmed.topic', { topic }) : t('confirmed.description') }}
          </p>
          <UButton
            :to="localePath('index')"
            color="secondary"
          >
            {{ t('home') }}
          </UButton>
        </div>

        <div
          v-else-if="phase === 'expired' || phase === 'invalid'"
          role="alert"
          class="space-y-4 py-6 text-center"
        >
          <UIcon
            name="i-heroicons-x-circle"
            class="mx-auto size-12 text-error"
          />
          <h2 class="text-xl font-semibold">
            {{ t(`${phase}.title`) }}
          </h2>
          <p class="text-muted">
            {{ t(`${phase}.description`) }}
          </p>
          <UButton
            :to="localePath('index')"
            color="secondary"
          >
            {{ t('home') }}
          </UButton>
        </div>

        <div
          v-else
          class="space-y-4 py-6 text-center"
        >
          <UIcon
            name="i-heroicons-envelope-open"
            class="mx-auto size-12 text-muted"
          />
          <p class="text-muted">
            {{ t('prompt') }}
          </p>
          <p
            v-if="phase === 'failed'"
            role="alert"
            class="text-sm text-error"
          >
            {{ t('failed') }}
          </p>
          <UButton
            color="secondary"
            size="lg"
            :loading="confirming"
            @click="confirm"
          >
            {{ t('confirm') }}
          </UButton>
        </div>
      </UCard>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επιβεβαίωση εγγραφής
  prompt: Πάτησε το κουμπί για να ολοκληρώσεις την εγγραφή σου στο ενημερωτικό δελτίο.
  confirm: Επιβεβαίωση εγγραφής
  failed: Η επιβεβαίωση δεν ολοκληρώθηκε. Δοκίμασε ξανά σε λίγο.
  home: Στην αρχική
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
