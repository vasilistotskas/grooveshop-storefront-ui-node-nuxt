<script lang="ts" setup>
import type { PropType } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * "Write a review" — the dialog the product page's review button opens,
 * for a new review and for the shopper's existing one alike.
 *
 * The rating is five stars in half steps, which is the model's 1–10
 * scale as a reader counts it: three and a half stars is a 7. The
 * review has no title and no verification mark because the model has
 * neither (PLAN F5). Reviews are moderated — they start as NEW and show
 * once the merchant approves them — so the dialog says so.
 */
const props = defineProps({
  userProductReview: {
    // The `user-product-review` endpoint returns the *detail* shape
    // (``product`` embedded as the full ``Product`` object with nested
    // translations), not the list-serializer ``ProductReview`` shape.
    // This component never reads ``.product`` off the review, so the
    // wider type is purely to match what callers fetch and pass in.
    type: Object as PropType<ProductReviewDetail | null>,
    required: false,
    default: null,
  },
  userHadReviewed: {
    type: Boolean as PropType<boolean | null>,
    required: false,
    default: null,
  },
  product: {
    type: Object as PropType<Product>,
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  user: {
    type: Object as PropType<UserDetails>,
    required: true,
  },
})

const open = defineModel<boolean>('open')

const emit = defineEmits([
  'add-existing-review',
  'update-existing-review',
  'delete-existing-review',
])

const { t, locale } = useI18n()
const toast = useToast()

const schema = z.object({
  comment: z
    .string()
    .min(10, { error: t('validation.min', { min: 10 }) })
    .max(1000, { error: t('validation.max', { max: 1000 }) }),
  // The model's 1..10; 0 is "not rated yet".
  rate: z
    .number()
    .min(1, { error: t('validation.required') })
    .max(10, { error: t('validation.max_value', { max: 10 }) }),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  comment: props.userProductReview
    ? extractTranslated(props.userProductReview, 'comment', locale.value)
    : '',
  rate: Number(props.userProductReview?.rate) || 0,
})

/** Stars as the shopper sets them; the model stores twice that. */
const stars = computed({
  get: () => (state.rate ?? 0) / 2,
  set: (value: number) => { state.rate = Math.round(value * 2) },
})

const RATE_WORDS = ['bad', 'bad', 'poor', 'poor', 'fair', 'fair', 'good', 'good', 'very_good', 'perfect'] as const
const rateWord = computed(() => {
  const rate = state.rate ?? 0
  return rate > 0 ? t(`rating.${RATE_WORDS[rate - 1]}`) : ''
})

// The submit button sits in the dialog's footer, outside the <form>: the
// `form` attribute ties it to the form, so a click and Enter in a field
// are one native submit.
const formId = useId()

/** The review body Django takes for a create and an update alike. */
const reviewBody = (event: Schema) => ({
  product: props.product.id,
  translations: {
    [locale.value]: {
      comment: event.comment,
    },
  },
  rate: event.rate,
})

/** Django refuses a review of a product the customer never bought. */
const isPurchaseRequired = (error: unknown) => {
  const body = (error as { data?: { product?: unknown, data?: { product?: unknown } } }).data
  const productError = body?.data?.product ?? body?.product
  return productError === 'must_have_purchased'
    || (Array.isArray(productError) && productError.includes('must_have_purchased'))
}

const createReview = async (event: Schema) => {
  try {
    const created = await $api('/api/products/reviews', {
      method: 'POST',
      body: reviewBody(event),
    })
    emit('add-existing-review', created)
    toast.add({ title: t('add.success'), color: 'success' })
    open.value = false
  }
  catch (error) {
    log.error({ action: 'review:create', error })
    toast.add({
      title: isPurchaseRequired(error) ? t('add.must_purchase_first') : t('add.error'),
      color: 'error',
    })
  }
}

const updateReview = async (event: Schema) => {
  if (!props.userProductReview) return
  try {
    const updated = await $api(`/api/products/reviews/${props.userProductReview.id}`, {
      method: 'PUT',
      body: reviewBody(event),
    })
    emit('update-existing-review', updated)
    toast.add({ title: t('update.success'), color: 'success' })
    open.value = false
  }
  catch (error) {
    log.error({ action: 'review:update', error })
    toast.add({ title: t('update.error'), color: 'error' })
  }
}

const deleteReview = async () => {
  const review = props.userProductReview
  if (!review) return
  try {
    await $api(`/api/products/reviews/${review.id}`, { method: 'DELETE' })
    state.rate = 0
    state.comment = ''
    emit('delete-existing-review', review)
    toast.add({ title: t('delete.success'), color: 'success' })
    open.value = false
  }
  catch (error) {
    log.error({ action: 'review:delete', error })
    toast.add({ title: t('delete.error'), color: 'error' })
  }
}

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  if (props.userHadReviewed) await updateReview(event.data)
  else await createReview(event.data)
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="userHadReviewed ? t('update_review') : t('write_review')"
    :description="t('description', { product: productName })"
    :ui="{ ...DIALOG_UI,
           content: `
             ${DIALOG_UI.content}
             max-w-140
           `,
           description: `sr-only` }"
  >
    <template #body>
      <UForm
        :id="formId"
        :schema="schema"
        :state="state"
        class="flex flex-col gap-4.5"
        @error="scrollToFirstFormError"
        @submit="onSubmit"
      >
        <div class="flex items-center gap-3">
          <span class="size-14 shrink-0 overflow-hidden rounded-[0.875rem] bg-elevated">
            <ImgWithFallback
              :src="product.mainImagePath || undefined"
              alt=""
              :width="56"
              :height="56"
              fit="cover"
              densities="x1 x2"
              quality="75"
              class="size-full object-cover"
            />
          </span>
          <strong class="text-highlighted">{{ productName }}</strong>
        </div>

        <UFormField
          :label="t('rating.label')"
          name="rate"
        >
          <div class="flex items-center gap-3">
            <UInputRating
              v-model="stars"
              :step="0.5"
              size="xl"
              color="primary"
              icon="i-heroicons-star-solid"
              :ui="{ emptyIcon: 'text-(--ui-border-accented)' }"
              hoverable
            />
            <span
              class="text-sm font-bold text-highlighted"
              aria-live="polite"
            >{{ rateWord }}</span>
          </div>
        </UFormField>

        <UFormField
          :label="t('comment.label')"
          :help="t('moderated')"
          name="comment"
        >
          <UTextarea
            v-model="state.comment"
            :placeholder="t('comment.placeholder')"
            :rows="5"
            maxlength="1000"
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <UButton
        v-if="userProductReview"
        :label="t('delete_review')"
        color="error"
        variant="ghost"
        icon="i-lucide-trash-2"
        class="me-auto"
        @click="deleteReview"
      />
      <UButton
        :label="t('cancel')"
        color="neutral"
        variant="ghost"
        @click="() => { open = false }"
      />
      <UButton
        :label="userHadReviewed ? t('update_review') : t('submit')"
        type="submit"
        :form="formId"
      />
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  write_review: Γράψε μια κριτική
  update_review: Ενημέρωση κριτικής
  delete_review: Διαγραφή
  description: Η κριτική σου για το {product}
  submit: Υποβολή κριτικής
  cancel: Άκυρο
  moderated: Οι κριτικές ελέγχονται πριν εμφανιστούν.
  add:
    error: Η κριτική δεν δημιουργήθηκε
    must_purchase_first: Μπορείς να γράψεις κριτική μόνο για προϊόντα που έχεις αγοράσει
    success: Η κριτική σου στάλθηκε και θα εμφανιστεί μόλις εγκριθεί
  update:
    error: Η κριτική δεν ενημερώθηκε
    success: Η κριτική σου ενημερώθηκε
  delete:
    success: Η κριτική σου διαγράφηκε
    error: Η κριτική δεν διαγράφηκε
  rating:
    label: Η βαθμολογία σου
    bad: Κακό
    poor: Όχι και τόσο καλό
    fair: Εντάξει
    good: Καλό
    very_good: Πολύ καλό
    perfect: Τέλειο
  comment:
    label: Η κριτική σου
    placeholder: Τι σου άρεσε, τι όχι;
en:
  write_review: Write a review
  update_review: Update your review
  delete_review: Delete
  description: Your review of {product}
  submit: Submit review
  cancel: Cancel
  moderated: Reviews are checked before they appear.
  add:
    error: The review could not be created
    must_purchase_first: You can only review products you have bought
    success: Your review was sent and will appear once approved
  update:
    error: The review could not be updated
    success: Your review was updated
  delete:
    success: Your review was deleted
    error: The review could not be deleted
  rating:
    label: Your rating
    bad: Bad
    poor: Not that good
    fair: Fair
    good: Good
    very_good: Very good
    perfect: Perfect
  comment:
    label: Your review
    placeholder: What did you like, what not?
</i18n>
