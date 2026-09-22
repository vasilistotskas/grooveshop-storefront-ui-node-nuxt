<script lang="ts" setup>
/**
 * The newsletter band.
 *
 * KNOWN GAP, and the reason this is not a plain email form: the API has
 * no anonymous subscribe. `UserSubscription` hangs off a user row and
 * `SubscriptionTopicViewSet` requires authentication, so a visitor with
 * no account cannot be subscribed at all — only the CONFIRM and
 * UNSUBSCRIBE halves are tokenised and public. The previous section
 * rendered an email input and a button wired to nothing, which asked
 * for an address and dropped it.
 *
 * So the band offers what the store can honour: a signed-in shopper
 * goes to their subscription preferences, and everyone else is invited
 * to create an account. Give this a real form the day an anonymous
 * subscriber exists in the data model.
 *
 * Laid out as a STATEMENT — the promise on the left, the one action on
 * the right — like `cta_banner`, so the two conversion bands read as
 * the same kind of thing and neither is a centred icon over a heading.
 */
withDefaults(defineProps<{
  title?: string
  heading?: string
  description?: string
  placeholder?: string
  buttonText?: string
  surface?: 'default' | 'muted'
}>(), {
  surface: 'muted',
})

const { t } = useI18n()
const localePath = useLocalePath()
const { loggedIn } = useUserSession()

const newsletterEnabled = useSettingFlag('NEWSLETTER_ENABLED', {
  fallback: true,
})
</script>

<template>
  <PageSectionBand
    v-if="newsletterEnabled"
    :surface="surface"
  >
    <template #header>
      <div
        class="
          flex flex-col gap-5
          md:flex-row md:items-center md:justify-between md:gap-10
        "
      >
        <div class="flex max-w-2xl flex-col gap-2">
          <h2
            class="
              font-display text-2xl font-semibold tracking-tight
              text-highlighted text-balance
              md:text-3xl
            "
          >
            {{ heading || title || t('heading') }}
          </h2>
          <p class="text-base text-pretty text-muted md:text-lg">
            {{ description || t('description') }}
          </p>
        </div>

        <ClientOnly>
          <UButton
            :to="localePath(loggedIn ? '/account/subscriptions' : '/account/signup')"
            :label="buttonText || (loggedIn ? t('manage') : t('join'))"
            color="secondary"
            size="xl"
            trailing-icon="i-heroicons-arrow-right"
            class="shrink-0 self-start md:self-auto"
          />

          <!-- SSR renders the signed-out invitation: the cached anonymous
               page is what an unknown visitor gets, and it is also the
               right default for a crawler. -->
          <template #fallback>
            <UButton
              :to="localePath('/account/signup')"
              :label="buttonText || t('join')"
              color="secondary"
              size="xl"
              trailing-icon="i-heroicons-arrow-right"
              class="shrink-0 self-start md:self-auto"
            />
          </template>
        </ClientOnly>
      </div>
    </template>
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  heading: Μείνε ενημερωμένος
  description: Νέα προϊόντα και προσφορές, χωρίς θόρυβο.
  join: Δημιουργία λογαριασμού
  manage: Οι εγγραφές μου
en:
  heading: Stay in the loop
  description: New products and offers, without the noise.
  join: Create an account
  manage: My subscriptions
</i18n>
