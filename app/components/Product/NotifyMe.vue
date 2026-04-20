<script lang="ts" setup>
import * as z from 'zod'

const props = defineProps<{
  productId: number
}>()

const { t } = useI18n()
const toast = useToast()
const { loggedIn, user } = useUserSession()

const open = ref(false)
const submitting = ref(false)
const canceling = ref(false)

const schema = computed(() =>
  z.object({
    email: loggedIn.value
      ? z.email({ error: t('validation.email.valid') }).optional().or(z.literal(''))
      : z.email({ error: t('validation.email.valid') }),
  }),
)

const state = reactive<{ email: string }>({
  email: '',
})

// Pre-fill the email field from the authenticated session so the modal
// acts as a confirmation ("we'll email you at <x>") rather than an input.
watchEffect(() => {
  if (loggedIn.value && user.value?.email && !state.email) {
    state.email = user.value.email
  }
})

// Fetch the user's existing active restock alert for this product so we
// can render an "alert active" state instead of letting them open the
// modal and hit the 409 (uniqueness is enforced at the DB level).
// Guests get `null` by design — we can't identify guest subscribers
// without their email, and we don't want to leak per-user info from the
// list endpoint.
const {
  data: existingAlert,
  refresh: refreshAlert,
} = await useAsyncData<ProductAlert | null>(
  `product-alert-restock:${props.productId}`,
  async () => {
    if (!loggedIn.value) return null
    try {
      const response = await $fetch('/api/products/alerts', {
        method: 'GET',
        headers: useRequestHeaders(),
        query: {
          product: props.productId,
          kind: 'restock',
          isActive: true,
          pageSize: 1,
        },
      })
      return response?.results?.[0] ?? null
    }
    catch (error) {
      log.warn('product:notify-me', 'lookup failed', { error })
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
        kind: 'restock',
        product: props.productId,
        // Only send an email for guest subscribers — the backend ties
        // the alert to request.user for authenticated callers and
        // stores an empty string for them.
        ...(loggedIn.value ? {} : { email: state.email }),
      },
    })
    toast.add({
      title: t('success.title'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-heroicons-bell-alert',
    })
    open.value = false
    await refreshAlert()
  }
  catch (error) {
    const status = (error as { statusCode?: number })?.statusCode
    const isConflict = status === 409
    log.warn('product:notify-me', 'create failed', { status, error })
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
    log.warn('product:notify-me', 'cancel failed', { error })
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
    :title="t('active.title')"
    :description="t('active.description')"
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
    :title="t('modal_title')"
    :description="t('modal_description')"
  >
    <UButton
      block
      color="secondary"
      variant="outline"
      icon="i-heroicons-bell-alert"
      size="xl"
    >
      {{ t('cta') }}
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
  cta: "Ειδοποίησέ με όταν γίνει διαθέσιμο"
  modal_title: "Ειδοποίηση επαναφοράς αποθέματος"
  modal_description: "Θα σου στείλουμε email μόλις το προϊόν γίνει ξανά διαθέσιμο."
  email_label: "Email"
  # vue-i18n treats `@` as a linked-message marker, so the literal must
  # go through `{'@'}` interpolation or the compiler raises "Invalid
  # linked format (error code: 10)".
  email_placeholder: "you{'@'}example.com"
  logged_in_hint: "Θα στείλουμε την ειδοποίηση στο {email}."
  cancel: "Άκυρο"
  submit: "Ενεργοποίηση ειδοποίησης"
  success:
    title: "Η ειδοποίηση ενεργοποιήθηκε"
    description: "Θα σε ειδοποιήσουμε μόλις το προϊόν επιστρέψει σε απόθεμα."
  conflict:
    title: "Έχεις ήδη ενεργή ειδοποίηση"
    description: "Η προηγούμενη εγγραφή σου ισχύει ακόμη — θα σε ειδοποιήσουμε μόλις γίνει διαθέσιμο."
  error:
    title: "Αποτυχία ενεργοποίησης"
    description: "Δοκίμασε ξανά σε λίγο ή επικοινώνησε μαζί μας."
  active:
    title: "Η ειδοποίηση είναι ενεργή"
    description: "Θα σε ειδοποιήσουμε μόλις το προϊόν γίνει ξανά διαθέσιμο."
    cancel: "Απενεργοποίηση ειδοποίησης"
  cancel_success:
    title: "Η ειδοποίηση απενεργοποιήθηκε"
    description: "Δεν θα σου στείλουμε email για αυτό το προϊόν."
  cancel_error:
    title: "Αποτυχία απενεργοποίησης"
    description: "Δοκίμασε ξανά σε λίγο."
</i18n>
