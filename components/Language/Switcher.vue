<script lang="ts" setup>
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue'
import type { LocaleObject } from 'vue-i18n-routing'

type Locale = LocaleObject & {
	flag: string
}

const props = defineProps({
	type: {
		type: String,
		default: 'dropdown-right-top'
	}
})

const currentStyle = toRef(props, 'type')

const { locale, locales, setLocale } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const allLocales = locales as unknown as Locale[]

const availableLocales = computed(() => {
	const l = locales.value as Locale[]
	return l.filter((i) => i.code !== locale.value)
})

const navigateToLocale = (code: string) => {
	setLocale(code)
}
const onLocaleChange = (event: Event) => {
	const target = event.target as HTMLSelectElement
	navigateToLocale(target.value)
}
</script>

<template>
	<div class="flex items-center">
		<Listbox
			v-if="currentStyle === 'dropdown-right-top'"
			as="div"
			class="relative flex items-center"
		>
			<ListboxButton
				id="language-switcher"
				type="button"
				:title="$t('common.change.language')"
				class="text-[1.5rem] transition-colors duration-300"
			>
				<span class="sr-only">{{
					$t('components.language.switcher.change_language')
				}}</span>
				<span
					class="text-primary-700 dark:text-primary-100 flex items-center justify-center"
				>
					<UIcon name="i-heroicons-language" />
				</span>
			</ListboxButton>
			<ListboxOptions
				v-if="availableLocales.length > 0"
				id="language-switcher-options"
				class="text-primary-700 dark:highlight-white/5 dark:text-primary-300 absolute right-0 top-full z-50 w-36 overflow-hidden rounded-lg bg-white p-1 py-1 text-lg font-semibold shadow-lg outline-none ring-1 ring-gray-900/10 dark:bg-zinc-800 dark:ring-0"
			>
				<ListboxOption
					v-for="lang in availableLocales"
					:id="`language-switcher-${lang.code}`"
					:key="lang.code"
					:value="lang.code"
					:class="{
						'flex cursor-pointer items-center px-2 py-2': true,
						'bg-zinc-100 text-sky-500 dark:bg-zinc-600/30': locale === lang.code,
						'hover:bg-zinc-50 dark:hover:bg-zinc-700/30': locale !== lang.code
					}"
					@click="navigateToLocale(lang.code)"
				>
					<NuxtLink :to="switchLocalePath(lang.code)">
						<span class="text-primary-700 dark:text-primary-100 mr-2 text-lg">
							{{ lang.flag }}
						</span>
						<span class="text-primary-700 dark:text-primary-100 flex-1 truncate text-sm">
							{{ lang.name }}
							<span class="text-primary-700 dark:text-primary-100 text-xs"
								>({{ lang.code }})</span
							>
						</span>
					</NuxtLink>
				</ListboxOption>
			</ListboxOptions>
		</Listbox>
		<select
			v-if="currentStyle === 'select-box' && availableLocales.length > 0"
			class="text-primary-700 dark:text-primary-300 w-full rounded border border-gray-900/10 bg-transparent px-2 py-1 pr-3 outline-none dark:border-gray-50/[0.2]"
			:value="locale"
			@change="onLocaleChange"
		>
			<option
				v-for="lang in allLocales"
				:key="lang.code"
				:value="lang.code"
				class="flex items-center space-x-2"
				@click="navigateToLocale(lang.code)"
			>
				<NuxtLink :to="switchLocalePath(lang.code)">
					{{ lang.name }} ({{ lang.code }})
				</NuxtLink>
			</option>
		</select>
	</div>
</template>
