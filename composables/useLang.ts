import { useI18n } from 'vue-i18n'

export const useLang = () => {
	const { t, locale, locales, setLocale } = useI18n()
	return {
		t,
		locale,
		locales,
		setLocale
	}
}
