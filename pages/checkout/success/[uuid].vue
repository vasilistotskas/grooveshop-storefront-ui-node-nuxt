<script lang="ts" setup>
import checkoutSuccessJSON from 'assets/lotties/checkout_success.json'

const orderStore = useOrderStore()
const { order } = storeToRefs(orderStore)
const { fetchOrderByUUID } = orderStore
const config = useRuntimeConfig()
const breadcrumbUi = useBreadcrumbsUi()

const route = useRoute('checkout-success-uuid___en')
const orderUUID = route.params.uuid

const { t, locale } = useLang()
const { extractTranslated } = useTranslationExtractor()
const { resolveImageSrc } = useImageResolver()

await fetchOrderByUUID(orderUUID)

if (!order) {
	throw createError({ statusCode: 404, statusMessage: t('common.error.page.not.found') })
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

const items = defineBreadcrumbItems([
	{
		to: '/',
		ariaLabel: t('seoUi.breadcrumb.items.index.ariaLabel'),
		icon: 'material-symbols:home-outline-rounded'
	},
	{
		to:
			locale.value === config.public.defaultLocale
				? `/checkout/success/${orderUUID}`
				: `/${locale.value}/checkout/success/${orderUUID}`,
		label: t('seoUi.breadcrumb.items.checkout.success.label'),
		current: true
	}
])

definePageMeta({
	layout: 'page'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-12">
		<SBreadcrumb id="sub" :items="items" :ui="breadcrumbUi" />
		<PageTitle
			:text="$t('pages.checkout.success.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<div
				class="container-xxs p-0 md:px-6 bg-white dark:bg-zinc-800 border border-gray-900/10 dark:border-gray-50/[0.2] shadow-md rounded p-4"
			>
				<div class="grid gap-16 items-center justify-center justify-items-center">
					<div class="grid gap-4 items-center justify-center justify-items-center">
						<Lottie
							ref="lottie"
							:text="$t('pages.checkout.success.lottie')"
							:animation-data="checkoutSuccessJSON"
							:width="'150px'"
							:height="'150px'"
							:loop="true"
							:auto-play="true"
						/>
						<h1 class="text-4xl font-bold">
							{{
								$t('pages.checkout.success.main.title', { customerName: customerName })
							}}
						</h1>
						<!-- eslint-disable vue/no-v-html -->
						<p
							class="text-center text-primary-700 dark:text-primary-100"
							v-html="
								$t('pages.checkout.success.main.text', {
									orderId: orderNumber,
									customerEmail: customerEmail
								})
							"
						></p>
					</div>

					<div class="grid gap-4 items-center justify-center justify-items-center">
						<h2 class="text-2xl font-semibold w-full text-center">
							{{ $t('pages.checkout.success.order.summary') }}
						</h2>

						<table class="min-w-full table-auto text-center">
							<thead>
								<tr>
									<th class="px-4 py-2">{{ $t('pages.checkout.success.image') }}</th>
									<th class="px-4 py-2">{{ $t('pages.checkout.success.product') }}</th>
									<th class="px-4 py-2">{{ $t('pages.checkout.success.quantity') }}</th>
									<th class="px-4 py-2">{{ $t('pages.checkout.success.price') }}</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="(item, index) in orderItems" :key="index">
									<td class="border px-4 py-2">
										<NuxtImg
											preload
											loading="lazy"
											provider="mediaStream"
											class="product-img bg-transparent"
											:style="{ objectFit: 'contain', contentVisibility: 'auto' }"
											:width="100"
											:height="100"
											:fit="'contain'"
											:position="'entropy'"
											:background="'transparent'"
											:trim-threshold="5"
											:format="'webp'"
											sizes="`sm:100vw md:50vw lg:auto`"
											:src="
												resolveImageSrc(
													item.product.mainImageFilename,
													`media/uploads/products/${item.product.mainImageFilename}`
												)
											"
											:alt="extractTranslated(item.product, 'name', locale)"
										/>
									</td>
									<td class="border px-4 py-2">
										{{ extractTranslated(item.product, 'name', locale) }}
									</td>
									<td class="border px-4 py-2">{{ item.quantity }}</td>
									<td class="border px-4 py-2">{{ item.totalPrice }}</td>
								</tr>
							</tbody>
						</table>

						<div
							class="w-full grid gap-2 items-center justify-center justify-items-center"
						>
							<h3 class="text-xl font-semibold">
								{{ $t('pages.checkout.success.order.details') }}
							</h3>
							<p class="text-primary-700 dark:text-primary-100">
								{{ $t('pages.checkout.success.shippingPrice', { price: shippingPrice }) }}
							</p>
							<p class="text-primary-700 dark:text-primary-100">
								{{
									$t('pages.checkout.success.totalPriceItems', { price: totalPriceItems })
								}}
							</p>
							<p class="text-primary-700 dark:text-primary-100">
								{{
									$t('pages.checkout.success.totalPriceExtra', { price: totalPriceExtra })
								}}
							</p>
							<p class="text-primary-700 dark:text-primary-100">
								{{ $t('pages.checkout.success.payWayPrice', { price: payWayPrice }) }}
							</p>
						</div>
						<p class="text-primary-700 dark:text-primary-100 font-bold">
							{{ $t('pages.checkout.success.total', { price: paidAmount }) }}
						</p>
					</div>

					<UButton
						icon="i-heroicons-home"
						size="xl"
						color="primary"
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
