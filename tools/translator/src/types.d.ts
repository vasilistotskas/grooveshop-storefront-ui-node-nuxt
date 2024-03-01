/* eslint-disable no-console */
import type { ILogObj, ISettingsParam } from 'tslog'

export type debugMode = 'progress-bar' | 'logger' | 'hidden'
export type translateEngine = 'google' | 'deepl' | 'libre' | 'yandex'

export interface LocaleFile {
	path: string
	lang: string
	dir: string
}

export interface Config<LogObj = ILogObj> {
	localePath: string
	sourceFileName: string
	translate?: {
		engine?: translateEngine
		bundleDelay?: number
		bundleMaxRetries?: number
	}
	logger?: Partial<ISettingsParam<LogObj>>
	debug?: {
		mode: debugMode
	}
}
