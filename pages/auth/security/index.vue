<script lang="ts" setup>
const config = useRuntimeConfig()
const { t, locale } = useLang()
const breadcrumbUi = useBreadcrumbsUi()

const items = defineBreadcrumbItems([
	{
		to: '/',
		ariaLabel: t('seoUi.breadcrumb.items.index.ariaLabel'),
		icon: 'material-symbols:home-outline-rounded'
	},
	{
		to:
			locale.value === config.public.defaultLocale
				? '/auth/security'
				: `/${locale.value}/auth/security`,
		label: t('seoUi.breadcrumb.items.auth.security.label'),
		current: true
	}
])

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<SBreadcrumb id="sub" :items="items" :ui="breadcrumbUi" />
		<PageHeader class="pb-4">
			<PageTitle :text="$t('pages.auth.security.title')" />
		</PageHeader>
		<nav class="auth-security-navbar">
			<ul role="tablist" class="auth-security-navbar-list">
				<li role="tab" class="auth-security-navbar-list-item">
					<Anchor
						:to="`/auth/security/general`"
						:aria-label="$t('pages.auth.security.general.title')"
						:title="$t('pages.auth.security.general.title')"
						class="auth-security-navbar-list-item-link"
					>
						<span class="text-black dark:text-white">
							{{ $t('pages.auth.security.general.title') }}
						</span>
					</Anchor>
				</li>
				<li role="tab" class="auth-security-navbar-list-item">
					<Anchor
						:to="`/auth/security/mfa`"
						:aria-label="$t('pages.auth.security.mfa.title')"
						:title="$t('pages.auth.security.mfa.title')"
						class="auth-security-navbar-list-item-link"
					>
						<span class="text-black dark:text-white">
							{{ $t('pages.auth.security.mfa.title') }}
						</span>
					</Anchor>
				</li>
			</ul>
		</nav>
		<PageBody> </PageBody>
	</PageWrapper>
</template>

<style lang="scss" scoped>
.auth-security-navbar {
	position: fixed;
	top: 56px;
	left: 0;
	z-index: 10;
	width: 100%;
	box-shadow: 0 2px 4px 0 #dcdcdc;
	background-color: #fff;

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
