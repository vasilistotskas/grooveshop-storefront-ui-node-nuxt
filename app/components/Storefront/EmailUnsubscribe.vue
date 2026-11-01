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

const { phase, scope, pending, unsubscribe: unsubscribeFromEmails } = useEmailUnsubscribe({ token: () => route.params.token })

async function unsubscribe(requested: EmailUnsubscribeScope) {
  await unsubscribeFromEmails(requested)
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
            {{ t(`unsubscribed.${scope}.title`) }}
          </h1>
          <p class="text-toned">
            {{ t(`unsubscribed.${scope}.description`) }}
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
        <div class="flex flex-wrap gap-3">
          <UButton
            color="neutral"
            size="lg"
            class="rounded-full"
            :loading="pending === 'type'"
            :disabled="pending === 'all'"
            @click="() => unsubscribe('type')"
          >
            {{ t('unsubscribeType') }}
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="lg"
            class="rounded-full"
            :loading="pending === 'all'"
            :disabled="pending === 'type'"
            @click="() => unsubscribe('all')"
          >
            {{ t('unsubscribeAll') }}
          </UButton>
        </div>
      </template>
    </section>
  </UContainer>
</template>

<i18n lang="yaml">
el:
  title: Διαγραφή από τα email
  prompt: Θέλεις να σταματήσεις να λαμβάνεις αυτά τα email από το κατάστημα;
  unsubscribeType: Διαγραφή από αυτά τα email
  unsubscribeAll: Διαγραφή από όλα τα διαφημιστικά email
  failed: Η διαγραφή δεν ολοκληρώθηκε. Δοκίμασε ξανά σε λίγο.
  home: Στην αρχική
  unsubscribed:
    type:
      title: Δεν θα λαμβάνεις πλέον αυτά τα email
      description: Δεν θα σου ξαναστείλουμε αυτό το είδος email. Θα συνεχίσεις να λαμβάνεις ενημερώσεις για τις παραγγελίες σου.
    all:
      title: Δεν θα λαμβάνεις πλέον διαφημιστικά email
      description: Σταματήσαμε όλα τα διαφημιστικά email του καταστήματος. Θα συνεχίσεις να λαμβάνεις ενημερώσεις για τις παραγγελίες σου.
  invalid:
    title: Μη έγκυρος σύνδεσμος
    description: Ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει.
en:
  title: Unsubscribe from emails
  prompt: Do you want to stop receiving these emails from the store?
  unsubscribeType: Stop these emails
  unsubscribeAll: Stop all marketing emails
  failed: The unsubscribe did not go through. Please try again shortly.
  home: Back to the homepage
  unsubscribed:
    type:
      title: You won't receive these emails any more
      description: We won't send you this kind of email again. You will still receive updates about your orders.
    all:
      title: You won't receive marketing emails any more
      description: We stopped all of the store's marketing emails. You will still receive updates about your orders.
  invalid:
    title: Invalid link
    description: This link is not valid or has expired.
</i18n>
