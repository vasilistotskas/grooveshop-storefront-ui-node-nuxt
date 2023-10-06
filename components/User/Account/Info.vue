<script lang="ts" setup>
import { PropType } from 'vue'
import { Account } from '~/types/user/account'

const props = defineProps({
	account: {
		type: Object as PropType<Account>,
		required: true
	},
	ordersCount: {
		type: Number,
		required: false,
		default: 0
	},
	favouritesCount: {
		type: Number,
		required: false,
		default: 0
	},
	reviewsCount: {
		type: Number,
		required: false,
		default: 0
	}
})
</script>

<template>
	<div class="user-info">
		<div class="user-info-container">
			<div class="user-info-avatar">
				<UserAvatar
					:user-account="account"
					:img-width="135"
					:img-height="135"
					:show-name="false"
					:background-border="true"
					:change-avatar="true"
				/>
			</div>
			<div class="user-info-name">
				<h1 class="text-2xl font-bold text-primary-900 dark:text-primary-100">
					{{ account.firstName }} {{ account.lastName }}
				</h1>
			</div>
			<div class="user-info-stats">
				<div class="user-info-stats-item">
					<Anchor
						class="user-info-stats-item-link"
						:to="`/account/orders`"
						:title="$t('pages.account.orders.title')"
					>
						<IconMdi:packageVariantClosed
							class="text-primary-500 dark:text-primary-400 text-xl md:text-2xl"
						/>
						<span class="text-primary-500 dark:text-primary-400">{{
							$t('pages.account.orders.title')
						}}</span>
						<span class="text-primary-900 dark:text-primary-100 font-bold text-2xl">{{
							ordersCount
						}}</span>
					</Anchor>
				</div>
				<div class="user-info-stats-item">
					<Anchor
						class="user-info-stats-item-link"
						:to="`/account/favourites`"
						:title="$t('pages.account.favourites.title')"
					>
						<IconMdi:heartOutline
							class="text-primary-500 dark:text-primary-400 text-xl md:text-2xl"
						/>
						<span class="text-primary-500 dark:text-primary-400">{{
							$t('pages.account.favourites.title')
						}}</span>
						<span class="text-primary-900 dark:text-primary-100 font-bold text-2xl">{{
							favouritesCount
						}}</span>
					</Anchor>
				</div>
				<div class="user-info-stats-item">
					<Anchor
						class="user-info-stats-item-link"
						:to="`/account/reviews`"
						:title="$t('pages.account.reviews.title')"
					>
						<IconMdi:starOutline
							class="text-primary-500 dark:text-primary-400 text-xl md:text-2xl"
						/>
						<span class="text-primary-500 dark:text-primary-400">{{
							$t('pages.account.reviews.title')
						}}</span>
						<span class="text-primary-900 dark:text-primary-100 font-bold text-2xl">{{
							reviewsCount
						}}</span>
					</Anchor>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.user {
	&-info {
		width: calc(100% - 128px);
		margin: 0 auto;
		display: grid;
		align-items: center;
		z-index: 20;

		@media screen and (width <= 767px) {
			width: calc(100% - 16px);
		}

		&-container {
			display: flex;
			align-items: center;
			padding-top: 1.5rem;
			padding-bottom: 1.5rem;
			gap: 2rem;

			@media screen and (width <= 767px) {
				display: grid;
				justify-items: center;
				align-items: center;
				justify-content: center;
				padding-top: 1rem;
				padding-bottom: 1rem;
				gap: 1rem;
			}
		}

		&-name {
			font-size: 1.25rem;
			font-weight: 600;

			@media screen and (width <= 767px) {
				grid-row: 1 / span 1;
				grid-column: 2 / span 1;
			}
		}

		&-stats {
			display: grid;
			align-items: center;
			margin-left: auto;
			gap: 1rem;
			grid-template-columns: repeat(3, minmax(110px, 1fr));

			@media screen and (width <= 767px) {
				width: 100%;
				grid-template-columns: repeat(3, 1fr);
				grid-row: 2 / span 1;
				grid-column: 1 / span 2;
			}

			&-item {
				&-link {
					display: flex;
					flex-direction: column;
					padding: 1rem;
					align-items: center;
					margin-left: 1rem;

					&:first-child {
						margin-left: 0;
					}

					& > svg {
						margin: 0;
					}
				}
			}
		}

		&-avatar {
			@media screen and (width <= 767px) {
				grid-row: 1 / span 1;
				grid-column: 1 / span 1;
			}
		}
	}
}
</style>
