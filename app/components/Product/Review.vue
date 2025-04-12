<script lang="ts" setup>
import type { PropType } from 'vue'
import { Field, useForm } from 'vee-validate'
import * as z from 'zod'

import { toTypedSchema } from '@vee-validate/zod'
import { GlobalEvents } from '~/events'

const starSvg
  = '<path fill="currentColor" d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z" class=""></path>'
const starHalfSvg
  = '<path fill="currentColor" d="M288 0c-11.4 0-22.8 5.9-28.7 17.8L194 150.2 47.9 171.4c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.1 23 46 46.4 33.7L288 439.6V0z" class=""></path>'

const props = defineProps({
  userProductReview: {
    type: Object as PropType<ProductReview | null>,
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
  user: {
    type: Object as PropType<UserAccount>,
    required: true,
  },
})

const { userProductReview, userHadReviewed, product, user } = toRefs(props)
const UTextarea = resolveComponent('UTextarea')

const emit = defineEmits([
  'add-existing-review',
  'update-existing-review',
  'delete-existing-review',
])

const { t, locale } = useI18n({ useScope: 'local' })
const route = useRoute()
const toast = useToast()
const { $i18n } = useNuxtApp()

const ordering = computed(() => route.query.ordering || '-createdAt')

const { refresh } = await useLazyFetch<ProductReview[]>(
  `/api/products/${product.value?.id}/reviews`,
  {
    key: `productReviews${product.value?.id}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      ordering: ordering,
      language: locale,
    },
  },
)

const editingLocked = ref(false)
const reviewCountMax = ref(10)
const starCountMax = ref(5)
const isEditable = ref(false)
const newSelectionRatio = ref(0)
const selectedRatio = ref(0)
const ratingBoard = ref<HTMLElement | null>(null)

const reviewButtonText = computed(() => {
  if (!userHadReviewed.value) {
    return t('write_review')
  }
  return t('update_review')
})

const reviewCount = computed(() => {
  if (
    userProductReview?.value?.rate !== null
    && !isNaN(userProductReview?.value?.rate as unknown as number)
  ) {
    return Number(userProductReview?.value?.rate).toFixed(1)
  }
  return null
})

const liveReviewCountRatio = computed(() => {
  let reviewCount = 0
  if (newSelectionRatio.value > 0) {
    reviewCount = newSelectionRatio.value * reviewCountMax.value
  }
  else if (reviewCount > 0) {
    reviewCount = reviewCount - 0.01
  }
  if (reviewCount > reviewCountMax.value) reviewCount = reviewCountMax.value
  if (reviewCount < 0) reviewCount = 0
  const liveReviewCountRatio = reviewCount / reviewCountMax.value
  return Number(liveReviewCountRatio.toFixed(1)) - 0.04
})

const liveReviewCount = computed(() => {
  return Math.round(
    Number(liveReviewCountRatio.value.toFixed(2)) * reviewCountMax.value,
  )
})

const reviewScoreText = computed(() => {
  const breakpoints = [
    {
      threshold: 0.2,
      value: t('rating.bad'),
    },
    {
      threshold: 0.3,
      value: t('rating.not_that_good'),
    },
    {
      threshold: 0.5,
      value: t('rating.meh'),
    },
    {
      threshold: 0.6,
      value: t('rating.its_ok'),
    },
    {
      threshold: 0.7,
      value: t('rating.good'),
    },
    {
      threshold: 0.9,
      value: t('rating.very_good'),
    },
    {
      threshold: 1.0,
      value: t('rating.perfect'),
    },
  ]

  if (
    liveReviewCountRatio.value < 0.01
    || (newSelectionRatio.value === null
      && (reviewCount.value === null || userProductReview?.value?.rate === 0))
  ) {
    return ''
  }

  const matches = breakpoints.filter((breakpoint) => {
    return breakpoint.threshold - 0.1 <= liveReviewCountRatio.value
  })

  if (matches.length > 0) {
    return matches[matches.length - 1]?.value ?? ''
  }

  if (breakpoints.length > 0) {
    return breakpoints[0]?.value ?? ''
  }

  return ''
})

const useTimes = (n: number, iteratee: (i: number) => string) => {
  return Array.from({ length: n }, (_, i) => iteratee(i))
}

const useConstant = (value: string) => {
  return () => value
}

const foregroundStars = computed(() => {
  if (!values.rate) return []
  const reviewStarRatio = values.rate * 0.099 * starCountMax.value
  if (reviewStarRatio < 0.1) {
    return []
  }
  const stars = useTimes(Math.round(reviewStarRatio), useConstant(starSvg))
  if (reviewStarRatio % 1 < 0.5) {
    stars.push(starHalfSvg)
  }
  return stars
})

const backgroundStars = computed(() => {
  return useTimes(starCountMax.value, useConstant(starSvg)) as string[]
})

const lockSelection = (event: TouchEvent | MouseEvent) => {
  updateIsEditable(true)
  updateNewSelectionRatio(event)
  selectedRatio.value = newSelectionRatio.value
  updateIsEditable(false)
}

const reLockSelection = () => {
  updateIsEditable(false)
  newSelectionRatio.value = selectedRatio.value
}

const unlockSelection = () => {
  updateIsEditable(true)
}

const updateIsEditable = (newState: boolean) => {
  if (!editingLocked.value) {
    isEditable.value = newState
  }
}

const updateNewSelectionRatio = (event: TouchEvent | MouseEvent) => {
  if (!isEditable.value) {
    return
  }
  const target = ratingBoard.value
  if (!target) return
  let leftBound = 0
  if ('clientX' in event) {
    leftBound = event.clientX - target?.getBoundingClientRect()?.left
  }
  const rightBound
    = target?.getBoundingClientRect()?.right
      - target?.getBoundingClientRect()?.left
  newSelectionRatio.value = leftBound / rightBound
}

const modalBus = useEventBus<string>(GlobalEvents.GENERIC_MODAL)

const ZodReviewSchema = z.object({
  comment: z
    .string()
    .min(10, {
      message: $i18n.t('validation.min', {
        min: 10,
      }),
    })
    .max(1000, {
      message: $i18n.t('validation.max', {
        max: 1000,
      }),
    }),
  rate: z
    .number()
    .min(1, {
      message: $i18n.t('validation.min', { min: 1 }),
    })
    .max(10, {
      message: $i18n.t('validation.min', { max: 10 }),
    }),
})

const validationSchema = toTypedSchema(ZodReviewSchema)
const {
  defineField,
  values,
  setFieldValue,
  handleSubmit,
  errors,
  submitCount,
} = useForm({
  validationSchema,
  initialValues: {
    comment: userProductReview?.value
      ? extractTranslated(userProductReview?.value, 'comment', locale.value)
      : '',
    rate: userProductReview?.value?.rate || 0,
  },
})

const [comment, commentProps] = defineField('comment', {
  validateOnModelUpdate: true,
})
const [rate, rateProps] = defineField('rate', {
  validateOnModelUpdate: true,
})

const tooManyAttempts = computed(() => {
  return submitCount.value >= 10
})

const createReviewEvent = async (event: { comment: string, rate: number }) => {
  await $fetch<ProductReview>(`/api/products/reviews`, {
    method: 'POST',
    headers: useRequestHeaders(),
    body: {
      product: String(product.value?.id),
      user: String(user?.value?.id),
      translations: {
        [locale.value]: {
          comment: event.comment,
        },
      },
      rate: String(event.rate),
      status: ZodProductReviewStatusEnum.enum.TRUE,
    },
    async onResponse() {
      await refresh()
      emit('add-existing-review', userProductReview?.value)
      toast.add({
        title: t('add.success'),
        color: 'success',
      })
    },
    onResponseError() {
      toast.add({
        title: t('add.error'),
        color: 'error',
      })
    },
  })
}

const updateReviewEvent = async (event: { comment: string, rate: number }) => {
  if (!userProductReview?.value) return
  await $fetch<ProductReview>(`/api/products/reviews/${userProductReview?.value.id}`, {
    method: 'PUT',
    headers: useRequestHeaders(),
    body: {
      product: String(product.value?.id),
      user: String(user?.value?.id),
      rate: String(event.rate),
      translations: {
        [locale.value]: {
          comment: event.comment,
        },
      },
    },
    async onResponse({ response }) {
      if (!userProductReview?.value) return
      if (!response.ok) {
        return
      }
      await refresh()
      emit('update-existing-review', userProductReview?.value)
      toast.add({
        title: t('update.success'),
        color: 'success',
      })
    },
    onResponseError() {
      toast.add({
        title: t('update.error'),
        color: 'error',
      })
    },
  })
}

const deleteReviewEvent = async () => {
  if (user?.value && userProductReview?.value) {
    await $fetch(`/api/products/reviews/${userProductReview?.value.id}`, {
      method: 'DELETE',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        if (!userProductReview?.value) return
        if (!response.ok) {
          return
        }
        setFieldValue('rate', 0)
        setFieldValue('comment', '')
        modalBus.emit(
          `modal-close-reviewModal-${user?.value?.id}-${product?.value?.id}`,
        )
        emit('delete-existing-review', userProductReview?.value)
        await refresh()
        toast.add({
          title: t('delete.success'),
          color: 'success',
        })
      },
      onResponseError() {
        toast.add({
          title: t('delete.error'),
          color: 'error',
        })
      },
    })
  }
  else {
    toast.add({
      title: t('must_be_logged_in'),
      color: 'success',
    })
  }
}

const onSubmit = handleSubmit(async (event) => {
  if (user?.value) {
    if (!userHadReviewed.value) {
      await createReviewEvent(event)
    }
    else {
      await updateReviewEvent(event)
    }
  }
  else {
    toast.add({
      title: t('must_be_logged_in'),
      color: 'error',
    })
  }
  modalBus.emit(
    `modal-close-reviewModal-${user?.value?.id}-${product?.value?.id}`,
  )
})

const onReviewSubmit = (event: Event) => {
  onSubmit(event)
  event.preventDefault()
}

watch(
  () => liveReviewCount.value,
  (to: number | undefined) => {
    if (to !== undefined) {
      setFieldValue('rate', to)
    }
  },
)
</script>

<template>
  <LazyGenericModal
    v-if="user"
    :key="`reviewModal-${user?.id}-${product?.id}`"
    ref="reviewModal"
    :is-form="true"
    :modal-close-trigger-handler-id="`modal-close-reviewModal-${user?.id}-${product?.id}`"
    :modal-closed-trigger-handler-id="`modal-closed-reviewModal-${user?.id}-${product?.id}`"
    :modal-open-trigger-handler-id="`modal-open-reviewModal-${user?.id}-${product?.id}`"
    :modal-opened-trigger-handler-id="`modal-opened-reviewModal-${user?.id}-${product?.id}`"
    class="
      bg-primary-50 p-4

      dark:bg-primary-950

      md:p-0
    "
    exit-modal-icon-class="fa fa-times"
    form-id="reviewForm"
    form-name="reviewForm"
    gap="1rem"
    height="auto"
    max-height="100%"
    max-width="700px"
    padding="2rem"
    unique-id="reviewModal"
    width="auto"
    @submit="onSubmit"
  >
    <template #header>
      <div class="review_header">
        <span
          class="review_header-title"
          v-html="
            t('write_review_for_product', {
              product: extractTranslated(product, 'name', locale),
            })
          "
        />
        <UIcon name="i-fa-solid-pen" />
      </div>
    </template>

    <template #default>
      <div class="review_body">
        <div class="review_body-rating">
          <div class="review_body-rating-title">
            <p>{{ t('rating.title') }}</p>
          </div>
          <div class="review_body-rating-content">
            <div
              ref="ratingBoard"
              class="rating-board rating-background"
              @click="lockSelection($event)"
              @mouseenter.passive="unlockSelection()"
              @mouseleave.passive="reLockSelection()"
              @mousemove.passive="updateNewSelectionRatio($event)"
              @touchend.passive="reLockSelection()"
              @touchmove.passive="updateNewSelectionRatio($event)"
              @touchstart.passive="unlockSelection()"
            >
              <svg
                v-for="(star, i) of backgroundStars"
                :key="i"
                aria-hidden="true"
                class="star star-background"
                data-icon="star"
                data-prefix="fas"
                focusable="false"
                role="img"
                viewBox="0 0 576 512"
                xmlns="http://www.w3.org/2000/svg"
                v-html="star"
              />
            </div>
            <div class="rating-board rating-foreground">
              <svg
                v-for="(star, i) of foregroundStars"
                :key="i"
                aria-hidden="true"
                class="star star-foreground"
                focusable="false"
                role="img"
                viewBox="0 0 576 512"
                xmlns="http://www.w3.org/2000/svg"
                v-html="star"
              />
            </div>
            <span class="px-2">{{ reviewScoreText }}</span>
          </div>
          <span class="review_body-rating-error h-6">{{ errors.rate }}</span>
        </div>

        <div class="review_body-comment">
          <div class="review_body-comment-title">
            <p class="review_body-comment-title-text">
              <label for="comment">{{
                t('comment.label')
              }}</label>
            </p>
          </div>
          <div class="review_body-comment-content">
            <Field
              id="comment"
              v-model="comment"
              :as="UTextarea"
              :placeholder="t('comment.placeholder')"
              :rows="6"
              color="neutral"
              maxlength="10000"
              name="comment"
              type="text"
              v-bind="commentProps"
            />
          </div>
          <span class="review_body-rating-error h-6">{{ errors.comment }}</span>
        </div>

        <input
          v-model="rate"
          name="rate"
          type="hidden"
          v-bind="rateProps"
        >
      </div>
    </template>
    <template #footer>
      <div class="review_footer">
        <div class="review_footer-content">
          <UButton
            v-if="!tooManyAttempts"
            :label="reviewButtonText"
            block
            class="review_footer-button"
            color="neutral"
            size="lg"
            @click="onReviewSubmit"
          />
          <UButton
            v-else
            :label="$i18n.t('validation.too_many_attempts')"
            block
            color="neutral"
            disabled
            size="lg"
          />
        </div>
        <div
          v-if="userProductReview"
          class="review_footer-content"
        >
          <UButton
            :label="t('delete_review')"
            :trailing="true"
            block
            class="review_footer-button gap-2"
            color="error"
            icon="i-heroicons-trash"
            size="lg"
            @click.prevent="deleteReviewEvent()"
          />
        </div>
      </div>
    </template>
  </LazyGenericModal>
</template>

<style scoped>
.review_header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.review_header-title {
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.2;
  margin-bottom: 0;
}

.review_body {
  position: relative;
  display: grid;
}

.review_body-rating {
  display: grid;
  gap: 0.5rem;
}

.review_body-rating-title {
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.2;
  margin-bottom: 0;
}

.review_body-rating-content {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
}

.review_body-rating-error {
  color: #f56565;
  font-size: 0.875rem;
  font-weight: 400;
}

.review_body-comment {
  display: grid;
  gap: 0.5rem;
}

.review_body-comment-title {
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.2;
  margin-bottom: 0;
}

.review_body-comment-content {
  position: relative;
}

.review_footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.review_footer-content {
  display: grid;
  width: 100%;
}

.review_footer-button {
  width: 100%;
}

.rating-background {
  position: relative;
  z-index: 1;
}

.rating-foreground {
  pointer-events: none;
  position: absolute;
  z-index: 2;
}

.rating-board {
  align-content: center;
  align-items: center;
  display: inline-flex;
  flex-flow: row nowrap;
  height: 26px;
  justify-content: flex-start;
  left: 0;
  top: 0;
}

.star {
  cursor: pointer;
  height: 26px;
  width: 26px;
}

.star-foreground {
  color: #f68b24;
}

.star-background {
  color: #e2e8f0;
}
</style>

<i18n lang="yaml">
el:
  write_review: Γράψτε μια κριτική
  update_review: Ενημέρωση κριτικής
  delete_review: Διαγραφή κριτικής
  must_be_logged_in: Πρέπει να συνδεθείς για να γράψεις μία κριτική
  write_review_for_product: Γράψτε μια κριτική για το προϊόν {product}
  add:
    error: Έλεγξε το σφάλμα δημιουργίας
    success: Η κριτική δημιουργήθηκε με επιτυχία
  update:
    error: Ελέγξτε το σφάλμα ενημέρωσης
    success: Η κριτική ενημερώθηκε με επιτυχία
  delete:
    success: Η κριτική διαγράφηκε με επιτυχία
    error: Έλεγξε το σφάλμα διαγραφής
  rating:
    title: Βαθμολογία
    bad: Κακό
    not_that_good: Όχι και τόσο καλό
    meh: Meh
    its_ok: Είναι εντάξει
    good: Καλός
    very_good: Πολύ καλό
    perfect: Τέλειο!
  comment:
    placeholder: Μοιράσου την εμπειρία σου...
    label: Σχόλιο
</i18n>
