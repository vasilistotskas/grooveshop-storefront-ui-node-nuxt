<script lang="ts" setup>
/**
 * "Διαθέσιμα κουπόνια (x)" — the coupons this cart can use, pre-judged.
 *
 * Typing a code is a guessing game the store already knows the answer
 * to. Django returns every coupon the shopper may be offered (the ones
 * the store advertises, plus the personal ones assigned to a signed-in
 * customer) with the verdict `CouponService.apply` would give for the
 * cart as it stands, so a disabled row here and a refusal on apply can
 * never disagree.
 *
 * Phones and tablets open it as a bottom sheet, wider screens as a
 * dialog.
 *
 * The count on the trigger is the ELIGIBLE coupons only — a number
 * counting codes the shopper cannot use would be a broken promise
 * before the modal even opens.
 */
const emit = defineEmits<{ applied: [code: string] }>()

const { t } = useI18n()
const { $i18n } = useNuxtApp()
const toast = useToast()
const cartStore = useCartStore()
const { cart } = storeToRefs(cartStore)
const { conditions, rejectionMessage } = usePromotionOffer()
const { isMobileOrTablet } = useDevice()

// One definition of the list, rendered in both frames.
const [DefineList, ReuseList] = createReusableTemplate()

const open = ref(false)
const submitting = ref<string | null>(null)

/**
 * Never SSR'd: every field except the offer copy depends on this cart
 * and this shopper, so a server render would put one customer's
 * verdicts into a shared payload — the same reason the route itself is
 * uncached. Nothing renders until the list lands.
 */
const { data: coupons, refresh: refreshCoupons } = await useApi(
  '/api/cart/coupons',
  {
    key: 'cart-coupons',
    server: false,
    default: () => [],
    // Re-judged whenever the basket changes value or contents — a
    // coupon blocked on a minimum subtotal becomes usable the moment
    // the shopper adds one more item.
    watch: [
      () => cart.value?.totalPrice,
      () => cart.value?.totalItems,
      () => cart.value?.appliedCouponCodes?.join(','),
    ],
  },
)

const rows = computed(() => coupons.value ?? [])
const eligibleCount = computed(
  () => rows.value.filter(row => row.eligible && !row.applied).length,
)
// "Διαθέσιμα κουπόνια (0)" is a broken promise on the button itself.
// With nothing to claim the list is still worth opening — to see why a
// code does not apply, or to find the one already on the cart — so the
// label drops the number instead of the button disappearing.
const triggerLabel = computed(() =>
  eligibleCount.value > 0
    ? t('trigger', { count: eligibleCount.value })
    : t('trigger_none'),
)

function savingLabel(row: CartCoupon): string | null {
  if (row.applied) return null
  const amount = Number(row.discountAmount ?? 0)
  if (amount > 0) return `-${$i18n.n(amount, 'currency')}`
  if (row.freeShipping) return t('free_shipping')
  return null
}

async function applyCoupon(row: CartCoupon) {
  submitting.value = row.code
  try {
    await $api('/api/cart/coupon', {
      method: 'POST',
      body: { code: row.code },
    })
    await cartStore.refreshCart()
    await refreshCoupons()
    open.value = false
    emit('applied', row.code)
    toast.add({
      title: t('applied_title'),
      description: row.promotion.name,
      color: 'success',
      icon: 'i-lucide-circle-check',
    })
  }
  catch (error: any) {
    // Django answers 400 with { detail, reason } from the ACP discount
    // vocabulary. Reaching here means the cart moved between the
    // verdict and the click, so re-read rather than just complaining.
    toast.add({
      title: t('apply_failed'),
      description: rejectionMessage(error?.data?.reason),
      color: 'error',
      icon: 'i-lucide-triangle-alert',
    })
    await refreshCoupons()
  }
  finally {
    submitting.value = null
  }
}
</script>

