<script lang="ts" setup>
const { locale } = useI18n()
const route = useRoute('account-orders-id___en')
const orderId = route.params.id

const { data: order } = await useFetch(`/api/orders/${orderId}`, {
  key: `order${orderId}`,
  method: 'GET',
  query: {
    language: locale.value,
  },
})

const { statusClass } = useOrder()
const { resolveImageSrc } = useImageResolver()

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper v-if="order" class="grid gap-4">
    <PageHeader class="grid items-center md:flex md:justify-between">
      <div class="grid grid-cols-auto-1fr items-center gap-4">
        <UButton
          icon="i-heroicons-arrow-left"
          size="sm"
          :to="'/account/orders'"
          :trailing="true"
          color="white"
        >
          <span class="sr-only">{{ $t('pages.account.order.back') }}</span>
        </UButton>
        <PageTitle
          class="text-center"
          :text="`${$t('pages.account.order.number')}: ${order?.id}`"
        />
      </div>
      <div class="grid items-center text-center">
        <NuxtTime
          class="text-primary-800 dark:text-primary-100 text-sm"
          :datetime="order.createdAt"
        />
      </div>
    </PageHeader>
    <PageBody>
      <section class="flex flex-col gap-4">
        <div
          class="order-items grid gap-4 rounded-lg bg-white p-4 dark:bg-zinc-900"
        >
          <div class="order-status flex items-center gap-2.5">
            <span :class="statusClass(order).color">
              {{ order.status }}
            </span>
            <Component
              :is="statusClass(order).icon"
              :class="statusClass(order).color"
            />
          </div>
          <div class="order-items grid gap-4">
            <div
              v-for="item in order.orderItemOrder"
              :key="item.product.id"
              class="order-item flex items-center gap-4"
            >
              <ImgWithFallback
                loading="lazy"
                provider="mediaStream"
                class="bg-white"
                :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
                :width="100"
                :height="100"
                :fit="'contain'"
                :position="'entropy'"
                :background="'transparent'"
                :trim-threshold="5"
                sizes="`sm:100vw md:50vw lg:auto`"
                :src="
                  resolveImageSrc(
                    item.product?.mainImageFilename,
                    `media/uploads/products/${item.product.mainImageFilename}`,
                  )
                "
                :alt="extractTranslated(item.product, 'name', locale)"
              />
              <div class="grid w-full gap-2 md:flex">
                <Anchor
                  :to="`/products${item.product.absoluteUrl}`"
                  :title="extractTranslated(item.product, 'name', locale)"
                  css-class="w-full"
                >
                  <span class="text-primary-800 dark:text-primary-100">
                    {{ extractTranslated(item.product, 'name', locale) }}
                  </span>
                </Anchor>
                <div class="flex items-center">
                  <span class="text-primary-800 dark:text-primary-100">
                    {{ item.quantity }}
                  </span>
                  <UIcon name="i-heroicons-x-mark" />
                  <I18nN
                    v-if="item.totalPrice"
                    class="text-primary-800 dark:text-primary-100"
                    tag="span"
                    format="currency"
                    :value="item.totalPrice"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="order-synopsis grid gap-4 md:grid-cols-2">
          <div
            class="order-synopsis-info flex flex-col gap-4 rounded-lg bg-white p-4 dark:bg-zinc-900"
          >
            <span
              class="text-primary-800 dark:text-primary-100 text-2xl font-bold"
            >
              {{ $t('pages.account.order.details') }}
            </span>
            <div class="flex flex-col gap-4">
              <div class="grid gap-2">
                <span
                  class="text-primary-800 dark:text-primary-100 font-bold"
                  >{{ $t('pages.account.order.address') }}</span
                >
                <span class="text-primary-800 dark:text-primary-100">{{
                  order.fullAddress
                }}</span>
              </div>
              <div class="grid gap-2">
                <span
                  class="text-primary-800 dark:text-primary-100 font-bold"
                  >{{ $t('pages.account.order.document_type') }}</span
                >
                <span class="text-primary-800 dark:text-primary-100">{{
                  order.documentType
                }}</span>
              </div>
              <div class="grid gap-2">
                <span
                  class="text-primary-800 dark:text-primary-100 font-bold"
                  >{{ $t('pages.account.order.pay_way') }}</span
                >
                <span class="text-primary-800 dark:text-primary-100">{{
                  extractTranslated(order.payWay, 'name', locale)
                }}</span>
              </div>
            </div>
          </div>
          <div
            class="order-synopsis-prices flex flex-col gap-4 rounded-lg bg-white p-4 dark:bg-zinc-900"
          >
            <span
              class="text-primary-800 dark:text-primary-100 text-2xl font-bold"
            >
              {{ $t('pages.account.order.synopsis') }}
            </span>
            <div
              class="grid gap-2 border-b border-gray-900/10 pb-4 dark:border-gray-50/[0.2]"
            >
              <div class="flex items-center justify-between">
                <span
                  class="text-primary-800 dark:text-primary-100 font-light"
                  >{{ $t('pages.account.order.product.value') }}</span
                >
                <I18nN
                  class="text-primary-800 dark:text-primary-100"
                  tag="span"
                  format="currency"
                  :value="order.totalPriceItems"
                />
              </div>
              <div class="flex items-center justify-between">
                <span
                  class="text-primary-800 dark:text-primary-100 font-light"
                  >{{ $t('pages.account.order.shipping.value') }}</span
                >
                <I18nN
                  class="text-primary-800 dark:text-primary-100"
                  tag="span"
                  format="currency"
                  :value="order.shippingPrice"
                />
              </div>
            </div>
            <div class="grid">
              <div class="flex items-center justify-between">
                <span
                  class="text-primary-800 dark:text-primary-100 font-bold"
                  >{{ $t('pages.account.order.total') }}</span
                >
                <I18nN
                  class="text-primary-800 dark:text-primary-100 font-bold"
                  tag="span"
                  format="currency"
                  :value="order.paidAmount"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageBody>
  </PageWrapper>
</template>
