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
const { t, locale } = useStoreI18n('components/Storefront/ProductAlertConfirm')
const route = useRoute(`alerts-confirm-token___${locale.value}`)
const localePath = useLocalePath()

useSeoMeta({
  title: () => t('title'),
})

const { phase, confirming, kind, confirm: confirmAlert } = useProductAlertConfirm({ token: () => route.params.token })

async function confirm() {
  await confirmAlert()
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
      <!-- The tile is lime while the news is good and neutral while it is
           not, so the state reads before the words do. -->
      <span
        class="flex size-16 items-center justify-center rounded-2xl"
        :class="phase === 'expired' || phase === 'invalid' ? 'bg-elevated text-highlighted' : 'bg-volt text-on-volt'"
      >
        <UIcon
          :name="phase === 'expired' || phase === 'invalid' ? 'i-lucide-bell-off' : phase === 'confirmed' ? 'i-lucide-bell-ring' : 'i-lucide-bell'"
          class="size-7"
          aria-hidden="true"
        />
      </span>

      <template v-if="phase === 'confirmed'">
        <div
          role="status"
          class="flex flex-col gap-3"
        >
          <h1 ref="heading" tabindex="-1" class="font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em] text-highlighted sm:text-[2.25rem]/[1.1]">
            {{ t('confirmed.title') }}
          </h1>
          <p class="text-toned">
            {{ t(`confirmed.${kind}`) }}
          </p>
        </div>
        <UButton
          :to="localePath('products')"
          color="neutral"
          size="lg"
          class="rounded-full"
        >
          {{ t('shop') }}
        </UButton>
      </template>

      <template v-else-if="phase === 'expired' || phase === 'invalid'">
        <div
          role="alert"
          class="flex flex-col gap-3"
        >
          <h1 ref="heading" tabindex="-1" class="font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em] text-highlighted sm:text-[2.25rem]/[1.1]">
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
