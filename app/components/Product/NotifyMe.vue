<script lang="ts" setup>
import * as z from 'zod'

/**
 * "Notify me" — the one dialog for a product's alerts, opened from the
 * product page (its stock line and its "Price-drop alert" button) and
 * from a sold-out product card.
 *
 * The shopper picks the kind when both apply: "Back in stock" while the
 * product is sold out, "Price drops" when the merchant offers price
 * alerts on it. The two are independent subscriptions; Django holds one
 * active alert per kind, sends one email and switches it off.
 *
 * A signed-in shopper's active alert of the chosen kind replaces the
 * form with what is set and a way to turn it off, so they are never
 * asked to subscribe again into a 409. Guests are not looked up — they
 * cannot be identified before they give an email.
 *
 * The parent mounts this on the first open, so the lookup happens only
 * for a shopper who asked.
 */
const props = withDefaults(defineProps<{
  productId: number
  productName: string
  productImage?: string | null
  /** Sold out: the restock alert is on offer. */
  soldOut: boolean
  /** The merchant offers price-drop alerts on this product. */
  priceDrop: boolean
  /** The price the shopper pays now; a target must be below it. */
  currentPrice?: number | null
}>(), {
  productImage: null,
  currentPrice: null,
})

const open = defineModel<boolean>('open', { required: true })
const kind = defineModel<ProductAlertKindEnum>('kind', { required: true })

const { t, n } = useI18n()
const toast = useToast()
const { loggedIn, user } = useUserSession()

const submitting = ref(false)
const canceling = ref(false)

const kinds = computed(() => [
  ...(props.soldOut ? [{ value: 'restock' as const, label: t('restock.option') }] : []),
  ...(props.priceDrop ? [{ value: 'price_drop' as const, label: t('price_drop.option') }] : []),
])
const isPriceDrop = computed(() => kind.value === 'price_drop')

const schema = computed(() => {
  const email = loggedIn.value
    ? z.email({ error: t('validation.email.valid') }).optional().or(z.literal(''))
    : z.email({ error: t('validation.email.valid') })
  if (!isPriceDrop.value) return z.object({ email })

  const cap = typeof props.currentPrice === 'number' && props.currentPrice > 0
    ? props.currentPrice
    : Number.POSITIVE_INFINITY
  return z.object({
    email,
    // Coerce handles the empty-string → number hop that <input
    // type="number"> sends when the user clears the field.
    targetPrice: z.coerce
      .number({ error: t('price_drop.validation.required') })
      .positive({ error: t('price_drop.validation.positive') })
      .max(cap, { error: t('price_drop.validation.below_current') }),
  })
})

const state = reactive<{ email: string, targetPrice: number | undefined }>({
  email: '',
  targetPrice: undefined,
})

const { data: activeAlerts, refresh: refreshAlerts } = await useAsyncData<ProductAlert[]>(
  `product-alerts:${props.productId}`,
  async () => {
    if (!loggedIn.value) return []
    try {
      const response = await $api('/api/products/alerts', {
        method: 'GET',
        query: { product: props.productId, isActive: true, pageSize: 2 },
      })
      return response?.results ?? []
    }
    catch (error) {
      log.warn({ tag: 'product:notify-me', message: 'lookup failed', error })
      return []
    }
  },
  { watch: [loggedIn], default: () => [] },
)

const activeAlert = computed(() => activeAlerts.value.find(alert => alert.kind === kind.value))

async function onSubmit() {
  if (submitting.value) return
  submitting.value = true
  try {
    await $api('/api/products/alerts', {
      method: 'POST',
      body: {
        kind: kind.value,
        product: props.productId,
        // Only a guest sends an email — Django ties a signed-in
        // shopper's alert to their account.
        ...(loggedIn.value ? {} : { email: state.email }),
        ...(isPriceDrop.value ? { targetPrice: state.targetPrice } : {}),
      },
    })
    toast.add({
      title: t(`${kind.value}.success`),
      color: 'success',
      icon: 'i-lucide-bell-ring',
    })
    open.value = false
    await refreshAlerts()
  }
  catch (error) {
    const status = (error as { statusCode?: number })?.statusCode
    const isConflict = status === 409
    log.warn({ tag: 'product:notify-me', message: 'create failed', kind: kind.value, status, error })
    toast.add({
      title: isConflict ? t('conflict') : t('error'),
      color: isConflict ? 'warning' : 'error',
    })
    // Django says the alert exists — read it so the dialog shows it.
    if (isConflict) await refreshAlerts()
  }
  finally {
    submitting.value = false
  }
}

