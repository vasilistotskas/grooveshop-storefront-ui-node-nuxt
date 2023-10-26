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

const { locale } = useLang()
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
		class="order-card text-primary-700 dark:text-primary-100 bg-white dark:bg-zinc-800 border border-gray-900/10 dark:border-gray-50/[0.2] rounded"
	>
		<div class="order-card-items">
			<OrderCardItem
				v-for="item in order.orderItemOrder.slice(0, maxItems)"
				:key="item.product.id"
				:item="item"
			/>
			<div
				v-if="order.orderItemOrder.length > maxItems"
				class="order-card-extra-products"
			>
				<span
					v-if="order.orderItemOrder.length - maxItems === 1"
					class="order-card-extra-products-text"
				>
					{{ $t('components.order.card.extra_one') }}
				</span>
				<span v-else class="order-card-extra-products-text">
					{{
						$t('components.order.card.extra', {
							count: order.orderItemOrder.length - maxItems
						})
					}}
				</span>
			</div>
		</div>

		<div class="order-card-body">
			<div class="order-card-body-status">
				<span class="order-card-body-status-text" :class="statusClass.color">
					{{ order.status }}
				</span>
				<Component :is="statusClass.icon" :class="statusClass.color" />
			</div>

			<div class="order-card-body-id">
				<span class="order-card-body-id-title">{{ $t('components.order.card.id') }}</span>
				<span class="order-card-body-id-text">{{ order.id }}</span>
			</div>
			<div class="order-card-body-address">
				<span class="order-card-body-address-title">{{
					$t('components.order.card.address')
				}}</span>
				<span class="order-card-body-address-text">{{
					contentShorten(order.fullAddress, 0, 45)
				}}</span>
			</div>
			<div class="order-card-body-pay_way">
				<span class="order-card-body-pay_way-title">{{
					$t('components.order.card.pay_way')
				}}</span>
				<span class="order-card-body-pay_way-text">{{
					extractTranslated(order.payWay, 'name', locale)
				}}</span>
			</div>
			<div class="order-card-body-total_price">
				<span class="order-card-body-total_price-title">{{
					$t('components.order.card.total_price')
				}}</span>
				<span class="order-card-body-total_price-text">{{ order.paidAmount }}</span>
			</div>
		</div>
		<div class="order-card-footer">
			<div class="order-card-footer-item">
				<MainButton
					:to="{
						name: 'account-order',
						params: { id: order.id }
					}"
					:text="$t('components.order.card.actions.details')"
					:style="'info'"
					size="lg"
					class="order-card-footer-item-link text-sm"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.order-card {
	width: 100%;
	display: grid;
	grid-template-rows: auto;
	grid-template-columns: 160px 1fr auto;
	padding: 1rem;
	gap: 1rem;
	align-items: center;

	@media screen and (width >= 961px) {
		padding: 40px;
		gap: 40px;
	}

	@media screen and (width <= 960px) {
		grid-template-columns: 1fr;
		grid-template-rows: repeat(3, auto);
		gap: 0.5rem;
	}

	&-header {
		display: grid;
		gap: 1rem;

		&-item {
			display: grid;
			gap: 0.5rem;
			justify-items: start;

			&-link {
				font-size: 0.8rem;
			}
		}
	}

	&-body {
		display: grid;
		gap: 1rem;
		grid-template-rows: auto auto;

		@media screen and (width >= 961px) {
			grid-template-columns: 135px 255px 140px;
			grid-column: 2;
			grid-row: 1/3;
		}

		@media screen and (width <= 960px) {
			gap: 0.5rem;
		}

		&-item {
			display: grid;
			gap: 0.5rem;
			justify-items: start;
		}

		&-status {
			display: flex;
			align-items: center;
			gap: 10px;
			grid-row: 1;

			span {
				font-weight: 600;
			}
		}

		&-id {
			grid-row: 2;
		}

		&-address {
			grid-row: 2;
			grid-template-rows: auto auto;
			align-items: center;

			@media screen and (width <= 960px) {
				grid-row: 3;
			}

			&-text {
				min-height: 48px;
			}
		}

		&-pay_way {
			grid-row: 2;

			@media screen and (width <= 960px) {
				grid-row: 4;
			}
		}

		&-total_price {
			grid-row: 2;

			@media screen and (width <= 960px) {
				grid-row: 5;
			}
		}

		&-id,
		&-address,
		&-pay_way,
		&-total_price {
			display: grid;
			grid-template-rows: 20px 1fr;
			gap: 5px;

			&-title {
				font-weight: 400;
				font-size: 0.8rem;
				color: #999;
				height: 20px;
			}

			&-text {
				font-weight: 600;
			}
		}
	}

	&-footer {
		display: grid;
		gap: 1rem;

		@media screen and (width >= 961px) {
			align-self: start;
		}

		&-item {
			display: grid;
			gap: 0.5rem;
			justify-items: start;

			&-link {
				font-size: 0.8rem;
				padding-top: 5px;
				padding-bottom: 5px;

				@media screen and (width <= 960px) {
					width: 100%;
					padding-top: 10px;
					padding-bottom: 10px;
				}
			}
		}
	}

	&-items {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr auto;
		grid-gap: 1rem;

		@media screen and (width >= 961px) {
			grid-column: 1;
			grid-row: 1 / 3;
		}

		@media screen and (width <= 960px) {
			grid-template-columns: repeat(3, auto);
			grid-template-rows: auto;
			align-items: center;
			justify-content: center;
		}
	}

	&-extra-products {
		@media screen and (width >= 961px) {
			grid-column: 1 / 3;
			grid-row: 2;
		}

		&-text {
			font-size: 0.8rem;
			color: #999;
		}
	}
}
</style>
