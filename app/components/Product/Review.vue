<script lang="ts" setup>
import type { PropType } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * "Write a review" — the sheet a product's review button opens, for a
 * new review and for the shopper's existing one alike: a bottom sheet on
 * a phone, a dialog from `sm` up.
 *
 * The rating is five stars in half steps, which is the model's 1–10
 * scale as a reader counts it: three and a half stars is a 7. Each star
 * is 52 px, so a phone's thumb lands on one; a half is its left or right
 * side. The review has no title and no verification mark because the
 * model has neither (PLAN F5).
 *
 * Reviews are moderated: a new review starts as NEW and shows once the
 * merchant approves it, and an edit sends a published one back to
 * approval. The sheet says so before the shopper sends, and the toast
 * after says where the review stands (the status Django answers with).
 * Delete is a quiet link that asks once more.
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
    // All it reads of the product: which one the review is of, and its picture.
    type: Object as PropType<Pick<Product, 'id' | 'mainImagePath'>>,
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
})

const open = defineModel<boolean>('open')

const emit = defineEmits([
  'add-existing-review',
  'update-existing-review',
  'delete-existing-review',
])

const { t, locale } = useStoreI18n('components/Product/Review')
const toast = useToast()
const { notify } = useApiError()
const { isMobile } = useDevice()

// Nuxt resolves these literal names to the components at build time.
const UDrawer = resolveComponent('UDrawer')
const UModal = resolveComponent('UModal')

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

/** The form's fields as the shopper's existing review has them, or empty. */
const fieldsOf = (review: ProductReviewDetail | null) => ({
  comment: review ? extractTranslated(review, 'comment', locale.value) : '',
  rate: Number(review?.rate) || 0,
})

const state = reactive<Partial<Schema>>(fieldsOf(props.userProductReview))

// The sheet can open before the shopper's review has loaded (a link from a
// delivery e-mail opens it as soon as the session is known). The review
// then fills the form, unless the shopper has already started on it.
watch(() => props.userProductReview, (review) => {
  if (review && !state.comment && !state.rate) Object.assign(state, fieldsOf(review))
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

/** Big enough for a thumb, small enough for five across a 320 px sheet. */
const RATING_UI = {
  item: 'size-13',
  icon: 'size-13',
  indicator: 'data-[state=active]:text-(--ui-rating)',
  emptyIcon: 'text-(--ui-border-accented)',
}

const submitting = ref(false)
const confirmingDelete = ref(false)
const keepButton = useTemplateRef<{ $el: HTMLElement }>('keepButton')

// The dialog opens on the review as it stands, not on a half-finished
// confirmation from the last time.
watch(open, (isOpen) => {
  if (isOpen) confirmingDelete.value = false
})

// The button that was pressed leaves with the question it answers, so
// focus goes to the safe choice rather than to the page behind the sheet.
watch(confirmingDelete, async (asking) => {
  if (!asking) return
  await nextTick()
  keepButton.value?.$el.focus()
})

// The submit button sits in the footer, outside the <form>: the `form`
// attribute ties it to the form, so a click and Enter in a field are one
// native submit.
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
    log.error({ action: 'review:create', error, requestId: requestIdOf(error) })
    // A refusal for a product never bought carries the code
    // `must_have_purchased`; the reason is mapped from it, not from text.
    notify('review:create', error, { title: t('add.error') })
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
    // An edit goes back to approval; say so when it did.
    toast.add({
      title: updated.status === 'NEW' ? t('update.success_pending') : t('update.success'),
      color: 'success',
    })
    open.value = false
  }
  catch (error) {
    log.error({ action: 'review:update', error, requestId: requestIdOf(error) })
    notify('review:update', error, { title: t('update.error') })
  }
}

const deleteReview = async () => {
  const review = props.userProductReview
  if (!review) return
  submitting.value = true
  try {
    await $api(`/api/products/reviews/${review.id}`, { method: 'DELETE' })
    state.rate = 0
    state.comment = ''
    emit('delete-existing-review', review)
    toast.add({ title: t('delete.success'), color: 'success' })
    open.value = false
  }
  catch (error) {
    log.error({ action: 'review:delete', error, requestId: requestIdOf(error) })
    notify('review:delete', error, { title: t('delete.error') })
  }
  finally {
    submitting.value = false
    confirmingDelete.value = false
  }
}

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  submitting.value = true
  try {
    if (props.userHadReviewed) await updateReview(event.data)
    else await createReview(event.data)
  }
  finally {
    submitting.value = false
  }
}

const sheetUi = {
  content: 'max-h-[92dvh]',
  container: 'gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
  title: 'font-display text-xl font-bold',
  description: 'sr-only',
  body: 'flex flex-col gap-4',
  footer: 'flex-row flex-wrap items-center gap-2 border-t border-default pt-4',
}

const modalUi = {
  ...DIALOG_UI,
  content: 'max-w-140',
  description: 'sr-only',
}

const heading = computed(() => props.userHadReviewed ? t('update_review') : t('write_review'))
</script>

