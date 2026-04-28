<script lang="ts" setup>
const formState = defineModel<Record<string, any>>('formState', { required: true })

const props = defineProps<{
  schema: any
  partnerId: string
  // The currently selected PayWay (from useCheckoutForm). Threaded
  // through as a prop so we can disable the BoxNow option when the
  // shopper has a cash-on-delivery PayWay selected — BoxNow lockers
  // do not support COD (no POS at lockers per BoxNow policy).
  selectedPayWay?: { id: number, isOnlinePayment?: boolean } | null
}>()

const emit = defineEmits<{
  next: []
  back: []
}>()

const { t } = useI18n()

// True when the chosen PayWay is offline (Αντικαταβολή / cash-on-delivery)
// and BoxNow can therefore NOT be used. Default to false (BoxNow allowed)
// when no PayWay is selected yet — the user hasn't reached step 3 in the
// initial flow.
const isCodPaySelected = computed(
  () => props.selectedPayWay?.isOnlinePayment === false,
)

// True when the BoxNow widget is unconfigured (NUXT_PUBLIC_BOXNOW_PARTNER_ID
// missing from the deploy environment). We disable the BoxNow option in
// that case so the shopper never reaches the picker — which would throw
// "partnerId is required" from buildBoxNowIframeUrl and bubble up as the
// generic checkout error toast.
const isBoxNowConfigured = computed(() => Boolean(props.partnerId))

const isBoxNowDisabled = computed(
  () => isCodPaySelected.value || !isBoxNowConfigured.value,
)

// Note: ``description`` is rendered inside the custom ``#label`` slot
// below — we deliberately omit it from the item objects so URadioGroup
// doesn't ALSO render it as a separate ``data-slot="description"``
// paragraph (which would duplicate the text on the card).
//
// Brand metadata (logo, icon, optional badge tagline) lives in
// ``app/utils/shipping-methods.ts`` so adding a carrier is just dropping
// a logo into ``app/assets/images/shipping/`` + a one-line entry there.
const shippingOptions = computed(() => {
  const items: Array<{
    value: ShippingMethodEnum
    label: string
    descriptionText: string
    logo: string
    altText: string
    icon: string
    taglineKey?: string
    taglineColor?: ShippingMethodMeta['taglineColor']
    disabled?: boolean
  }> = [
    {
      value: 'home_delivery',
      label: t('shipping.method.home_delivery.label'),
      descriptionText: t('shipping.method.home_delivery.description'),
      ...buildBrandMeta('home_delivery'),
    },
    {
      value: 'box_now_locker',
      label: t('shipping.method.boxnow.label'),
      descriptionText: t('shipping.method.boxnow.description'),
      disabled: isBoxNowDisabled.value,
      ...buildBrandMeta('box_now_locker'),
    },
  ]
  return items
})

function buildBrandMeta(method: ShippingMethodEnum) {
  const meta = getShippingMethodMeta(method)
  return {
    logo: meta.logo,
    altText: t(meta.altKey),
    icon: meta.icon,
    taglineKey: meta.taglineKey,
    taglineColor: meta.taglineColor,
  }
}

const isBoxNow = computed(() => formState.value.shippingMethod === 'box_now_locker')

const isValid = computed(() =>
  formState.value.shippingMethod === 'home_delivery'
  || (isBoxNow.value && !!formState.value.boxnowLockerId),
)

// If the shopper had BoxNow selected before, then went to step 3 and
// switched to a COD PayWay, returning to step 1 leaves the form in an
// invalid combo (BoxNow + COD). Force it back to home_delivery so the
// disabled radio doesn't render with the invalid current value.
watch(isCodPaySelected, (cod) => {
  if (cod && formState.value.shippingMethod === 'box_now_locker') {
    formState.value.shippingMethod = 'home_delivery'
    formState.value.boxnowLockerId = ''
    formState.value.boxnowLocker = null
  }
}, { immediate: true })

