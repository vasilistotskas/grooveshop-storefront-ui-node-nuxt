<script lang="ts" setup>
import * as z from 'zod'

const props = withDefaults(defineProps<{
  productId: number
  /**
   * Which ProductAlert kind this instance subscribes to. ``restock``
   * pings the shopper when stock transitions from 0 → N; ``price_drop``
   * pings them when the product's final price drops to or below their
   * ``target_price`` threshold. The two kinds are independent
   * subscriptions — a shopper can hold both for the same product.
   *
   * Typed against the auto-generated ``ProductAlertKindEnum`` from the
   * OpenAPI schema so the allowed values stay in sync with Django's
   * ``ProductAlertKind`` model enum without a local string-union drift.
   */
  kind?: ProductAlertKindEnum
  /**
   * Current product final price. Used to validate the user's
   * target_price (must be below or equal to current price, otherwise
   * the alert would fire immediately). Ignored for restock.
   */
  currentPrice?: number | null
}>(), {
  kind: 'restock',
  currentPrice: null,
})

const { t } = useI18n()
const toast = useToast()
const { loggedIn, user } = useUserSession()

const open = ref(false)
const submitting = ref(false)
const canceling = ref(false)

const isPriceDrop = computed(() => props.kind === 'price_drop')

const schema = computed(() => {
  const emailField = loggedIn.value
    ? z.email({ error: t('validation.email.valid') }).optional().or(z.literal(''))
    : z.email({ error: t('validation.email.valid') })

  const base = { email: emailField }

  if (isPriceDrop.value) {
    const cap = typeof props.currentPrice === 'number' && props.currentPrice > 0
      ? props.currentPrice
      : Number.POSITIVE_INFINITY
    return z.object({
      ...base,
      // Coerce handles the empty-string → number hop that <input
      // type="number"> sends when the user clears the field.
      targetPrice: z.coerce
        .number({ error: t('price_drop.validation.required') })
        .positive({ error: t('price_drop.validation.positive') })
        .max(cap, { error: t('price_drop.validation.below_current') }),
    })
  }

  return z.object(base)
})

const state = reactive<{ email: string, targetPrice: number | undefined }>({
  email: '',
  targetPrice: undefined,
})

// Pre-fill the email field from the authenticated session so the modal
// acts as a confirmation ("we'll email you at <x>") rather than an input.
watchEffect(() => {
  if (loggedIn.value && user.value?.email && !state.email) {
    state.email = user.value.email
  }
})

// Fetch the user's existing active alert for this product+kind so we can
// render an "alert active" state instead of letting them open the modal
// and hit the 409 (uniqueness is enforced at the DB level).
// Guests get `null` by design — we can't identify guest subscribers
// without their email, and we don't want to leak per-user info from the
// list endpoint.
const {
  data: existingAlert,
  refresh: refreshAlert,
} = await useAsyncData<ProductAlert | null>(
  `product-alert-${props.kind}:${props.productId}`,
  async () => {
    if (!loggedIn.value) return null
    try {
      const response = await $fetch('/api/products/alerts', {
        method: 'GET',
        headers: useRequestHeaders(),
        query: {
          product: props.productId,
          kind: props.kind,
          isActive: true,
          pageSize: 1,
        },
      })
      return response?.results?.[0] ?? null
    }
    catch (error) {
      log.warn('product:notify-me', 'lookup failed', { kind: props.kind, error })
      return null
    }
  },
  {
    watch: [loggedIn],
  },
)

async function onSubmit() {
  if (submitting.value) return
  submitting.value = true
  try {
    await $fetch('/api/products/alerts', {
      method: 'POST',
      body: {
        kind: props.kind,
        product: props.productId,
        // Only send an email for guest subscribers — the backend ties
        // the alert to request.user for authenticated callers and
        // stores an empty string for them.
        ...(loggedIn.value ? {} : { email: state.email }),
        ...(isPriceDrop.value ? { targetPrice: state.targetPrice } : {}),
      },
    })
    toast.add({
      title: t(`${props.kind}.success.title`),
      description: t(`${props.kind}.success.description`),
      color: 'success',
      icon: 'i-heroicons-bell-alert',
    })
    open.value = false
    await refreshAlert()
  }
  catch (error) {
    const status = (error as { statusCode?: number })?.statusCode
    const isConflict = status === 409
    log.warn('product:notify-me', 'create failed', { kind: props.kind, status, error })
    toast.add({
      title: isConflict ? t('conflict.title') : t('error.title'),
      description: isConflict ? t('conflict.description') : t('error.description'),
      color: isConflict ? 'warning' : 'error',
      icon: isConflict ? 'i-heroicons-information-circle' : 'i-heroicons-x-circle',
    })
    // Server says the alert already exists — sync our local state so the
    // UI flips to the "active" card on the next render.
    if (isConflict) {
      await refreshAlert()
    }
  }
  finally {
    submitting.value = false
  }
}