async function cancelAlert() {
  const alert = activeAlert.value
  if (!alert || canceling.value) return
  canceling.value = true
  try {
    await $api(`/api/products/alerts/${alert.id}`, { method: 'DELETE' })
    toast.add({ title: t('cancel_success'), color: 'success' })
    await refreshAlerts()
  }
  catch (error) {
    log.warn({ tag: 'product:notify-me', message: 'cancel failed', kind: kind.value, error })
    toast.add({ title: t('cancel_error'), color: 'error' })
  }
  finally {
    canceling.value = false
  }
}

// The submit button sits in the dialog's footer, outside the <form>: the
// `form` attribute ties it to the form, so a click and Enter in a field
// are one native submit.
const formId = useId()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('title')"
    :description="t('description')"
    :ui="{ ...DIALOG_UI,
           content: `
             ${DIALOG_UI.content}
             max-w-120
           `,
           description: `sr-only` }"
  >
    <template #body>
      <div class="flex flex-col gap-4.5">
        <div class="flex items-center gap-3">
          <span class="size-14 shrink-0 overflow-hidden rounded-[0.875rem] bg-elevated">
            <ImgWithFallback
              :src="productImage ?? undefined"
              alt=""
              :width="56"
              :height="56"
              fit="cover"
              densities="x1 x2"
              quality="75"
              class="size-full object-cover"
              :class="soldOut && 'opacity-60'"
            />
          </span>
          <span class="flex min-w-0 flex-col items-start gap-1">
            <strong class="text-highlighted">{{ productName }}</strong>
            <UBadge
              v-if="soldOut"
              :label="t('sold_out')"
              color="neutral"
              variant="soft"
            />
          </span>
        </div>

        <URadioGroup
          v-if="kinds.length > 1"
          v-model="kind"
          :items="kinds"
          :legend="t('kind')"
          variant="card"
          orientation="horizontal"
          :ui="{
            legend: 'sr-only',
            fieldset: 'grid grid-cols-2 gap-2.5',
            label: 'text-sm font-bold text-highlighted',
          }"
        />

        <template v-if="activeAlert">
          <UAlert
            :title="t(`${kind}.active`)"
            :description="isPriceDrop && activeAlert.targetPrice != null
              ? t('price_drop.active_target', { amount: n(Number(activeAlert.targetPrice), 'currency') })
              : undefined"
            color="success"
            variant="soft"
            icon="i-lucide-bell-ring"
          />
        </template>

        <UForm
          v-else
          :id="formId"
          :schema="schema"
          :state="state"
          class="flex flex-col gap-4.5"
          @error="scrollToFirstFormError"
          @submit="onSubmit"
        >
          <UFormField
            v-if="!loggedIn"
            :label="t('email')"
            name="email"
            :help="t('one_email')"
            required
          >
            <UInput
              v-model="state.email"
              type="email"
              inputmode="email"
              autocomplete="email"
              icon="i-lucide-mail"
              :placeholder="t('email_placeholder')"
              class="w-full"
            />
          </UFormField>
          <p
            v-else
            class="text-sm text-muted"
          >
            {{ t('signed_in', { email: user?.email ?? '' }) }} {{ t('one_email') }}
          </p>

          <UFormField
            v-if="isPriceDrop"
            :label="t('price_drop.target')"
            :help="currentPrice ? t('price_drop.target_help', { amount: n(currentPrice, 'currency') }) : undefined"
            name="targetPrice"
            required
          >
            <UInput
              v-model="state.targetPrice"
              type="number"
              inputmode="decimal"
              step="0.01"
              min="0"
              :max="currentPrice ?? undefined"
              icon="i-lucide-euro"
              class="w-full"
            />
          </UFormField>
        </UForm>
      </div>
    </template>

    <template #footer>
      <template v-if="activeAlert">
        <UButton
          :label="t('close')"
          color="neutral"
          variant="ghost"
          @click="() => { open = false }"
        />
        <UButton
          :label="t('turn_off')"
          color="neutral"
          variant="outline"
          :loading="canceling"
          @click="cancelAlert"
        />
      </template>
      <template v-else>
        <UButton
          :label="t('cancel')"
          color="neutral"
          variant="ghost"
          :disabled="submitting"
          @click="() => { open = false }"
        />
        <UButton
          :label="t('create')"
          icon="i-lucide-bell"
          :loading="submitting"
          type="submit"
          :form="formId"
        />
      </template>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  title: Ειδοποίησέ με
  description: Θα σου στείλουμε email για αυτό το προϊόν.
  kind: Τύπος ειδοποίησης
  sold_out: Εξαντλήθηκε
  # vue-i18n treats `@` as a linked-message marker, so the literal must
  # go through `{'@'}` interpolation or the compiler raises "Invalid
  # linked format (error code: 10)".
  email: Email
  email_placeholder: "you{'@'}example.com"
  signed_in: Θα στείλουμε την ειδοποίηση στο {email}.
  one_email: Ένα email, και μετά η ειδοποίηση απενεργοποιείται.
  cancel: Άκυρο
  close: Κλείσιμο
  create: Δημιουργία ειδοποίησης
  turn_off: Απενεργοποίηση ειδοποίησης
  conflict: Έχεις ήδη ενεργή ειδοποίηση για αυτό
  error: Η ειδοποίηση δεν δημιουργήθηκε. Δοκίμασε ξανά σε λίγο.
  cancel_success: Η ειδοποίηση απενεργοποιήθηκε
  cancel_error: Η ειδοποίηση δεν απενεργοποιήθηκε. Δοκίμασε ξανά σε λίγο.
  restock:
    option: Επαναφορά αποθέματος
    success: Θα σε ειδοποιήσουμε μόλις είναι ξανά διαθέσιμο
    active: Η ειδοποίηση διαθεσιμότητας είναι ενεργή
  price_drop:
    option: Πτώση τιμής
    success: Θα σε ειδοποιήσουμε μόλις πέσει η τιμή
    active: Η ειδοποίηση τιμής είναι ενεργή
    active_target: Θα σε ειδοποιήσουμε μόλις φτάσει στα {amount} ή χαμηλότερα.
    target: Επιθυμητή τιμή
    target_help: Κάτω από τη σημερινή τιμή, {amount}.
    validation:
      required: Δώσε μια επιθυμητή τιμή.
      positive: Η τιμή πρέπει να είναι μεγαλύτερη από 0.
      below_current: Η επιθυμητή τιμή πρέπει να είναι κάτω από τη σημερινή.
en:
  title: Notify me
  description: We will email you about this product.
  kind: Alert type
  sold_out: Sold out
  email: Email
  email_placeholder: "you{'@'}example.com"
  signed_in: We will send the alert to {email}.
  one_email: One email, then the alert switches off.
  cancel: Cancel
  close: Close
  create: Create alert
  turn_off: Turn the alert off
  conflict: You already have an active alert for this
  error: The alert could not be created. Try again shortly.
  cancel_success: The alert is off
  cancel_error: The alert could not be turned off. Try again shortly.
  restock:
    option: Back in stock
    success: We will let you know as soon as it is back
    active: Your back-in-stock alert is on
  price_drop:
    option: Price drops
    success: We will let you know as soon as the price drops
    active: Your price alert is on
    active_target: We will let you know when it reaches {amount} or less.
    target: Target price
    target_help: Below today's price, {amount}.
    validation:
      required: Give a target price.
      positive: The price has to be greater than 0.
      below_current: The target price has to be below today's.
</i18n>
