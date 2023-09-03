import { GlobalEvents } from '~/events/global'

export type IThemeStrategyOptions = 'dark' | 'light' | 'system' | 'realtime'

export type IThemeValue = 'dark' | 'light'

export interface IThemeEventPayload {
	themeStrategy: IThemeStrategyOptions
	themeValue?: IThemeValue | null
}

export const availableThemes: {
	key: IThemeStrategyOptions
	text: string
}[] = [
	{ key: 'light', text: 'Light' },
	{ key: 'dark', text: 'Dark' },
	{ key: 'system', text: 'System' },
	{ key: 'realtime', text: 'Realtime' }
]

export function ThemeManager() {
	// composable
	const themeUserStrategy = useCookie<IThemeStrategyOptions>('theme')
	const defaultTheme = (process.env.NUXT_PUBLIC_DEFAULT_THEME || 'light') as IThemeValue

	// methods
	const getUserStrategy = (): IThemeStrategyOptions => themeUserStrategy.value || 'system'
	const getSystemTheme = (): IThemeValue => {
		try {
			return window
				? window.matchMedia('(prefers-color-scheme: dark)').matches
					? 'dark'
					: 'light'
				: defaultTheme
		} catch (error) {
			return defaultTheme
		}
	}

	// state
	const themeStrategy = useState<IThemeStrategyOptions>('theme.strategy', () =>
		getUserStrategy()
	)
	const themeCurrent = useState<IThemeValue>('theme.current', () => getSystemTheme())

	// watchers
	const onThemeStrategyChange = (eventPayload: IThemeEventPayload) => {
		switch (eventPayload.themeStrategy) {
			case 'dark':
				themeCurrent.value = 'dark'
				break
			case 'light':
				themeCurrent.value = 'light'
				break
			case 'system':
				themeCurrent.value = getSystemTheme()
				break
			case 'realtime':
				themeCurrent.value = eventPayload.themeValue || defaultTheme
				break
			default:
				themeCurrent.value = defaultTheme
				break
		}

		themeUserStrategy.value = eventPayload.themeStrategy
	}

	const bus = useEventBus<string>(GlobalEvents.ON_THEME_UPDATED)
	bus.on((event: string, payload: IThemeEventPayload) => {
		if (event === 'change') {
			onThemeStrategyChange(payload)
		}
	})

	// init theme
	const init = () => {
		themeStrategy.value = getUserStrategy()
	}
	onThemeStrategyChange({ themeStrategy: themeStrategy.value })

	// lifecycle
	onBeforeMount(() => init())

	return {
		themeStrategy,
		themeCurrent,
		getUserStrategy,
		getSystemTheme
	}
}
