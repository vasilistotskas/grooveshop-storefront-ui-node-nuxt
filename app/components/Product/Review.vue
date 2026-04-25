<script lang="ts" setup>
import type { PropType } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

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
    type: Object as PropType<UserDetails>,
    required: true,
  },
})

const { userProductReview, userHadReviewed, product, user } = toRefs(props)

const isReviewModalOpen = defineModel<boolean>()

const emit = defineEmits([
  'add-existing-review',
  'update-existing-review',
  'delete-existing-review',
])

const { t, locale } = useI18n()
const route = useRoute()
const toast = useToast()
const { isMobileOrTablet } = useDevice()

const ordering = computed(() => route.query.ordering || '-createdAt')

const { refresh } = useLazyFetch(
  `/api/products/${product.value?.id}/reviews`,
  {
    key: `productReviews${product.value?.id}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      ordering: ordering,
      languageCode: locale,
    },
  },
)

const editingLocked = ref(false)
const reviewCountMax = 10
const starCountMax = 5
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
  let count = 0
  if (newSelectionRatio.value > 0) {
    count = newSelectionRatio.value * reviewCountMax
  }
  else if (reviewCount.value && Number(reviewCount.value) > 0) {
    count = Number(reviewCount.value) - 0.01
  }
  if (count > reviewCountMax) count = reviewCountMax
  if (count < 0) count = 0
  const ratio = count / reviewCountMax
  return Number(ratio.toFixed(1)) - 0.04
})

const liveReviewCount = computed(() => {
  return Math.round(
    Number(liveReviewCountRatio.value.toFixed(2)) * reviewCountMax,
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
      && (reviewCount.value === null || !userProductReview?.value?.rate))
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

const schema = z.object({
  comment: z
    .string()
    .min(10, {
      error: t('validation.min', {
        min: 10,
      }),
    })
    .max(1000, {
      error: t('validation.max', {
        max: 1000,
      }),
    }),
  rate: z
    .number()
    .min(1, {
      error: t('validation.min', { min: 1 }),
    })
    .max(10, {
      error: t('validation.min', { max: 10 }),
    }),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  comment: userProductReview?.value
    ? extractTranslated(userProductReview?.value, 'comment', locale.value)
    : '',
  rate: Number(userProductReview?.value?.rate) || 0,
})

const formRef = useTemplateRef('formRef')

const foregroundStars = computed(() => {
  if (!state.rate) return []
  const reviewStarRatio = state.rate * 0.099 * starCountMax
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
  return useTimes(starCountMax, useConstant(starSvg)) as string[]
})

const onRatingKeydown = (event: KeyboardEvent) => {
  let newRate = state.rate ?? 0
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      event.preventDefault()
      newRate = Math.min(reviewCountMax, newRate + 1)
      break
    case 'ArrowLeft':
    case 'ArrowDown':
      event.preventDefault()
      newRate = Math.max(0, newRate - 1)
      break
    case 'PageUp':
      event.preventDefault()
      newRate = Math.min(reviewCountMax, newRate + 2)
      break
    case 'PageDown':
      event.preventDefault()
      newRate = Math.max(0, newRate - 2)
      break
    case 'Home':
      event.preventDefault()
      newRate = 0
      break
    case 'End':
      event.preventDefault()
      newRate = reviewCountMax
      break
    default:
      return
  }
  state.rate = newRate
}

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

const createReviewEvent = async (event: Schema) => {
  await $fetch(`/api/products/reviews`, {
    method: 'POST',
    body: {
      product: product.value?.id,
      translations: {
        [locale.value]: {
          comment: event.comment,
        },
      },
      rate: event.rate,
    },
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
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

const updateReviewEvent = async (event: Schema) => {
  if (!userProductReview?.value) return
  await $fetch(`/api/products/reviews/${userProductReview?.value.id}`, {
    method: 'PUT',
    body: {
      product: product.value?.id,
      translations: {
        [locale.value]: {
          comment: event.comment,
        },
      },
      rate: event.rate,
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
      async onResponse({ response }) {
        if (!userProductReview?.value) return
        if (!response.ok) {
          return
        }
        state.rate = 0
        state.comment = ''
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

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  if (user?.value) {
    if (!userHadReviewed.value) {
      await createReviewEvent(event.data)
    }
    else {
      await updateReviewEvent(event.data)
    }
  }
  else {
    toast.add({
      title: t('must_be_logged_in'),
      color: 'error',
    })
  }
}

watch(
  () => liveReviewCount.value,
  (to: number | undefined) => {
    if (to !== undefined) {
      state.rate = to
    }
  },
)
</script>

<template>
  <UModal
    v-if="user"
    :key="`reviewModal-${user?.id}-${product?.id}`"
    ref="reviewModal"
    v-model:open="isReviewModalOpen"
    :fullscreen="isMobileOrTablet"
    :title="t('write_review_for_product', {
      product: extractTranslated(product, 'name', locale),
    })"
  >
    <template #header>
      <div class="flex items-center justify-between gap-4">
        <span class="mb-0 text-xl leading-tight font-medium md:text-base">
          {{ t('write_review_for_product', { product: extractTranslated(product, 'name', locale) }) }}
        </span>
        <UIcon name="i-fa-solid-pen" />
      </div>
    </template>

    <template #body>
      <UForm
        ref="formRef"
        :schema="schema"
        :state="state"
        @submit="onSubmit"
      >
        <div class="relative grid gap-6">
          <div class="grid gap-2">
            <div
              class="
                mb-0 text-xl leading-tight font-medium
                md:text-base
              "
            >
              <p>{{ t('rating.title') }}</p>
            </div>
            <div class="relative grid grid-cols-[auto_1fr] items-center gap-4">
              <div
                ref="ratingBoard"
                role="slider"
                tabindex="0"
                :aria-valuenow="state.rate"
                aria-valuemin="0"
                aria-valuemax="10"
                :aria-label="t('rating.aria_label')"
                class="
                  relative z-10 inline-flex h-[26px] flex-row flex-nowrap
                  items-center justify-start
                "
                @click="lockSelection($event)"
                @mouseenter.passive="unlockSelection()"
                @mouseleave.passive="reLockSelection()"
                @mousemove.passive="updateNewSelectionRatio($event)"
                @touchend.passive="reLockSelection()"
                @touchmove.passive="updateNewSelectionRatio($event)"
                @touchstart.passive="unlockSelection()"
                @keydown="onRatingKeydown"
              >
                <svg
                  v-for="(star, i) of backgroundStars"
                  :key="`bg-${i}`"
                  aria-hidden="true"
                  class="h-[26px] w-[26px] cursor-pointer text-slate-300"
                  data-icon="star"
                  data-prefix="fas"
                  focusable="false"
                  role="img"
                  viewBox="0 0 576 512"
                  xmlns="http://www.w3.org/2000/svg"
                  v-html="star"
                />

                <div
                  class="
                    pointer-events-none absolute top-0 left-0 z-20 inline-flex
                    h-[26px] flex-row flex-nowrap items-center justify-start
                  "
                >
                  <svg
                    v-for="(star, i) of foregroundStars"
                    :key="`fg-${i}`"
                    aria-hidden="true"
                    class="h-[26px] w-[26px] cursor-pointer text-orange-400"
                    focusable="false"
                    role="img"
                    viewBox="0 0 576 512"
                    xmlns="http://www.w3.org/2000/svg"
                    v-html="star"
                  />
                </div>
              </div>

              <span class="px-2 text-sm font-medium">{{ reviewScoreText }}</span>
            </div>
            <UFormField name="rate">
              <template #error="{ error }">
                <span class="h-6 text-sm font-normal text-red-400">{{ error }}</span>
              </template>
            </UFormField>
          </div>

          <UFormField
            :label="t('comment.label')"
            name="comment"
          >
            <UTextarea
              v-model="state.comment"
              :placeholder="t('comment.placeholder')"
              :rows="6"
              color="neutral"
              maxlength="10000"
              class="w-full"
            />
          </UFormField>

          <input
            v-model="state.rate"
            name="rate"
            type="hidden"
          >
        </div>
      </UForm>
    </template>

    <template #footer>
      <div
        class="
          flex w-full flex-col items-center justify-between gap-4
          sm:flex-row
        "
      >
        <div class="grid w-full justify-end">
          <UButton
            :label="reviewButtonText"
            block
            class="w-full"
            color="success"
            variant="outline"
            size="lg"
            @click="formRef?.submit()"
          />
        </div>

        <div
          v-if="userProductReview"
          class="grid w-full justify-end"
        >
          <UButton
            :label="t('delete_review')"
            :trailing="true"
            block
            class="w-full gap-2"
            color="error"
            icon="i-heroicons-trash"
            size="lg"
            @click.prevent="deleteReviewEvent()"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  write_review: Γράψε μια κριτική
  update_review: Ενημέρωση κριτικής
  delete_review: Διαγραφή κριτικής
  must_be_logged_in: Πρέπει να συνδεθείς για να γράψεις μία κριτική
  write_review_for_product: Γράψε μια κριτική για το προϊόν {product}
  add:
    error: Σφάλμα δημιουργίας σχολίου
    success: Η κριτική δημιουργήθηκε με επιτυχία
  update:
    error: Σφάλμα ενημέρωσης σχολίου
    success: Η κριτική ενημερώθηκε με επιτυχία
  delete:
    success: Η κριτική διαγράφηκε με επιτυχία
    error: Προέκυψε σφάλμα κατά την διαγραφή
  rating:
    title: Βαθμολογία
    aria_label: Βαθμολογία (0-10)
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
