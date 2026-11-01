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

const { phase, scope, pending, unsubscribe } = useEmailUnsubscribe({ token: () => route.params.token })
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
            {{ t(`unsubscribed.${scope}.title`) }}
          </h2>
          <p class="text-muted">
            {{ t(`unsubscribed.${scope}.description`) }}
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
          <div class="flex flex-col items-center gap-3">
            <UButton
              color="secondary"
              size="lg"
              :loading="pending === 'type'"
              :disabled="pending === 'all'"
              @click="() => unsubscribe('type')"
            >
              {{ t('unsubscribeType') }}
            </UButton>
            <UButton
              color="secondary"
              variant="link"
              :loading="pending === 'all'"
              :disabled="pending === 'type'"
              @click="() => unsubscribe('all')"
            >
              {{ t('unsubscribeAll') }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </WebsideAccountAreaPageWrapper>
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
