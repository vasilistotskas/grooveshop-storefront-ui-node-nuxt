<script lang="ts" setup>
const { t, locale } = useI18n({ useScope: 'local' })
const route = useRoute()
const orderId = 'id' in route.params
  ? route.params.id
  : undefined

const { data: order } = await useFetch<Order>(`/api/orders/${orderId}`, {
  key: `order${orderId}`,
  method: 'GET',
  headers: useRequestHeaders(),
  query: {
    language: locale.value,
  },
})

const { statusClass } = useOrder()
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
      <div class="grid grid-cols-auto-1fr items-center gap-4">
        <UButton
          :to="localePath('account-orders')"
          :trailing="true"
          color="primary"
          icon="i-heroicons-arrow-left"
          size="sm"
        >
          <span class="sr-only">{{ t('back') }}</span>
        </UButton>
        <PageTitle
          :text="`${t('number')}: ${order?.id}`"
          class="text-center"
        />
      </div>
      <div class="grid items-center text-center">
        <NuxtTime
          :datetime="order.createdAt"
          class="
            text-primary-950 text-sm

            dark:text-primary-50
          "
        />
      </div>
    </div>
    <PageBody>
      <section class="flex flex-col gap-4">
        <div
          class="
            order-items bg-primary-100 grid gap-4 rounded-lg p-4

            dark:bg-primary-900
          "
        >
          <div class="order-status flex items-center gap-2.5">
            <span :class="statusClass(order).color">
              {{ order.status }}
            </span>
            <UIcon
              :name="statusClass(order).icon"
              :class="statusClass(order).color"
            />
          </div>
          <div class="order-items grid gap-4">
            <div
              v-for="item in order.items"
              :key="item.product.id"
              class="order-item flex items-center gap-4"
            >
              <ImgWithFallback
                provider="mediaStream"
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
                  <I18nN
                    v-if="item.totalPrice"
                    :value="item.totalPrice"
                    class="
                      text-primary-950

                      dark:text-primary-50
                    "
                    format="currency"
                    tag="span"
                  />
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
            <div
              class="
                border-primary-500 grid gap-2 border-b pb-4

                dark:border-primary-500
              "
            >
              <div class="flex items-center justify-between">
                <span
                  class="
                    text-primary-950 font-light

                    dark:text-primary-50
                  "
                >{{ t('product.value') }}</span>
                <I18nN
                  :value="order.totalPriceItems"
                  class="
                    text-primary-950

                    dark:text-primary-50
                  "
                  format="currency"
                  tag="span"
                />
              </div>
              <div class="flex items-center justify-between">
                <span
                  class="
                    text-primary-950 font-light

                    dark:text-primary-50
                  "
                >{{ t('shipping.value') }}</span>
                <I18nN
                  :value="order.shippingPrice"
                  class="
                    text-primary-950

                    dark:text-primary-50
                  "
                  format="currency"
                  tag="span"
                />
              </div>
            </div>
            <div class="grid">
              <div class="flex items-center justify-between">
                <span
                  class="
                    text-primary-950 font-bold

                    dark:text-primary-50
                  "
                >{{
                  t('total')
                }}</span>
                <I18nN
                  :value="order.paidAmount"
                  class="
                    text-primary-950 font-bold

                    dark:text-primary-50
                  "
                  format="currency"
                  tag="span"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  back: Επιστροφή στις παραγγελίες
  number: Αριθμός παραγγελίας
  details: Λεπτομέρειες Παραγγελίας
  address: Διεύθυνση αποστολής
  document_type: Είδος αρχείου
  pay_way: Τρόπος πληρωμής
  synopsis: Περίληψη
  total: Σύνολο
  product:
    value: Αξία προϊόντος
  shipping:
    value: Αξία αποστολής
</i18n>
