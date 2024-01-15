<script lang="ts" setup>
import type { PropType } from 'vue'
import type { Order } from '~/types/order/order'
import SentIcon from '~icons/fa6-solid/paper-plane'
import PaidSentIcon from '~icons/fa6-solid/circle-check'
import CanceledSentIcon from '~icons/fa6-solid/circle-xmark'
import PendingSentIcon from '~icons/fa6-solid/clock'
import DefaultSentIcon from '~icons/fa6-solid/circle-question'

const props = defineProps({
	order: {
		type: Object as PropType<Order>,
		required: true
	},
	maxItems: {
		type: Number,
		default: 2,
		required: false
	}
})

const { locale } = useI18n()
const { contentShorten } = useText()
const { extractTranslated } = useTranslationExtractor()

const statusClass = computed(() => {
	switch (props.order?.status) {
		case 'SENT':
			return {
				icon: SentIcon,
				color: 'text-blue-500'
			}
		case 'PAID_AND_SENT':
			return {
				icon: PaidSentIcon,
				color: 'text-green-500'
			}
		case 'CANCELED':
			return {
				icon: CanceledSentIcon,
				color: 'text-red-500'
			}
		case 'PENDING':
			return {
				icon: PendingSentIcon,
				color: 'text-primary-500'
			}
		default:
			return {
				icon: DefaultSentIcon,
				color: 'text-primary-500'
			}
	}
})
</script>

<template>
	<div
		class="order-card text-primary-700 dark:text-primary-100 grid grid-cols-3 items-center gap-4 rounded border border-gray-900/10 bg-white p-4 dark:border-gray-50/[0.2] dark:bg-zinc-800 md:grid-cols-1 md:grid-rows-3 md:gap-10 md:p-10"
	>
		<div
			class="order-card-items col-span-1 grid grid-cols-2 gap-4 md:col-span-3 md:grid-cols-3"
		>
			<OrderCardItem
				v-for="item in order.orderItemOrder.slice(0, maxItems)"
				:key="item.product.id"
				:item="item"
			/>
			<div
				v-if="order.orderItemOrder.length > maxItems"
				class="col-span-2 text-sm text-gray-600 md:col-span-3"
			>
				<span v-if="order.orderItemOrder.length - maxItems === 1">
					{{ $t('components.order.card.extra_one') }}
				</span>
				<span v-else>
					{{
						$t('components.order.card.extra', {
							count: order.orderItemOrder.length - maxItems
						})
					}}
				</span>
			</div>
		</div>

		<div
			class="order-card-body col-span-2 row-span-2 grid gap-4 md:col-span-3 md:grid-cols-3 md:grid-rows-2"
		>
			<div class="order-card-body-status flex items-center gap-2.5">
				<span :class="statusClass.color">
					{{ order.status }}
				</span>
				<Component :is="statusClass.icon" :class="statusClass.color" />
			</div>

			<div class="order-card-body-id gap-1.25 grid">
				<span class="text-xs text-gray-600">{{ $t('components.order.card.id') }}</span>
				<span class="font-semibold">{{ order.id }}</span>
			</div>

			<div class="order-card-body-address gap-1.25 grid">
				<span class="text-xs text-gray-600">{{
					$t('components.order.card.address')
				}}</span>
				<span>{{ contentShorten(order.fullAddress, 0, 45) }}</span>
			</div>

			<div class="order-card-body-pay_way gap-1.25 grid">
				<span class="text-xs text-gray-600">{{
					$t('components.order.card.pay_way')
				}}</span>
				<span>{{ extractTranslated(order.payWay, 'name', locale) }}</span>
			</div>

			<div class="order-card-body-total_price gap-1.25 grid">
				<span class="text-xs text-gray-600">{{
					$t('components.order.card.total_price')
				}}</span>
				<span class="font-semibold">{{ order.paidAmount }}</span>
			</div>
		</div>

		<div class="order-card-footer col-span-1 grid gap-4 md:col-span-3">
			<div class="order-card-footer-item">
				<UButton
					class="py-1.25 w-full text-sm md:py-2.5"
					:label="$t('components.order.card.actions.details')"
					:to="`/account/orders/${order.id}`"
					size="lg"
				/>
			</div>
		</div>
	</div>
</template>
