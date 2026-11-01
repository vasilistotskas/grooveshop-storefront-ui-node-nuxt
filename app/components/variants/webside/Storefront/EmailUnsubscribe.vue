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
const { t, locale } = useStoreI18n('components/variants/webside/Storefront/EmailUnsubscribe')
const route = useRoute(`email-unsubscribe-token___${locale.value}`)
const localePath = useLocalePath()

useSeoMeta({
  title: () => t('title'),
})

const { phase, unsubscribing, unsubscribe } = useEmailUnsubscribe({ token: () => route.params.token })
</script>

<template>
  <WebsideAccountAreaPageWrapper class="flex flex-col gap-6">
    <WebsidePageTitle :text="t('title')" />

    <div class="mx-auto w-full max-w-xl">
      <UCard>
        <div
          v-if="phase === 'unsubscribed'"
          role="status"
          class="space-y-4 py-6 text-center"
        >
          <UIcon
            name="i-heroicons-check-circle"
            class="mx-auto size-12 text-success"
          />
          <h2 class="text-xl font-semibold">
            {{ t('unsubscribed.title') }}
          </h2>
          <p class="text-muted">
            {{ t('unsubscribed.description') }}
          </p>
          <UButton
            :to="localePath('index')"
            color="secondary"
          >
            {{ t('home') }}
          </UButton>
        </div>

        <div
          v-else-if="phase === 'invalid'"
          role="alert"
          class="space-y-4 py-6 text-center"
        >
          <UIcon
            name="i-heroicons-x-circle"
            class="mx-auto size-12 text-error"
          />
          <h2 class="text-xl font-semibold">
            {{ t('invalid.title') }}
          </h2>
          <p class="text-muted">
            {{ t('invalid.description') }}
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
            :loading="unsubscribing"
            @click="unsubscribe"
          >
            {{ t('confirm') }}
          </UButton>
        </div>
      </UCard>
    </div>
  </WebsideAccountAreaPageWrapper>
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
