import type { LocaleObject } from 'vue-i18n-routing'
import type { ComputedRef } from 'vue'

// and string | LocaleObject
type Locale = LocaleObject & {
	flag: string
	name: string
	code: string
}

export const useLang = () => {
	const { t, locale, setLocale } = useI18n()
	const locales = useI18n().locales as unknown as ComputedRef<Array<Locale>>
	return {
		t,
		locale,
		locales,
		setLocale
	}
}
