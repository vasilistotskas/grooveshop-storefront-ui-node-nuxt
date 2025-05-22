<script lang="ts" setup>
const { t, n, locale } = useI18n({ useScope: 'local' })
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
    class="grid gap-4"
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
          class="text-center !mt-0"
        />
      </div>
      <div class="grid items-center text-center">
        <NuxtTime
          :datetime="order.createdAt"
          :locale="locale"
          class="
            text-primary-950 text-sm

            dark:text-primary-50
          "
        />
      </div>
    </div>

    <section class="flex flex-col gap-4">
      <div
        class="
            order-items bg-primary-100 grid gap-4 rounded-lg p-4

            dark:bg-primary-900
          "
      >
        <div class="order-status flex flex-col sm:flex-row sm:items-center gap-4">
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
            <span :class="paymentStatusClass(order.paymentStatus).color">
              {{ order.paymentStatus }}
            </span>
            <UIcon
              :name="paymentStatusClass(order.paymentStatus).icon"
              :class="paymentStatusClass(order.paymentStatus).color"
            />
          </div>
        </div>
        <div class="order-items grid gap-4 max-h-96 overflow-y-auto">
          <div
            v-for="item in order.items"
            :key="item.product.id"
            class="order-item flex items-center gap-4"
          >
            <ImgWithFallback
              :alt="extractTranslated(item.product, 'name', locale)"
              :background="'transparent'"
              fit="contain"
              :height="100"
              :src="item.product?.mainImagePath"
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
                :title="extractTranslated(item.product, 'name', locale)"
                :to="{
                  path: item.product.absoluteUrl,
                }"
                css-class="w-full"
              >
                <span
                  class="
                      text-primary-950

                      dark:text-primary-50
                    "
                >
                  {{ extractTranslated(item.product, 'name', locale) }}
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
                  {{ n(item.totalPrice, 'currency') }}
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
              order-synopsis-info bg-primary-100 flex flex-col gap-4 rounded-lg
              p-4

              dark:bg-primary-900
            "
        >
          <span
            class="
                text-primary-950 text-2xl font-bold

                dark:text-primary-50
              "
          >
            {{ t('details') }}
          </span>
          <div class="flex flex-col gap-4">
            <div class="grid gap-2">
              <span
                class="
                    text-primary-950 font-bold

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
                    text-primary-950 font-bold

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
                    text-primary-950 font-bold

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
                extractTranslated(order.payWay, 'name', locale)
              }}</span>
            </div>
            <div class="grid gap-2">
              <span
                class="
                    text-primary-950 font-bold

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
            <div v-if="order.trackingInfo.trackingNumber" class="grid gap-2">
              <span
                class="
                    text-primary-950 font-bold

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
                order.trackingInfo.trackingNumber
              }}</span>
            </div>
          </div>
        </div>
        <div
          class="
              order-synopsis-prices bg-primary-100 flex flex-col gap-4
              rounded-lg p-4

              dark:bg-primary-900
            "
        >
          <span
            class="
                text-primary-950 text-2xl font-bold

                dark:text-primary-50
              "
          >
            {{ t('synopsis') }}
          </span>
          <div class="flex flex-col gap-4">
            <div class="grid gap-2">
              <span
                class="
                    text-primary-950 font-bold

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
                n(order.totalPriceItems, 'currency')
              }}</span>
            </div>
            <div class="grid gap-2">
              <span
                class="
                    text-primary-950 font-bold

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
                n(order.shippingPrice, 'currency')
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
                    text-primary-950 font-bold

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
                n(order.paidAmount, 'currency')
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
