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

const { t } = useLang()
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
				'sidebar md:hidden lg:flex lg:w-30 xl:w-60 md:h-fit': mode === 'normal',
				'relative flex-1 flex flex-col w-full': mode === 'mobile',
				'grid relative w-full': route.path === '/account'
			}
		]"
	>
		<div class="flex-1 overflow-y-auto pl-4 lg:pl-0 pr-4 py-2">
			<ul class="grid gap-2 md:gap-4">
				<li
					v-for="(item, i) in menus"
					:key="i"
					class="p-2 md:p-0 bg-zinc-100 md:bg-transparent dark:bg-zinc-800 md:dark:bg-transparent border border-gray-700 md:border-transparent rounded"
				>
					<Anchor
						v-if="item.type === 'link'"
						:to="item.route ? item.route : undefined"
						:text="item.text"
						class="group grid p-2 grid-cols-auto-1fr gap-4 items-center hover:no-underline"
					>
						<div
							class="flex items-center px-2 py-2 rounded-md ring-1 ring-slate-900/5 shadow-sm group-hover:shadow group-hover:ring-slate-900/10 dark:ring-0 dark:shadow-none dark:group-hover:shadow-none dark:group-hover:highlight-white/10 group-hover:shadow-sky-200 dark:highlight-white/10"
							:class="{
								'text-white dark:text-white group-hover:bg-sky-500 bg-sky-500':
									route.path === item.route?.path,
								'text-slate-500 dark:text-primary-100 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-600 bg-zinc-100 dark:bg-zinc-800':
									route.path !== item.route?.path
							}"
						>
							<Component :is="item.icon" class="text-2xl md:text-xl" />
						</div>
						<span
							class="text-2xl md:text-xl font-semibold capitalize text-primary-700 dark:text-primary-100"
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
						class="group grid p-2 grid-cols-auto-1fr gap-4 items-center hover:no-underline"
					>
						<div
							class="flex items-center px-2 py-2 rounded-md ring-1 ring-slate-900/5 shadow-sm group-hover:shadow group-hover:ring-slate-900/10 dark:ring-0 dark:shadow-none dark:group-hover:shadow-none dark:group-hover:highlight-white/10 group-hover:shadow-sky-200 dark:highlight-white/10"
							:class="{
								'text-white dark:text-white group-hover:bg-sky-500 bg-sky-500':
									item.route?.path === route.path,
								'text-slate-500 dark:text-primary-100 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-600 bg-zinc-100 dark:bg-zinc-800':
									item.route?.path !== route.path
							}"
						>
							<Component :is="item.icon" class="text-2xl md:text-xl" />
						</div>
						<span
							class="text-2xl md:text-xl font-semibold capitalize text-primary-700 dark:text-primary-100"
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