<template>
  <DefineList>
    <ul class="flex list-none flex-col gap-3 p-0">
      <li
        v-for="row in rows"
        :key="row.code"
        class="
          flex items-center gap-3 rounded-2xl p-3 ring ring-default
          sm:gap-4
        "
        :class="row.eligible || row.applied ? (row.personal ? 'bg-secondary/10' : 'bg-default') : 'bg-muted/50'"
      >
        <code
          class="
            shrink-0 rounded-lg border border-dashed border-default px-2.5 py-1.5
            font-mono text-xs font-bold text-highlighted
          "
        >{{ row.code }}</code>

        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <p class="text-sm font-semibold text-highlighted">
            <template v-if="row.personal">
              {{ t('personal') }} ·
            </template>
            {{ row.promotion.name }}
          </p>
          <p
            v-if="row.promotion.description"
            class="text-xs text-toned"
          >
            {{ row.promotion.description }}
          </p>
          <p
            v-if="conditions(row.promotion).length"
            class="text-xs text-toned"
          >
            {{ conditions(row.promotion).join(' · ') }}
          </p>

          <!-- The verdict. An eligible coupon worth nothing right now
               still applies — the shopper is told so rather than
               finding out from a total that did not move. -->
          <p
            v-if="!row.eligible"
            class="text-xs text-toned"
          >
            {{ t('not_eligible') }} · {{ rejectionMessage(row.reason) }}
          </p>
          <UBadge
            v-else-if="row.applied"
            color="success"
            variant="soft"
            size="sm"
            icon="i-lucide-check"
            :label="t('applied')"
            class="w-fit"
          />
          <UBadge
            v-else-if="savingLabel(row)"
            color="success"
            variant="soft"
            size="sm"
            :label="savingLabel(row)!"
            class="w-fit"
          />
          <p
            v-else
            class="text-xs text-toned"
          >
            {{ t('no_saving') }}
          </p>
        </div>

        <UBadge
          v-if="row.personal"
          color="secondary"
          variant="soft"
          size="sm"
          :label="t('yours')"
          class="shrink-0"
        />

        <UButton
          v-if="!row.applied"
          size="sm"
          color="neutral"
          variant="outline"
          :disabled="!row.eligible"
          :loading="submitting === row.code"
          :label="t('apply')"
          class="shrink-0"
          @click="() => applyCoupon(row)"
        />
      </li>
    </ul>
  </DefineList>

  <div v-if="rows.length">
    <UButton
      color="secondary"
      variant="link"
      size="sm"
      class="p-0"
      :label="triggerLabel"
      @click="() => { open = true }"
    />

    <UDrawer
      v-if="isMobileOrTablet"
      v-model:open="open"
      :title="t('title')"
      :description="t('description')"
      :handle="false"
      close
      :ui="{
        content: 'max-h-[92dvh]',
        container: 'min-h-0 gap-0 overflow-y-hidden p-0',
        header: 'border-b border-default py-3 ps-4 pe-2',
        title: 'font-display text-[1.375rem] font-bold',
        body: 'min-h-0 overflow-y-auto p-4',
      }"
    >
      <template #body>
        <ReuseList />
      </template>
    </UDrawer>

    <UModal
      v-else
      v-model:open="open"
      :title="t('title')"
      :description="t('description')"
      :ui="{ content: 'max-w-lg' }"
    >
      <template #body>
        <ReuseList />
      </template>
    </UModal>
  </div>
</template>

<i18n lang="yaml">
el:
  trigger: 'Δες {count} κουπόνι που μπορείς να χρησιμοποιήσεις | Δες {count} κουπόνια που μπορείς να χρησιμοποιήσεις'
  trigger_none: Δες τα κουπόνια του καταστήματος
  title: Διαθέσιμα κουπόνια
  description: Τα κουπόνια που μπορείς να χρησιμοποιήσεις σε αυτή την παραγγελία.
  apply: Εφαρμογή
  applied: Εφαρμοσμένο
  applied_title: Το κουπόνι εφαρμόστηκε
  apply_failed: Το κουπόνι δεν εφαρμόστηκε
  not_eligible: Δεν ισχύει
  no_saving: Δεν μειώνει το σύνολο αυτή τη στιγμή
  free_shipping: Δωρεάν αποστολή
  personal: Προσωπικό
  yours: Δικό σου
en:
  trigger: 'See {count} coupon you can use | See {count} coupons you can use'
  trigger_none: See the store's coupons
  title: Available coupons
  description: The coupons you can use on this order.
  apply: Apply
  applied: Applied
  applied_title: Coupon applied
  apply_failed: The coupon was not applied
  not_eligible: Not eligible
  no_saving: Does not reduce your total right now
  free_shipping: Free shipping
  personal: Personal
  yours: Yours
</i18n>
