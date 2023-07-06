<script lang="ts" setup>
import { PropType } from 'vue'
import { Order } from '~/zod/order/order'
import SentIcon from '~icons/fa6-solid/paper-plane'
import PaidSentIcon from '~icons/fa6-solid/circle-check'
import CanceledSentIcon from '~icons/fa6-solid/circle-xmark'
import PendingSentIcon from '~icons/fa6-solid/clock'
import DefaultSentIcon from '~icons/fa6-solid/circle-question'

const { resolveImageFilenameNoExt, resolveImageFileExtension, resolveImageSrc } =
	useImageResolver()

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

const { t } = useLang()
const { contentShorten } = useText()

const statusClass = computed(() => {
	switch (props.order?.status) {
		case 'Sent':
			return {
				icon: SentIcon,
				color: 'text-blue-500'
			}
		case 'Paid and sent':
			return {
				icon: PaidSentIcon,
				color: 'text-green-500'
			}
		case 'Canceled':
			return {
				icon: CanceledSentIcon,
				color: 'text-red-500'
			}
		case 'Pending':
			return {
				icon: PendingSentIcon,
				color: 'text-gray-500'
			}
		default:
			return {
				icon: DefaultSentIcon,
				color: 'text-gray-500'
			}
	}
})
</script>

<template>
	<div
		class="order__card text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-900/10 dark:border-gray-50/[0.2] rounded"
	>
		<div class="order__card__image">
			<div
				v-for="item in order.orderItemOrder.slice(0, maxItems)"
				:key="item.product.id"
				class="order__card__image__container"
			>
				<NuxtImg
					preload
					placeholder
					loading="lazy"
					provider="mediaStream"
					class="product_img"
					:style="{ objectFit: 'contain' }"
					:width="80"
					:height="80"
					:fit="'contain'"
					:position="'entropy'"
					:background="'transparent'"
					:trim-threshold="5"
					:format="resolveImageFileExtension(item.product.mainImageFilename)"
					sizes="sm:100vw md:50vw lg:80px"
					:src="
						resolveImageSrc(
							item.product.mainImageFilename,
							`media/uploads/products/${resolveImageFilenameNoExt(
								item.product.mainImageFilename
							)}`
						)
					"
					:alt="item.product.name"
				/>
			</div>
			<div
				v-if="order.orderItemOrder.length > maxItems"
				class="order__card__extra__products"
			>
				<span
					v-if="order.orderItemOrder.length - maxItems === 1"
					class="order__card__extra__products__text"
				>
					{{ $t('components.order.card.extra_one') }}
				</span>
				<span v-else class="order__card__extra__products__text">
					{{
						$t('components.order.card.extra', {
							count: order.orderItemOrder.length - maxItems
						})
					}}
				</span>
			</div>
		</div>

		<div class="order__card__body">
			<div class="order__card__body__status">
				<span class="order__card__body__status__text" :class="statusClass.color">
					{{ order.status }}
				</span>
				<Component :is="statusClass.icon" :class="statusClass.color" />
			</div>

			<div class="order__card__body__id">
				<span class="order__card__body__id__title">{{
					$t('components.order.card.id')
				}}</span>
				<span class="order__card__body__id__text">{{ order.id }}</span>
			</div>
			<div class="order__card__body__address">
				<span class="order__card__body__address__title">{{
					$t('components.order.card.address')
				}}</span>
				<span class="order__card__body__address__text">{{
					contentShorten(order.fullAddress, 0, 45)
				}}</span>
			</div>
			<div class="order__card__body__pay_way">
				<span class="order__card__body__pay_way__title">{{
					$t('components.order.card.pay_way')
				}}</span>
				<span class="order__card__body__pay_way__text">{{ order.payWay.name }}</span>
			</div>
			<div class="order__card__body__total_price">
				<span class="order__card__body__total_price__title">{{
					$t('components.order.card.total_price')
				}}</span>
				<span class="order__card__body__total_price__text">{{ order.totalPrice }}</span>
			</div>
		</div>
		<div class="order__card__footer">
			<div class="order__card__footer__item">
				<Button
					:to="{
						name: 'account-order',
						params: { id: order.id }
					}"
					:text="$t('components.order.card.actions.details')"
					:style="'info'"
					size="lg"
					class="order__card__footer__item__link text-sm"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.order__card {
	width: 100%;
	display: grid;
	grid-template-rows: auto;
	grid-template-columns: 160px 1fr auto;
	padding: 1rem;
	gap: 1rem;
	align-items: center;
	@media screen and (min-width: 961px) {
		padding: 40px;
		gap: 40px;
	}
	@media screen and (max-width: 960px) {
		grid-template-columns: 1fr;
		grid-template-rows: repeat(3, auto);
		gap: 0.5rem;
	}
	&__header {
		display: grid;
		gap: 1rem;
		&__item {
			display: grid;
			gap: 0.5rem;
			justify-items: start;
			&__link {
				font-size: 0.8rem;
			}
		}
	}
	&__body {
		display: grid;
		gap: 1rem;
		grid-template-rows: auto auto;
		@media screen and (min-width: 961px) {
			grid-template-columns: 135px 255px 140px;
			grid-column: 2;
			grid-row: 1/3;
		}
		@media screen and (max-width: 960px) {
			gap: 0.5rem;
		}
		&__item {
			display: grid;
			gap: 0.5rem;
			justify-items: start;
		}
		&__status {
			display: flex;
			align-items: center;
			gap: 10px;
			grid-row: 1;
			span {
				font-weight: 600;
			}
		}
		&__id {
			grid-row: 2;
		}
		&__address {
			grid-row: 2;
			grid-template-rows: auto auto;
			align-items: center;
			@media screen and (max-width: 960px) {
				grid-row: 3;
			}
			&__text {
				min-height: 48px;
			}
		}
		&__pay_way {
			grid-row: 2;
			@media screen and (max-width: 960px) {
				grid-row: 4;
			}
		}
		&__total_price {
			grid-row: 2;
			@media screen and (max-width: 960px) {
				grid-row: 5;
			}
		}
		&__id,
		&__address,
		&__pay_way,
		&__total_price {
			display: grid;
			grid-template-rows: 20px 1fr;
			gap: 5px;
			&__title {
				font-weight: 400;
				font-size: 0.8rem;
				color: #999;
				height: 20px;
			}
			&__text {
				font-weight: 600;
			}
		}
	}
	&__footer {
		display: grid;
		gap: 1rem;
		@media screen and (min-width: 961px) {
			align-self: start;
		}
		&__item {
			display: grid;
			gap: 0.5rem;
			justify-items: start;
			&__link {
				font-size: 0.8rem;
				padding-top: 5px;
				padding-bottom: 5px;
				@media screen and (max-width: 960px) {
					width: 100%;
					padding-top: 10px;
					padding-bottom: 10px;
				}
			}
		}
	}
	&__image {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr auto;
		grid-gap: 1rem;
		@media screen and (min-width: 961px) {
			grid-column: 1;
			grid-row: 1 / 3;
		}
		@media screen and (max-width: 960px) {
			grid-template-columns: repeat(3, auto);
			grid-template-rows: auto;
			align-items: center;
			justify-content: center;
		}
	}
	&__extra__products {
		@media screen and (min-width: 961px) {
			grid-column: 1 / 3;
			grid-row: 2;
		}
		&__text {
			font-size: 0.8rem;
			color: #999;
		}
	}
}
</style>