async function cancelAlert() {
  if (!existingAlert.value?.id || canceling.value) return
  canceling.value = true
  try {
    await $fetch(`/api/products/alerts/${existingAlert.value.id}`, {
      method: 'DELETE',
      headers: useRequestHeaders(),
    })
    toast.add({
      title: t('cancel_success.title'),
      description: t('cancel_success.description'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
    await refreshAlert()
  }
  catch (error) {
    log.warn('product:notify-me', 'cancel failed', { kind: props.kind, error })
    toast.add({
      title: t('cancel_error.title'),
      description: t('cancel_error.description'),
      color: 'error',
      icon: 'i-heroicons-x-circle',
    })
  }
  finally {
    canceling.value = false
  }
}
</script>

<template>
  <!-- Alert-active state (logged-in user already subscribed): skip the
       modal entirely so the user isn't asked to re-subscribe and hit a
       409. Offers an inline cancel path. -->
  <UAlert
    v-if="existingAlert"
    :title="t(`${kind}.active.title`)"
    :description="isPriceDrop && existingAlert.targetPrice != null
      ? t('price_drop.active.description_with_target', { amount: existingAlert.targetPrice })
      : t(`${kind}.active.description`)"
    color="success"
    variant="subtle"
    icon="i-heroicons-bell-alert"
    :actions="[
      {
        label: t('active.cancel'),
        color: 'neutral',
        variant: 'outline',
        loading: canceling,
        disabled: canceling,
        onClick: cancelAlert,
      },
    ]"
  />

  <!-- Default state: open the modal to create an alert. -->
  <UModal
    v-else
    v-model:open="open"
    :title="t(`${kind}.modal_title`)"
    :description="t(`${kind}.modal_description`)"
  >
    <UButton
      block
      color="secondary"
      variant="outline"
      icon="i-heroicons-bell-alert"
      size="xl"
    >
      {{ t(`${kind}.cta`) }}
    </UButton>

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          v-if="!loggedIn"
          :label="t('email_label')"
          name="email"
          required
        >
          <UInput
            v-model="state.email"
            type="email"
            inputmode="email"
            autocomplete="email"
            :placeholder="t('email_placeholder')"
            class="w-full"
          />
        </UFormField>
        <p v-else class="text-sm text-neutral-600 dark:text-neutral-300">
          {{ t('logged_in_hint', { email: state.email }) }}
        </p>

        <UFormField
          v-if="isPriceDrop"
          :label="t('price_drop.target_price_label')"
          :help="t('price_drop.target_price_help')"
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
            :placeholder="t('price_drop.target_price_placeholder')"
            class="w-full"
          >
            <template #leading>
              <span class="pl-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">€</span>
            </template>
          </UInput>
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="open = false"
          >
            {{ t('cancel') }}
          </UButton>
          <UButton
            type="submit"
            color="primary"
            :loading="submitting"
            :disabled="submitting"
            icon="i-heroicons-bell-alert"
          >
            {{ t('submit') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  # vue-i18n treats `@` as a linked-message marker, so the literal must
  # go through `{'@'}` interpolation or the compiler raises "Invalid
  # linked format (error code: 10)".
  email_label: "Email"
  email_placeholder: "you{'@'}example.com"
  logged_in_hint: "Θα στείλουμε την ειδοποίηση στο {email}."
  cancel: "Άκυρο"
  submit: "Ενεργοποίηση ειδοποίησης"
  conflict:
    title: "Έχεις ήδη ενεργή ειδοποίηση"
    description: "Η προηγούμενη εγγραφή σου ισχύει ακόμη — θα σε ειδοποιήσουμε όταν το κριτήριο ικανοποιηθεί."
  error:
    title: "Αποτυχία ενεργοποίησης"
    description: "Δοκίμασε ξανά σε λίγο ή επικοινώνησε μαζί μας."
  active:
    cancel: "Απενεργοποίηση ειδοποίησης"
  cancel_success:
    title: "Η ειδοποίηση απενεργοποιήθηκε"
    description: "Δεν θα σου στείλουμε email για αυτή την ειδοποίηση."
  cancel_error:
    title: "Αποτυχία απενεργοποίησης"
    description: "Δοκίμασε ξανά σε λίγο."
  restock:
    cta: "Ειδοποίησέ με όταν γίνει διαθέσιμο"
    modal_title: "Ειδοποίηση επαναφοράς αποθέματος"
    modal_description: "Θα σου στείλουμε email μόλις το προϊόν γίνει ξανά διαθέσιμο."
    success:
      title: "Η ειδοποίηση ενεργοποιήθηκε"
      description: "Θα σε ειδοποιήσουμε μόλις το προϊόν επιστρέψει σε απόθεμα."
    active:
      title: "Η ειδοποίηση διαθεσιμότητας είναι ενεργή"
      description: "Θα σε ειδοποιήσουμε μόλις το προϊόν γίνει ξανά διαθέσιμο."
  price_drop:
    cta: "Ειδοποίησέ με όταν πέσει η τιμή"
    modal_title: "Ειδοποίηση πτώσης τιμής"
    modal_description: "Δώσε την τιμή που σε ενδιαφέρει. Θα σου στείλουμε email όταν το προϊόν φτάσει ή πέσει κάτω από αυτή."
    target_price_label: "Επιθυμητή τιμή"
    target_price_help: "Πρέπει να είναι μικρότερη από την τρέχουσα τιμή."
    target_price_placeholder: "π.χ. 19.99"
    success:
      title: "Η ειδοποίηση τιμής ενεργοποιήθηκε"
      description: "Θα σε ειδοποιήσουμε μόλις η τιμή φτάσει στο επιθυμητό επίπεδο."
    validation:
      required: "Δώσε μια επιθυμητή τιμή."
      positive: "Η τιμή πρέπει να είναι μεγαλύτερη από 0."
      below_current: "Η επιθυμητή τιμή πρέπει να είναι μικρότερη από την τρέχουσα."
    active:
      title: "Η ειδοποίηση τιμής είναι ενεργή"
      description: "Θα σε ειδοποιήσουμε μόλις η τιμή πέσει."
      description_with_target: "Θα σε ειδοποιήσουμε μόλις η τιμή φτάσει στα {amount} € ή χαμηλότερα."
</i18n>
