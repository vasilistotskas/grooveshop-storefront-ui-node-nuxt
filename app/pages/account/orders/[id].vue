<script lang="ts" setup>
const { $i18n } = useNuxtApp()
const { t, locale } = useI18n()
const route = useRoute()
const orderId = 'id' in route.params
  ? route.params.id
  : undefined

const { data: order } = await useFetch<OrderDetail>(`/api/orders/${orderId}`, {
  key: `order${orderId}`,
  method: 'GET',
  headers: useRequestHeaders(),
  query: {
    language: locale,
  },
})

const { statusClass, paymentStatusClass } = useOrder()
const localePath = useLocalePath()

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    v-if="order"
    class="
      flex flex-col gap-4
      md:mt-1 md:gap-8 md:!p-0
    "
  >
    <div
      class="
        grid items-center
        md:flex md:justify-between
      "
    >
      <div class="flex items-center gap-4">
        <UButton
          :to="localePath('account-orders')"
          :trailing="true"
          color="neutral"
          icon="i-heroicons-arrow-left"
          size="sm"
        >
          <span class="sr-only">{{ t('back') }}</span>
        </UButton>
        <PageTitle
          :text="`${t('number')}: ${order?.id}`"
          class="
            text-center
            md:mt-0
          "
        />
      </div>
      <div class="grid items-center text-center">
        <NuxtTime
          :datetime="order.createdAt"
          :locale="locale"
          class="
            text-sm text-primary-950
            dark:text-primary-50
          "
        />
      </div>
    </div>

    <section class="flex flex-col gap-4">
      <div
        class="
          order-items grid gap-4 rounded-lg bg-primary-100 p-4
          dark:bg-primary-900
        "
      >
        <div
          class="
            order-status flex flex-col gap-4
            sm:flex-row sm:items-center
          "
        >
          <div class="flex items-center gap-2.5">
            <span :class="statusClass(order).color">
              {{ order.status }}
            </span>
            <UIcon
              :name="statusClass(order).icon"
              :class="statusClass(order).color"
            />
          </div>
          <div class="flex items-center gap-2.5">
            <span :class="paymentStatusClass(order.paymentStatus || '').color">
              {{ order.paymentStatus }}
            </span>
            <UIcon
              :name="paymentStatusClass(order.paymentStatus || '').icon"
              :class="paymentStatusClass(order.paymentStatus || '').color"
            />
          </div>
        </div>
        <div class="order-items grid max-h-96 gap-4 overflow-y-auto">
          <div
            v-for="item in order.items"
            :key="`product-${item.product}`"
            class="order-item flex items-center gap-4"
          >
            <ImgWithFallback
              :alt="typeof item.product === 'number' ? 'Product' : extractTranslated(item.product, 'name', locale)"
              :background="'transparent'"
              fit="contain"
              :height="100"
              :src="''"
              :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
              :width="100"
              class="bg-primary-100"
              loading="lazy"
              sizes="sm:100vw md:50vw lg:auto"
            />
            <div
              class="
                grid w-full gap-2
                md:flex
              "
            >
              <Anchor
                :title="typeof item.product === 'number' ? 'Product' : extractTranslated(item.product, 'name', locale)"
                :to="{
                  path: `/products/${item.product}`,
                }"
                css-class="w-full"
              >
                <span
                  class="
                    text-primary-950
                    dark:text-primary-50
                  "
                >
                  {{ typeof item.product === 'number' ? 'Product' : extractTranslated(item.product, 'name', locale) }}
                </span>
              </Anchor>
              <div class="flex items-center">
                <span
                  class="
                    text-primary-950
                    dark:text-primary-50
                  "
                >
                  {{ item.quantity }}
                </span>
                <UIcon name="i-heroicons-x-mark" />
                <span
                  v-if="item.totalPrice"
                  class="
                    text-primary-950
                    dark:text-primary-50
                  "
                >
                  {{ $i18n.n(item.totalPrice, 'currency') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        class="
          order-synopsis grid gap-4
          md:grid-cols-2
        "
      >
        <div
          class="
            order-synopsis-info flex flex-col gap-4 rounded-lg bg-primary-100
            p-4
            dark:bg-primary-900
          "
        >
          <span
            class="
              text-2xl font-bold text-primary-950
              dark:text-primary-50
            "
          >
            {{ t('details') }}
          </span>
          <div class="flex flex-col gap-4">
            <div class="grid gap-2">
              <span
                class="
                  font-bold text-primary-950
                  dark:text-primary-50
                "
              >{{
                t('address')
              }}</span>
              <span
                class="
                  text-primary-950
                  dark:text-primary-50
                "
              >{{
                order.fullAddress
              }}</span>
            </div>
            <div class="grid gap-2">
              <span
                class="
                  font-bold text-primary-950
                  dark:text-primary-50
                "
              >{{
                t('document_type')
              }}</span>
              <span
                class="
                  text-primary-950
                  dark:text-primary-50
                "
              >{{
                order.documentType
              }}</span>
            </div>
            <div class="grid gap-2">
              <span
                class="
                  font-bold text-primary-950
                  dark:text-primary-50
                "
              >{{
                t('pay_way')
              }}</span>
              <span
                class="
                  text-primary-950
                  dark:text-primary-50
                "
              >{{
                typeof order.payWay === 'number' ? 'Payment Method' : extractTranslated(order.payWay, 'name', locale)
              }}</span>
            </div>
            <div class="grid gap-2">
              <span
                class="
                  font-bold text-primary-950
                  dark:text-primary-50
                "
              >{{
                t('payment_status')
              }}</span>
              <span
                class="
                  text-primary-950
                  dark:text-primary-50
                "
              >{{
                order.paymentStatus
              }}</span>
            </div>
            <div
              v-if="false"
              class="grid gap-2"
            >
              <!-- trackingInfo not available in new schema -->
              <span
                class="
                  font-bold text-primary-950
                  dark:text-primary-50
                "
              >{{
                t('tracking_number')
              }}</span>
              <span
                class="
                  text-primary-950
                  dark:text-primary-50
                "
              >{{
                'N/A'
              }}</span>
            </div>
          </div>
        </div>
        <div
          class="
            order-synopsis-prices flex flex-col gap-4 rounded-lg bg-primary-100
            p-4
            dark:bg-primary-900
          "
        >
          <span
            class="
              text-2xl font-bold text-primary-950
              dark:text-primary-50
            "
          >
            {{ t('synopsis') }}
          </span>
          <div class="flex flex-col gap-4">
            <div class="grid gap-2">
              <span
                class="
                  font-bold text-primary-950
                  dark:text-primary-50
                "
              >{{
                t('products')
              }}</span>
              <span
                class="
                  text-primary-950
                  dark:text-primary-50
                "
              >{{
                $i18n.n(order.totalPriceItems, 'currency')
              }}</span>
            </div>
            <div class="grid gap-2">
              <span
                class="
                  font-bold text-primary-950
                  dark:text-primary-50
                "
              >{{
                t('shipping')
              }}</span>
              <span
                class="
                  text-primary-950
                  dark:text-primary-50
                "
              >{{
                $i18n.n(order.shippingPrice, 'currency')
              }}</span>
            </div>
            <hr
              class="
                text-primary-950
                dark:text-primary-50
              "
            >
            <div class="grid gap-2">
              <span
                class="
                  font-bold text-primary-950
                  dark:text-primary-50
                "
              >{{
                t('total')
              }}</span>
              <span
                class="
                  text-primary-950
                  dark:text-primary-50
                "
              >{{
                $i18n.n(order.paidAmount, 'currency')
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  back: Πίσω
  number: Παραγγελία
  details: Λεπτομέρειες
  shipping: Έξοδα αποστολής
  synopsis: Συνοπτικά
  products: Προϊόντα
  total: Σύνολο
  address: Διεύθυνση
  document_type: Τύπος Παραστατικού
  pay_way: Τρόπος Πληρωμής
  payment_status: Κατάσταση Πληρωμής
  tracking_number: Αριθμός Αποστολής
</i18n>
