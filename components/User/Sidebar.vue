<script lang="ts" setup>
import type { FunctionalComponent, SVGAttributes } from 'vue'
import ordersIcon from '~icons/mdi/package-variant-closed'
import favouritesIcon from '~icons/mdi/heart-outline'
import reviewsIcon from '~icons/mdi/star-outline'
import settingsIcon from '~icons/mdi/cog-outline'
import helpIcon from '~icons/mdi/help-circle-outline'

interface IMenuItem {
	type: 'link' | 'button' | 'external-link'
	text: string
	href?: string
	route?: { name: string; path: string }
	icon?: FunctionalComponent<SVGAttributes>
	cssClass?: string
}

defineProps({
	mode: {
		type: String,
		default: 'normal'
	}
})

const { t } = useI18n()
const route = useRoute()

const menus = computed((): IMenuItem[] => [
	{
		type: 'link',
		text: t('pages.account.orders.title'),
		route: { name: 'account-orders', path: '/account/orders' },
		icon: ordersIcon,
		cssClass:
			'text-primary-700 dark:text-primary-100 bg-zinc-200 border-gray-200 hover:bg-zinc-300 dark:border-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700'
	},
	{
		type: 'link',
		text: t('pages.account.favourites.title'),
		route: { name: 'account-favourites', path: '/account/favourites' },
		icon: favouritesIcon,
		cssClass:
			'text-primary-700 dark:text-primary-100 bg-zinc-200 border-gray-200 hover:bg-zinc-300 dark:border-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700'
	},
	{
		type: 'link',
		text: t('pages.account.reviews.title'),
		route: { name: 'account-reviews', path: '/account/reviews' },
		icon: reviewsIcon,
		cssClass:
			'text-primary-700 dark:text-primary-100 bg-zinc-200 border-gray-200 hover:bg-zinc-300 dark:border-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700'
	},
	{
		type: 'link',
		text: t('pages.account.settings.title'),
		route: { name: 'account-settings', path: '/account/settings' },
		icon: settingsIcon,
		cssClass:
			'text-primary-700 dark:text-primary-100 bg-zinc-200 border-gray-200 hover:bg-zinc-300 dark:border-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700'
	},
	{
		type: 'link',
		text: t('pages.account.help.title'),
		route: { name: 'account-help', path: '/account/help' },
		icon: helpIcon,
		cssClass:
			'text-primary-700 dark:text-primary-100 bg-zinc-200 border-gray-200 hover:bg-zinc-300 dark:border-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700'
	}
])

const sidebar = ref(null)
onMounted(() => {
	if (!sidebar.value) return
	const { onScroll } = useSticky(sidebar.value as HTMLElement, 150)
	setTimeout(() => onScroll(), 50)
})
</script>

<template>
	<div
		ref="sidebar"
		:class="[
			{
				'transition-all duration-300 ease-in-out': true,
				'sidebar lg:w-30 md:hidden md:h-fit lg:flex xl:w-60': mode === 'normal',
				'relative flex w-full flex-1 flex-col': mode === 'mobile',
				'relative grid w-full': route.path === '/account'
			}
		]"
	>
		<div class="flex-1 overflow-y-auto py-2 pl-4 pr-4 lg:pl-0">
			<ul class="grid gap-2 md:gap-4">
				<li
					v-for="(item, i) in menus"
					:key="i"
					class="rounded border border-gray-700 bg-zinc-100 p-2 dark:bg-zinc-800 md:border-transparent md:bg-transparent md:p-0 md:dark:bg-transparent"
				>
					<Anchor
						v-if="item.type === 'link'"
						:to="item.route ? item.route : undefined"
						:text="item.text"
						class="group grid grid-cols-auto-1fr items-center gap-4 p-2 hover:no-underline"
					>
						<div
							class="dark:group-hover:highlight-white/10 dark:highlight-white/10 flex items-center rounded-md px-2 py-2 shadow-sm ring-1 ring-slate-900/5 group-hover:shadow group-hover:shadow-sky-200 group-hover:ring-slate-900/10 dark:shadow-none dark:ring-0 dark:group-hover:shadow-none"
							:class="{
								'bg-sky-500 text-white group-hover:bg-sky-500 dark:text-white':
									route.path === item.route?.path,
								'dark:text-primary-100 bg-zinc-100 text-slate-500 group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-600':
									route.path !== item.route?.path
							}"
						>
							<Component :is="item.icon" class="text-2xl md:text-xl" />
						</div>
						<span
							class="text-primary-700 dark:text-primary-100 text-2xl font-semibold capitalize md:text-xl"
							:class="{
								'font-extrabold text-sky-500 dark:text-sky-400':
									route.path === item.route?.path
							}"
						>
							{{ item.text }}
						</span>
					</Anchor>
					<Anchor
						v-else-if="item.type === 'external-link'"
						:href="item.href"
						:text="item.text"
						class="group grid grid-cols-auto-1fr items-center gap-4 p-2 hover:no-underline"
					>
						<div
							class="dark:group-hover:highlight-white/10 dark:highlight-white/10 flex items-center rounded-md px-2 py-2 shadow-sm ring-1 ring-slate-900/5 group-hover:shadow group-hover:shadow-sky-200 group-hover:ring-slate-900/10 dark:shadow-none dark:ring-0 dark:group-hover:shadow-none"
							:class="{
								'bg-sky-500 text-white group-hover:bg-sky-500 dark:text-white':
									item.route?.path === route.path,
								'dark:text-primary-100 bg-zinc-100 text-slate-500 group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-600':
									item.route?.path !== route.path
							}"
						>
							<Component :is="item.icon" class="text-2xl md:text-xl" />
						</div>
						<span
							class="text-primary-700 dark:text-primary-100 text-2xl font-semibold capitalize md:text-xl"
							:class="{
								'font-extrabold text-sky-500 dark:text-sky-400':
									item.route?.path === route.path
							}"
						>
							{{ item.text }}
						</span>
					</Anchor>
				</li>
			</ul>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.sidebar {
	&.sticky {
		top: 7rem;
	}
}
</style>
