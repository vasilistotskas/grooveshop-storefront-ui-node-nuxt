<script lang="ts" setup>
import checkoutSuccessJSON from 'assets/lotties/checkout_success.json'

const route = useRoute()
const orderUUID = route.params.uuid

const { t, locale } = useI18n()
const { resolveImageSrc } = useImageResolver()
const localePath = useLocalePath()

const { data: order, error } = await useFetch(
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
    message: t('common.error.page.not.found'),
    fatal: true,
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
  return order.value?.items
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
  <PageWrapper
    class="
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="$t('pages.checkout.success.title')"
      class="text-center capitalize"
    />
    <PageBody>
      <div
        class="
          container-2xs bg-primary-100 rounded !p-4 shadow-md

          dark:bg-primary-900

          md:px-6
        "
      >
        <div
          class="
            grid items-center justify-center justify-items-center gap-8

            md:gap-16
          "
        >
          <div
            class="grid items-center justify-center justify-items-center gap-4"
          >
            <Lottie
              ref="lottie"
              :animation-data="checkoutSuccessJSON"
              :auto-play="true"
              :height="'150px'"
              :loop="true"
              :text="$t('pages.checkout.success.lottie')"
              :width="'150px'"
            />
            <h2 class="text-4xl font-bold">
              {{
                $t('pages.checkout.success.main.title', {
                  customerName: customerName,
                })
              }}
            </h2>
            <p
              class="
                text-primary-950 text-center

                dark:text-primary-50
              "
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

            <table
              v-if="orderItems"
              class="min-w-full table-auto text-center"
            >
              <thead>
                <tr>
                  <th
                    class="px-4 py-2"
                    scope="col"
                  >
                    {{ $t('pages.checkout.success.image') }}
                  </th>
                  <th
                    class="px-4 py-2"
                    scope="col"
                  >
                    {{ $t('pages.checkout.success.product') }}
                  </th>
                  <th
                    class="px-4 py-2"
                    scope="col"
                  >
                    {{ $t('pages.checkout.success.quantity') }}
                  </th>
                  <th
                    class="px-4 py-2"
                    scope="col"
                  >
                    {{ $t('pages.checkout.success.price') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in orderItems"
                  :key="index"
                >
                  <td class="border px-4 py-2">
                    <ImgWithFallback
                      :alt="extractTranslated(item.product, 'name', locale)"
                      :background="'transparent'"
                      :fit="'contain'"
                      :height="100"
                      :position="'entropy'"
                      :src="
                        resolveImageSrc(
                          item.product.mainImageFilename,
                          `media/uploads/products/${item.product.mainImageFilename}`,
                        )
                      "
                      :style="{
                        objectFit: 'contain',
                        contentVisibility: 'auto',
                      }"
                      :trim-threshold="5"
                      :width="100"
                      class="product-img bg-primary-100"
                      loading="lazy"
                      provider="mediaStream"
                      sizes="`sm:100vw md:50vw lg:auto`"
                    />
                  </td>
                  <td class="border px-4 py-2">
                    {{ extractTranslated(item.product, 'name', locale) }}
                  </td>
                  <td class="border px-4 py-2">
                    {{ item.quantity }}
                  </td>
                  <td
                    v-if="item.totalPrice"
                    class="border px-4 py-2"
                  >
                    <I18nN
                      :value="item.totalPrice"
                      format="currency"
                      tag="span"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <div
              class="
                grid w-full items-center justify-center justify-items-center
                gap-2
              "
            >
              <h3 class="text-xl font-semibold">
                {{ $t('pages.checkout.success.order.details') }}
              </h3>
              <p
                v-if="shippingPrice"
                class="
                  text-primary-950

                  dark:text-primary-50
                "
              >
                {{ $t('pages.checkout.success.shippingPrice') }}:
                <I18nN
                  :value="shippingPrice"
                  format="currency"
                  tag="span"
                />
              </p>
              <p
                v-if="totalPriceItems"
                class="
                  text-primary-950

                  dark:text-primary-50
                "
              >
                {{ $t('pages.checkout.success.totalPriceItems') }}:
                <I18nN
                  :value="totalPriceItems"
                  format="currency"
                  tag="span"
                />
              </p>
              <p
                v-if="totalPriceExtra"
                class="
                  text-primary-950

                  dark:text-primary-50
                "
              >
                {{ $t('pages.checkout.success.totalPriceExtra') }}:
                <I18nN
                  :value="totalPriceExtra"
                  format="currency"
                  tag="span"
                />
              </p>
              <p
                v-if="payWayPrice"
                class="
                  text-primary-950

                  dark:text-primary-50
                "
              >
                {{ $t('pages.checkout.success.payWayPrice') }}:
                <I18nN
                  :value="payWayPrice"
                  format="currency"
                  tag="span"
                />
              </p>
            </div>
            <p
              v-if="paidAmount"
              class="
                text-primary-950 font-bold

                dark:text-primary-50
              "
            >
              {{ $t('pages.checkout.success.total') }}:
              <I18nN
                :value="paidAmount"
                format="currency"
                tag="span"
              />
            </p>
          </div>
          <UButton
            :label="$t('pages.checkout.success.button')"
            :to="localePath('/')"
            :trailing="false"
            color="primary"
            icon="i-heroicons-home"
            size="xl"
            variant="solid"
          />
        </div>
      </div>
    </PageBody>
  </PageWrapper>
</template>
