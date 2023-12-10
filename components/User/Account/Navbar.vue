<template>
	<nav class="user-account-navbar">
		<ul role="tablist" class="user-account-navbar-list">
			<li role="tab" class="user-account-navbar-list-item">
				<Anchor
					:to="`/account/settings`"
					:aria-label="$t('pages.account.settings.title')"
					:title="$t('pages.account.settings.title')"
					class="user-account-navbar-list-item-link"
				>
					<span class="text-black dark:text-white">
						{{ $t('pages.account.settings.title') }}
					</span>
				</Anchor>
			</li>
			<li role="tab" class="user-account-navbar-list-item">
				<Anchor
					:to="`/account/addresses`"
					:aria-label="$t('pages.account.settings.title')"
					:title="$t('pages.account.addresses.title')"
					class="user-account-navbar-list-item-link"
				>
					<span class="text-black dark:text-white">
						{{ $t('pages.account.addresses.title') }}
					</span>
				</Anchor>
			</li>
		</ul>
	</nav>
</template>

<style lang="scss" scoped>
.user-account-navbar {
	position: fixed;
	top: 65px;
	left: 0;
	z-index: 10;
	width: 100%;
	@apply bg-white dark:bg-zinc-800;

	@media screen and (width >= 1020px) {
		position: static;
		width: auto;
		border-bottom: 1px solid #dcdcdc;
		box-shadow: none;
		background-color: transparent;
	}

	@media screen and (width <= 1020px) {
		padding-left: 1rem;
		padding-right: 1rem;
	}

	&-list {
		-ms-overflow-style: none;
		scrollbar-width: none;
		display: -webkit-box;
		display: flex;
		gap: 1rem;
		position: relative;
		overflow-x: auto;
		scroll-snap-type: x mandatory;

		@media screen and (width >= 1020px) {
			-webkit-box-pack: start;
			-ms-flex-pack: start;
			justify-content: flex-start;
		}

		&-item {
			&-link {
				font-size: 14px;
				line-height: 18px;
				display: block;
				outline: 0;
				padding: 16px 0;
				white-space: nowrap;
				color: #999;

				@media screen and (width <= 1020px) {
					padding: 8px 0;
				}

				&.router-link-active {
					span {
						@apply font-bold;
					}
				}
			}
		}
	}
}
</style>
