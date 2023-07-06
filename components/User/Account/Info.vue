<script lang="ts" setup>
import { PropType } from 'vue'
import { Account } from '~/zod/user/account'

const { t } = useLang()
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
	<div class="user__info">
		<div class="user__info__container">
			<div class="user__info__avatar">
				<UserAvatar
					:user-account="account"
					:img-width="135"
					:img-height="135"
					:show-name="false"
					:background-border="true"
					:change-avatar="true"
				/>
			</div>
			<div class="user__info__name">
				<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
					{{ account.firstName }} {{ account.lastName }}
				</h1>
			</div>
			<div class="user__info__stats">
				<div class="user__info__stats__item">
					<Anchor
						class="user__info__stats__item__link"
						:to="`/account/orders`"
						:title="$t('pages.account.orders.title')"
					>
						<IconMdi:packageVariantClosed
							class="text-gray-500 dark:text-gray-400 text-xl md:text-2xl"
						/>
						<span class="text-gray-500 dark:text-gray-400">{{
							$t('pages.account.orders.title')
						}}</span>
						<span class="text-gray-900 dark:text-gray-100 font-bold text-2xl">{{
							ordersCount
						}}</span>
					</Anchor>
				</div>
				<div class="user__info__stats__item">
					<Anchor
						class="user__info__stats__item__link"
						:to="`/account/favourites`"
						:title="$t('pages.account.favourites.title')"
					>
						<IconMdi:heartOutline
							class="text-gray-500 dark:text-gray-400 text-xl md:text-2xl"
						/>
						<span class="text-gray-500 dark:text-gray-400">{{
							$t('pages.account.favourites.title')
						}}</span>
						<span class="text-gray-900 dark:text-gray-100 font-bold text-2xl">{{
							favouritesCount
						}}</span>
					</Anchor>
				</div>
				<div class="user__info__stats__item">
					<Anchor
						class="user__info__stats__item__link"
						:to="`/account/reviews`"
						:title="$t('pages.account.reviews.title')"
					>
						<IconMdi:starOutline
							class="text-gray-500 dark:text-gray-400 text-xl md:text-2xl"
						/>
						<span class="text-gray-500 dark:text-gray-400">{{
							$t('pages.account.reviews.title')
						}}</span>
						<span class="text-gray-900 dark:text-gray-100 font-bold text-2xl">{{
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
	&__info {
		width: calc(100% - 128px);
		margin: 0 auto;
		display: grid;
		align-items: center;
		z-index: 20;
		@media screen and (max-width: 767px) {
			width: calc(100% - 16px);
		}
		&__container {
			display: flex;
			align-items: center;
			padding-top: 1.5rem;
			padding-bottom: 1.5rem;
			gap: 2rem;
			@media screen and (max-width: 767px) {
				display: grid;
				justify-items: center;
				align-items: center;
				justify-content: center;
				padding-top: 1rem;
				padding-bottom: 1rem;
				gap: 1rem;
			}
		}
		&__name {
			font-size: 1.25rem;
			font-weight: 600;
		}
		&__stats {
			display: grid;
			align-items: center;
			margin-left: auto;
			gap: 1rem;
			grid-template-columns: repeat(3, minmax(110px, 1fr));
			@media screen and (max-width: 767px) {
				width: 100%;
				grid-template-columns: repeat(3, 1fr);
			}
			&__item {
				&__link {
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
		&__avatar {
			@media screen and (max-width: 767px) {
				grid-row: 1 / span 1;
				grid-column: 1 / span 1;
			}
		}
		&__name {
			@media screen and (max-width: 767px) {
				grid-row: 1 / span 1;
				grid-column: 2 / span 1;
			}
		}
		&__stats {
			@media screen and (max-width: 767px) {
				grid-row: 2 / span 1;
				grid-column: 1 / span 2;
			}
		}
	}
}
</style>