<template>
  <component
    :is="isMobile ? UDrawer : UModal"
    v-model:open="open"
    :title="heading"
    :description="t('description', { product: productName })"
    v-bind="isMobile ? { direction: 'bottom', handle: true } : {}"
    :ui="isMobile ? sheetUi : modalUi"
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
          <span class="size-14 shrink-0 overflow-hidden rounded-sm bg-elevated">
            <ImgWithFallback
              :src="product.mainImagePath || undefined"
              alt=""
              :width="56"
              :height="56"
              fit="cover"
              densities="x1 x2"
              class="size-full object-cover"
            />
          </span>
          <div class="flex min-w-0 flex-col items-start gap-1">
            <strong class="text-highlighted">{{ productName }}</strong>
            <ProductReviewsStatusBadge
              v-if="userProductReview"
              :status="userProductReview.status"
            />
          </div>
        </div>

        <UFormField
          :label="t('rating.label')"
          name="rate"
        >
          <div class="flex flex-col gap-1">
            <UInputRating
              v-model="stars"
              :step="0.5"
              size="xl"
              color="primary"
              icon="i-heroicons-star-solid"
              :ui="RATING_UI"
              :aria-label="t('rating.label')"
              hoverable
            />
            <!-- A reserved line, so naming the rating moves nothing. -->
            <span
              class="min-h-6 text-sm font-bold text-highlighted"
              aria-live="polite"
            >{{ rateWord }}</span>
          </div>
        </UFormField>

        <UFormField
          :label="t('comment.label')"
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

        <UAlert
          icon="i-lucide-shield-check"
          color="neutral"
          variant="subtle"
          :description="userHadReviewed ? t('moderated_edit') : t('moderated')"
        />
      </UForm>
    </template>

    <template #footer>
      <div
        v-if="confirmingDelete"
        role="group"
        :aria-label="t('delete.confirm')"
        class="flex w-full flex-wrap items-center justify-end gap-2"
      >
        <p class="me-auto text-sm font-semibold text-highlighted">
          {{ t('delete.confirm') }}
        </p>
        <UButton
          ref="keepButton"
          :label="t('delete.keep')"
          color="neutral"
          variant="outline"
          class="min-h-11"
          :disabled="submitting"
          @click="() => { confirmingDelete = false }"
        />
        <UButton
          :label="t('delete.yes')"
          color="error"
          class="min-h-11"
          :loading="submitting"
          @click="deleteReview"
        />
      </div>
      <div
        v-else
        class="flex w-full flex-wrap items-center justify-end gap-2"
      >
        <UButton
          v-if="userProductReview"
          :label="t('delete_review')"
          color="neutral"
          variant="link"
          icon="i-lucide-trash-2"
          class="min-h-11 me-auto"
          :disabled="submitting"
          @click="() => { confirmingDelete = true }"
        />
        <UButton
          :label="t('cancel')"
          color="neutral"
          variant="ghost"
          class="min-h-11"
          :disabled="submitting"
          @click="() => { open = false }"
        />
        <UButton
          :label="userHadReviewed ? t('update_review') : t('submit')"
          type="submit"
          :form="formId"
          color="secondary"
          class="min-h-11"
          :loading="submitting"
        />
      </div>
    </template>
  </component>
</template>

<i18n lang="yaml">
el:
  write_review: Γράψε μια κριτική
  update_review: Ενημέρωση κριτικής
  delete_review: Διαγραφή κριτικής
  description: Η κριτική σου για το {product}
  submit: Υποβολή κριτικής
  cancel: Άκυρο
  moderated: Οι κριτικές ελέγχονται πριν δημοσιευτούν. Η δική σου θα εμφανιστεί μόλις εγκριθεί.
  moderated_edit: Αν την αλλάξεις, η κριτική θα ελεγχθεί ξανά πριν εμφανιστεί.
  add:
    error: Η κριτική δεν δημιουργήθηκε
    success: Η κριτική σου στάλθηκε και θα εμφανιστεί μόλις εγκριθεί
  update:
    error: Η κριτική δεν ενημερώθηκε
    success: Η κριτική σου ενημερώθηκε
    success_pending: Η κριτική σου ενημερώθηκε και θα εμφανιστεί ξανά μόλις εγκριθεί
  delete:
    confirm: Να διαγραφεί η κριτική σου;
    keep: Όχι, κράτα την
    yes: Ναι, διαγραφή
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
  delete_review: Delete review
  description: Your review of {product}
  submit: Submit review
  cancel: Cancel
  moderated: Reviews are checked before they are published. Yours will appear once it is approved.
  moderated_edit: If you change it, the review is checked again before it appears.
  add:
    error: The review could not be created
    success: Your review was sent and will appear once approved
  update:
    error: The review could not be updated
    success: Your review was updated
    success_pending: Your review was updated and will appear again once approved
  delete:
    confirm: Delete your review?
    keep: No, keep it
    yes: Yes, delete
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
