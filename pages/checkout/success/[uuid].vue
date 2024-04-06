<script lang="ts" setup>
import checkoutSuccessJSON from 'assets/lotties/checkout_success.json'

import type { Order } from '~/types/order/order'

const route = useRoute('checkout-success-uuid___en')
const orderUUID = route.params.uuid

const { t, locale } = useI18n()
const { resolveImageSrc } = useImageResolver()

const { data: order, error } = await useFetch<Order>(
  `/api/orders/uuid/${orderUUID}`,
  {
    key: `order${orderUUID}`,
    method: 'GET',
    query: {
      language: locale.value,
    },
  },
)

if (!order.value || error.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t('common.error.page.not.found'),
  })
}

const customerName = computed(() => {
  const firstName = order.value?.firstName
  const lastName = order.value?.lastName
  return `${firstName} ${lastName}`
})

const customerEmail = computed(() => {
  return order.value?.email
})

const orderNumber = computed(() => {
  return order.value?.id
})

const orderItems = computed(() => {
  return order.value?.orderItemOrder
})

const paidAmount = computed(() => {
  return order.value?.paidAmount
})

const shippingPrice = computed(() => {
  return order.value?.shippingPrice
})

const totalPriceItems = computed(() => {
  return order.value?.totalPriceItems
})

const totalPriceExtra = computed(() => {
  return order.value?.totalPriceExtra
})

const payWayPrice = computed(() => {
  const payWayCost = order.value?.payWay.cost
  const payWayFreeForOrderAmount = order.value?.payWay.freeForOrderAmount ?? 0
  const totalPriceItems = order.value?.totalPriceItems ?? 0
  if (totalPriceItems >= payWayFreeForOrderAmount) {
    return 0
  }
  return payWayCost
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container flex flex-col gap-4 !p-0 md:gap-8">
    <PageTitle
      :text="$t('pages.checkout.success.title')"
      class="text-center capitalize"
    />
    <PageBody>
      <div
        class="container-2xs rounded border border-gray-900/10 bg-white !p-4 shadow-md dark:border-gray-50/[0.2] dark:bg-zinc-900 md:px-6"
      >
        <div
          class="grid items-center justify-center justify-items-center gap-8 md:gap-16"
        >
          <div
            class="grid items-center justify-center justify-items-center gap-4"
          >
            <Lottie
              ref="lottie"
              :text="$t('pages.checkout.success.lottie')"
              :animation-data="checkoutSuccessJSON"
              :width="'150px'"
              :height="'150px'"
              :loop="true"
              :auto-play="true"
            />
            <h2 class="text-4xl font-bold">
              {{
                $t('pages.checkout.success.main.title', {
                  customerName: customerName,
                })
              }}
            </h2>
            <p
              class="text-primary-800 dark:text-primary-100 text-center"
              v-html="
                $t('pages.checkout.success.main.text', {
                  orderId: orderNumber,
                  customerEmail: customerEmail,
                })
              "
            />
          </div>

          <div
            class="grid items-center justify-center justify-items-center gap-4"
          >
            <h2 class="w-full text-center text-2xl font-semibold">
              {{ $t('pages.checkout.success.order.summary') }}
            </h2>

            <table v-if="orderItems" class="min-w-full table-auto text-center">
              <thead>
                <tr>
                  <th scope="col" class="px-4 py-2">
                    {{ $t('pages.checkout.success.image') }}
                  </th>
                  <th scope="col" class="px-4 py-2">
                    {{ $t('pages.checkout.success.product') }}
                  </th>
                  <th scope="col" class="px-4 py-2">
                    {{ $t('pages.checkout.success.quantity') }}
                  </th>
                  <th scope="col" class="px-4 py-2">
                    {{ $t('pages.checkout.success.price') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in orderItems" :key="index">
                  <td class="border px-4 py-2">
                    <ImgWithFallback
                      loading="lazy"
                      provider="mediaStream"
                      class="product-img bg-white"
                      :style="{
                        objectFit: 'contain',
                        contentVisibility: 'auto',
                      }"
                      :width="100"
                      :height="100"
                      :fit="'contain'"
                      :position="'entropy'"
                      :background="'transparent'"
                      :trim-threshold="5"
                      sizes="`sm:100vw md:50vw lg:auto`"
                      :src="
                        resolveImageSrc(
                          item.product.mainImageFilename,
                          `media/uploads/products/${item.product.mainImageFilename}`,
                        )
                      "
                      :alt="extractTranslated(item.product, 'name', locale)"
                    />
                  </td>
                  <td class="border px-4 py-2">
                    {{ extractTranslated(item.product, 'name', locale) }}
                  </td>
                  <td class="border px-4 py-2">
                    {{ item.quantity }}
                  </td>
                  <td v-if="item.totalPrice" class="border px-4 py-2">
                    <I18nN
                      tag="span"
                      format="currency"
                      :value="item.totalPrice"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <div
              class="grid w-full items-center justify-center justify-items-center gap-2"
            >
              <h3 class="text-xl font-semibold">
                {{ $t('pages.checkout.success.order.details') }}
              </h3>
              <p
                v-if="shippingPrice"
                class="text-primary-800 dark:text-primary-100"
              >
                {{ $t('pages.checkout.success.shippingPrice') }}:
                <I18nN tag="span" format="currency" :value="shippingPrice" />
              </p>
              <p
                v-if="totalPriceItems"
                class="text-primary-800 dark:text-primary-100"
              >
                {{ $t('pages.checkout.success.totalPriceItems') }}:
                <I18nN tag="span" format="currency" :value="totalPriceItems" />
              </p>
              <p
                v-if="totalPriceExtra"
                class="text-primary-800 dark:text-primary-100"
              >
                {{ $t('pages.checkout.success.totalPriceExtra') }}:
                <I18nN tag="span" format="currency" :value="totalPriceExtra" />
              </p>
              <p
                v-if="payWayPrice"
                class="text-primary-800 dark:text-primary-100"
              >
                {{ $t('pages.checkout.success.payWayPrice') }}:
                <I18nN tag="span" format="currency" :value="payWayPrice" />
              </p>
            </div>
            <p
              v-if="paidAmount"
              class="text-primary-800 dark:text-primary-100 font-bold"
            >
              {{ $t('pages.checkout.success.total') }}:
              <I18nN tag="span" format="currency" :value="paidAmount" />
            </p>
          </div>
          <UButton
            icon="i-heroicons-home"
            size="xl"
            color="white"
            variant="solid"
            :label="$t('pages.checkout.success.button')"
            :trailing="false"
            to="/"
          />
        </div>
      </div>
    </PageBody>
  </PageWrapper>
</template>
