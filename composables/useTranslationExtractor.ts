type TranslationObject =
	| ({
			translations: Record<string, Record<string, unknown>>
			// eslint-disable-next-line no-mixed-spaces-and-tabs
	  } & Record<string, unknown>)
	| null

export const useTranslationExtractor = <T extends TranslationObject | undefined>() => {
	const extractTranslated = (object: T, field: string, locale: string) => {
		if (!object) {
			return ''
		}
		const translations = object.translations
		if (translations) {
			const translation = translations[locale]
			if (translation) {
				return translation[field] as string
			}
			return ''
		}
		return ''
	}
	return { extractTranslated }
}
