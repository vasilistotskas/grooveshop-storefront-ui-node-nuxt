<script lang="ts" setup>
/**
 * The page a product alert confirmation email links to (a guest's
 * "notify me").
 *
 * Opening the link starts NOTHING: mail providers and link scanners
 * prefetch URLs in messages, and a GET that confirmed would subscribe
 * people who never clicked. The visitor presses the button, which
 * POSTs the token (`server/api/products/alerts/confirm/[token].post.ts`).
 * Django then answers 200 (the alert has started, of a `kind`), 410 (the
 * week-long link has expired) or 400 (unknown, or the alert is no longer pending).
 */
const { t, locale } = useStoreI18n('components/variants/webside/Storefront/ProductAlertConfirm')
const route = useRoute(`alerts-confirm-token___${locale.value}`)
const localePath = useLocalePath()

useSeoMeta({
  title: () => t('title'),
})

const { phase, confirming, kind, confirm } = useProductAlertConfirm({ token: () => route.params.token })
</script>

<template>
  <WebsideAccountAreaPageWrapper class="flex flex-col gap-6">
    <WebsidePageTitle :text="t('title')" />

    <div class="mx-auto w-full max-w-xl">
      <UCard>
        <div
          v-if="phase === 'confirmed'"
          role="status"
          class="space-y-4 py-6 text-center"
        >
          <UIcon
            name="i-heroicons-bell-alert"
            class="mx-auto size-12 text-success"
          />
          <h2 class="text-xl font-semibold">
            {{ t('confirmed.title') }}
          </h2>
          <p class="text-muted">
            {{ t(`confirmed.${kind}`) }}
          </p>
          <UButton
            :to="localePath('products')"
            color="secondary"
          >
            {{ t('shop') }}
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
            name="i-heroicons-bell"
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
  </WebsideAccountAreaPageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επιβεβαίωση ειδοποίησης
  prompt: Πάτησε το κουμπί για να ξεκινήσει η ειδοποίησή σου για το προϊόν.
  confirm: Επιβεβαίωση ειδοποίησης
  failed: Η επιβεβαίωση δεν ολοκληρώθηκε. Δοκίμασε ξανά σε λίγο.
  home: Στην αρχική
  shop: Συνέχισε τις αγορές
  confirmed:
    title: Η ειδοποίησή σου ξεκίνησε
    restock: Θα σου στείλουμε email μόλις το προϊόν γίνει ξανά διαθέσιμο.
    price_drop: Θα σου στείλουμε email μόλις η τιμή του πέσει στην τιμή που όρισες.
  expired:
    title: Ο σύνδεσμος έληξε
    description: Οι σύνδεσμοι επιβεβαίωσης ισχύουν μία εβδομάδα. Ζήτησε ξανά την ειδοποίηση από τη σελίδα του προϊόντος για να λάβεις νέο.
  invalid:
    title: Μη έγκυρος σύνδεσμος
    description: Ο σύνδεσμος δεν είναι έγκυρος ή έχει ήδη χρησιμοποιηθεί.
en:
  title: Confirm your alert
  prompt: Press the button to start your alert for the product.
  confirm: Confirm alert
  failed: The confirmation did not go through. Please try again shortly.
  home: Back to the homepage
  shop: Continue shopping
  confirmed:
    title: Your alert has started
    restock: We will email you as soon as the product is back in stock.
    price_drop: We will email you as soon as its price drops to your target.
  expired:
    title: This link has expired
    description: Confirmation links are valid for a week. Ask for the alert again from the product page to get a new one.
  invalid:
    title: Invalid link
    description: This link is not valid or has already been used.
</i18n>
