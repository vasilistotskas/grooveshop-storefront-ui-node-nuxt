<script lang="ts" setup>
/**
 * The page a marketing email's unsubscribe link opens.
 *
 * Opening the link unsubscribes NOBODY: mail providers and link scanners
 * prefetch URLs in messages. The visitor presses the button, which POSTs
 * the token (`server/api/emails/unsubscribe/[token].post.ts`). Django
 * then answers 200 (opted out) or 400 (invalid, expired or another
 * store's link).
 */
const { t, locale } = useStoreI18n('components/Storefront/EmailUnsubscribe')
const route = useRoute(`email-unsubscribe-token___${locale.value}`)
const localePath = useLocalePath()

useSeoMeta({
  title: () => t('title'),
})

const { phase, unsubscribing, unsubscribe: unsubscribeFromEmails } = useEmailUnsubscribe({ token: () => route.params.token })

async function unsubscribe() {
  await unsubscribeFromEmails()
  await settleFocus()
}

// Pressing the button unmounts it (or disables it while it loads), so the
// focus would fall to the page, and a live region inserted already filled
// is not announced by many screen readers. Moving focus to the new
// state's own heading — or to the failure message — reads it out and keeps
// the keyboard where the news is.
const heading = useTemplateRef<HTMLElement>('heading')
const failure = useTemplateRef<HTMLElement>('failure')

async function settleFocus() {
  await nextTick()
  const target = phase.value === 'failed' ? failure.value : heading.value
  target?.focus()
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
      <!-- The tile is lime once the opt-out went through and neutral
           otherwise, so the state reads before the words do. -->
      <span
        class="flex size-16 items-center justify-center rounded-2xl"
        :class="phase === 'unsubscribed' ? 'bg-volt text-on-volt' : 'bg-elevated text-highlighted'"
      >
        <UIcon
          :name="phase === 'unsubscribed' ? 'i-lucide-mail-check' : phase === 'invalid' ? 'i-lucide-mail-x' : 'i-lucide-mail-minus'"
          class="size-7"
          aria-hidden="true"
        />
      </span>

      <template v-if="phase === 'unsubscribed'">
        <div
          role="status"
          class="flex flex-col gap-3"
        >
          <h1 ref="heading" tabindex="-1" class="font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em] text-highlighted sm:text-[2.25rem]/[1.1]">
            {{ t('unsubscribed.title') }}
          </h1>
          <p class="text-toned">
            {{ t('unsubscribed.description') }}
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

      <template v-else-if="phase === 'invalid'">
        <div
          role="alert"
          class="flex flex-col gap-3"
        >
          <h1 ref="heading" tabindex="-1" class="font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em] text-highlighted sm:text-[2.25rem]/[1.1]">
            {{ t('invalid.title') }}
          </h1>
          <p class="text-toned">
            {{ t('invalid.description') }}
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
          <h1 ref="heading" tabindex="-1" class="font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em] text-highlighted sm:text-[2.25rem]/[1.1]">
            {{ t('title') }}
          </h1>
          <p class="text-toned">
            {{ t('prompt') }}
          </p>
          <p
            v-if="phase === 'failed'"
            ref="failure"
            tabindex="-1"
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
          :loading="unsubscribing"
          @click="unsubscribe"
        >
          {{ t('confirm') }}
        </UButton>
      </template>
    </section>
  </UContainer>
</template>

<i18n lang="yaml">
el:
  title: Διαγραφή από τα email
  prompt: Πάτησε το κουμπί για να μη λαμβάνεις πλέον διαφημιστικά email από αυτό το κατάστημα.
  confirm: Διαγραφή από τα email
  failed: Η διαγραφή δεν ολοκληρώθηκε. Δοκίμασε ξανά σε λίγο.
  home: Στην αρχική
  unsubscribed:
    title: Δεν θα λαμβάνεις πλέον αυτά τα email
    description: Η διεύθυνσή σου αφαιρέθηκε από τα διαφημιστικά μας email. Θα συνεχίσεις να λαμβάνεις ενημερώσεις για τις παραγγελίες σου.
  invalid:
    title: Μη έγκυρος σύνδεσμος
    description: Ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει.
en:
  title: Unsubscribe from emails
  prompt: Press the button to stop receiving marketing emails from this store.
  confirm: Unsubscribe
  failed: The unsubscribe did not go through. Please try again shortly.
  home: Back to the homepage
  unsubscribed:
    title: You won't receive these emails any more
    description: Your address was removed from our marketing emails. You will still receive updates about your orders.
  invalid:
    title: Invalid link
    description: This link is not valid or has expired.
</i18n>
