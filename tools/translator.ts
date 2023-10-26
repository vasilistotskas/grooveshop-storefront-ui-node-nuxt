/* eslint-disable no-console */
import path from 'path'
import * as fs from 'fs'

import yaml from 'js-yaml'

const args = process.argv.slice(2)

// funcs
const getArg = (index: number, def: string): string => {
	try {
		if (!args[index] && !def) throw new Error('Argument not found')
		return args[index] || def
	} catch (error) {
		console.error(`Missing argument ${index}`)
		process.exit(1)
	}
}

interface LocaleFile {
	path: string
	lang: string
}

const getFiles = (dir: string): LocaleFile[] => {
	const files: LocaleFile[] = []
	fs.readdirSync(dir).forEach((file: string) => {
		const filePath = path.join(dir, file)
		const stat = fs.statSync(filePath)
		if (stat.isFile() && file.endsWith('.yml'))
			files.push({
				path: filePath,
				lang: file.replace('.yml', '')
			})
	})
	return files
}

const translateFile = async (
	file: Record<string, unknown>,
	locale: LocaleFile
): Promise<Record<string, unknown>> => {
	// file is nested object string
	// for each all file object child and translate
	const translatedRes: Record<string, unknown> = {}
	const translate = (await import('translate')).default // Use dynamic import

	const eachCurrLevel = async (
		obj: Record<string, unknown>,
		parentKey: string
	): Promise<void> => {
		for (const key in obj) {
			const value = obj[key]
			const nextParent = parentKey ? `${parentKey}.${key}` : key
			if (typeof value === 'string') {
				translatedRes[`${nextParent}`] = await translate(value, {
					to: locale.lang || 'en-US',
					engine: 'google'
				})
			} else if (typeof value === 'object') {
				await eachCurrLevel(value as Record<string, unknown>, `${nextParent}`)
			}
		}
	}
	await eachCurrLevel(file, '')

	// parse
	const parseObjLevel: Record<string, unknown> = {}
	let parsedObj: Record<string, unknown> = {}
	for (const key in translatedRes) {
		let value = translatedRes[key]
		const keySplit = key.split('.')
		const keyLevel = keySplit.length

		if (typeof value === 'string') value = `${value}`.toLowerCase()

		let currParent = parseObjLevel
		for (let i = 0; i < keyLevel; i++) {
			const currKey = keySplit[i]
			if (!currParent[currKey]) currParent[currKey] = {}
			if (i === keyLevel - 1) currParent[currKey] = value
			currParent = currParent[currKey] as Record<string, unknown>
		}

		parsedObj = parseObjLevel
	}

	// return
	return parseObjLevel
}

// vars
const cwd = process.cwd()
const localePath = path.join(cwd, getArg(0, './locales'))
const engLocale = path.join(localePath, 'en-US.yml')
const listLocaleToTranslate = getFiles(localePath).filter((l) => l.lang !== 'en-US')

// main funcs
async function main(): Promise<void> {
	// info
	console.log('==============================================')
	console.log(`Target Locales Path: ${localePath}`)
	console.log(`Main Locale: ${engLocale}`)
	console.log(`Locales to translate: ${listLocaleToTranslate.map((f) => f.lang)}`)
	// translating
	console.log('==============================================')
	for (const locale of listLocaleToTranslate) {
		console.log(`Translating ${locale.lang}...`)
		// remove region code
		const localeWithoutRegion = locale.lang.split('-').shift()
		if (localeWithoutRegion) {
			locale.lang = localeWithoutRegion
		}
		try {
			// load file
			const file = yaml.load(fs.readFileSync(engLocale, 'utf8')) as Record<
				string,
				unknown
			>

			// translate
			const t = await translateFile(file, locale)

			// save to file
			fs.writeFileSync(locale.path, yaml.dump(t))
		} catch (e) {
			console.error(e)
		}
	}
}

main()
	.then(() => {
		console.log('===================== Done =====================')
		process.exit(0)
	})
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