function onSubmit() {
  emit('next')
}
</script>

<template>
  <UCard class="overflow-hidden">
    <template #header>
      <h2 class="text-xl font-semibold">
        {{ t('shipping.method.title') }}
      </h2>
      <p class="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
        {{ t('subtitle') }}
      </p>
    </template>

    <UForm :state="formState" :schema="schema" class="space-y-6" @submit="onSubmit">
      <!-- Shipping method radio group -->
      <URadioGroup
        v-model="formState.shippingMethod"
        :items="shippingOptions"
        variant="card"
        size="xl"
        class="w-full"
        :ui="{
          item: 'flex cursor-pointer items-start gap-3 p-4',
          wrapper: 'ms-3',
        }"
      >
        <template #label="{ item }">
          <div class="flex flex-1 items-start gap-2 sm:gap-3">
            <ImgWithFallback
              :src="item.logo"
              :alt="item.altText"
              width="96"
              height="40"
              fit="contain"
              format="webp"
              :modifiers="{ background: 'transparent' }"
              class="h-8 w-16 shrink-0 object-contain sm:h-10 sm:w-24"
            />
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <!-- ``flex-wrap`` lets the tagline badge break to a second
                   line on narrow viewports instead of overflowing.
                   ``min-w-0 + break-words`` lets the label itself wrap
                   when the brand name + tagline don't fit one row. -->
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="break-words font-semibold">{{ item.label }}</span>
                <UBadge
                  v-if="item.taglineKey"
                  size="sm"
                  variant="soft"
                  :color="item.taglineColor ?? 'info'"
                  class="shrink-0"
                >
                  {{ t(item.taglineKey) }}
                </UBadge>
              </div>
              <span class="text-sm text-neutral-700 dark:text-neutral-200">
                {{ item.descriptionText }}
              </span>
            </div>
          </div>
        </template>
      </URadioGroup>

      <!-- COD-incompatible explainer — only when the BoxNow row is disabled -->
      <UAlert
        v-if="isCodPaySelected"
        color="warning"
        variant="subtle"
        icon="i-heroicons-information-circle"
        :title="t('shipping.method.boxnow.cod_blocked_title')"
        :description="t('shipping.method.boxnow.cod_blocked_description')"
      />

      <!-- Configuration explainer — only in dev when BoxNow partnerId is missing -->
      <UAlert
        v-else-if="!isBoxNowConfigured"
        color="info"
        variant="subtle"
        icon="i-heroicons-information-circle"
        :title="t('shipping.method.boxnow.unconfigured_title')"
        :description="t('shipping.method.boxnow.unconfigured_description')"
      />

      <!-- BoxNow locker picker — shown when box_now_locker is selected -->
      <template v-if="isBoxNow">
        <!-- Hidden form field so Zod shows the validation error for missing locker -->
        <UFormField name="boxnowLockerId" class="mt-0">
          <template #default="{ error }">
            <CheckoutSelectedBoxNowLocker
              v-model:formState="formState"
              :partner-id="props.partnerId"
            />
            <p
              v-if="error"
              class="mt-2 text-sm text-red-500"
            >
              {{ error }}
            </p>
          </template>
        </UFormField>
      </template>

      <!-- Footer navigation -->
      <div class="flex items-center justify-between pt-4">
        <UButton
          variant="ghost"
          icon="i-heroicons-arrow-left"
          type="button"
          data-testid="step-shipping-back"
          @click="emit('back')"
        >
          {{ t('back') }}
        </UButton>

        <UButton
          type="submit"
          size="lg"
          color="success"
          :disabled="!isValid"
          icon="i-heroicons-arrow-right"
          trailing
        >
          {{ t('continue') }}
        </UButton>
      </div>
    </UForm>
  </UCard>
</template>

<i18n lang="yaml">
el:
  subtitle: Επιλέξτε πώς θέλετε να παραλάβετε την παραγγελία σας
  back: Πίσω
  continue: Συνέχεια
</i18n>
