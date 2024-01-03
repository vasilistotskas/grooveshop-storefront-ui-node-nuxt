<script lang="ts" setup>
import type { LocaleObject } from 'vue-i18n-routing'
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/vue'

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
					class="text-primary-700 dark:text-primary-100 justify-center items-center flex"
				>
					<UIcon name="i-heroicons-language" />
				</span>
			</ListboxButton>
			<ListboxOptions
				v-if="availableLocales.length > 0"
				id="language-switcher-options"
				class="p-1 absolute z-50 top-full right-0 outline-none bg-white rounded-lg ring-1 ring-gray-900/10 shadow-lg overflow-hidden w-36 py-1 text-lg text-primary-700 font-semibold dark:bg-zinc-800 dark:ring-0 dark:highlight-white/5 dark:text-primary-300"
			>
				<ListboxOption
					v-for="lang in availableLocales"
					:id="`language-switcher-${lang.code}`"
					:key="lang.code"
					:value="lang.code"
					:class="{
						'py-2 px-2 flex items-center cursor-pointer': true,
						'text-sky-500 bg-zinc-100 dark:bg-zinc-600/30': locale === lang.code,
						'hover:bg-zinc-50 dark:hover:bg-zinc-700/30': locale !== lang.code
					}"
					@click="navigateToLocale(lang.code)"
				>
					<NuxtLink :to="switchLocalePath(lang.code)">
						<span class="text-primary-700 dark:text-primary-100 text-lg mr-2">
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
			class="w-full px-2 pr-3 py-1 outline-none rounded border bg-transparent text-primary-700 dark:text-primary-300 border-gray-900/10 dark:border-gray-50/[0.2]"
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
					{{ lang.flag }} {{ lang.name }} ({{ lang.code }})
				</NuxtLink>
			</option>
		</select>
	</div>
</template>
