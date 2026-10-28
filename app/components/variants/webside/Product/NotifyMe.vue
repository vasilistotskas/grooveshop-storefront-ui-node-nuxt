<script lang="ts" setup>
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

const { t } = useStoreI18n('components/variants/webside/Product/NotifyMe')
const { loggedIn, user } = useUserSession()

const open = ref(false)

const { schema, state, submitting, canceling, isPriceDrop, activeAlert: existingAlert, onSubmit, cancelAlert } = await useProductAlert({
  productId: () => props.productId,
  kind: () => props.kind,
  currentPrice: () => props.currentPrice,
  t,
  messages: () => ({
    created: { title: t(`${props.kind}.success.title`), description: t(`${props.kind}.success.description`), icon: 'i-heroicons-bell-alert' },
    conflict: { title: t('conflict.title'), description: t('conflict.description'), icon: 'i-heroicons-information-circle' },
    cancelled: { title: t('cancel_success.title'), description: t('cancel_success.description'), icon: 'i-heroicons-check-circle' },
    createError: { title: t('error.title'), fallback: t('error.description') },
    cancelError: { title: t('cancel_error.title'), fallback: t('cancel_error.description') },
  }),
  onCreated: () => { open.value = false },
})

// Pre-fill the email field from the authenticated session so the modal
// acts as a confirmation ("we'll email you at <x>") rather than an input.
watchEffect(() => {
  if (loggedIn.value && user.value?.email && !state.email) {
    state.email = user.value.email
  }
})
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
        @error="scrollToFirstFormError"
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
              <span class="pl-1 text-sm font-medium text-neutral-700 dark:text-neutral-200">€</span>
            </template>
          </UInput>
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="() => { open = false }"
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
en:
  email_label: "Email"
  email_placeholder: "you{'@'}example.com"
  logged_in_hint: "We will send the alert to {email}."
  cancel: "Cancel"
  submit: "Turn the alert on"
  conflict:
    title: "You already have an active alert"
    description: "Your earlier sign-up still stands — we will let you know when the condition is met."
  error:
    title: "The alert could not be turned on"
    description: "Try again shortly or get in touch with us."
  active:
    cancel: "Turn the alert off"
  cancel_success:
    title: "The alert is off"
    description: "We will not email you about this alert."
  cancel_error:
    title: "The alert could not be turned off"
    description: "Try again shortly."
  restock:
    cta: "Notify me when it is back"
    modal_title: "Back-in-stock alert"
    modal_description: "We will email you as soon as the product is available again."
    success:
      title: "The alert is on"
      description: "We will let you know as soon as the product is back in stock."
    active:
      title: "Your back-in-stock alert is on"
      description: "We will let you know as soon as the product is available again."
  price_drop:
    cta: "Notify me when the price drops"
    modal_title: "Price-drop alert"
    modal_description: "Give us the price you are after. We will email you when the product reaches it or goes below."
    target_price_label: "Target price"
    target_price_help: "It has to be lower than the current price."
    target_price_placeholder: "e.g. 19.99"
    success:
      title: "The price alert is on"
      description: "We will let you know as soon as the price reaches your target."
    validation:
      required: "Give a target price."
      positive: "The price has to be greater than 0."
      below_current: "The target price has to be lower than the current one."
    active:
      title: "Your price alert is on"
      description: "We will let you know as soon as the price drops."
      description_with_target: "We will let you know as soon as the price reaches {amount} € or lower."
</i18n>
