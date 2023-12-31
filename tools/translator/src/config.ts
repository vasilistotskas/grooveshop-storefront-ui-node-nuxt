/* eslint-disable no-console */
import path from 'path'
import * as fs from 'fs'
import yaml from 'js-yaml'
import type { Config } from './types'
import { validateConfig } from './validator'
import { configFileName } from './constants'

const getConfigFilePath = async (
	rootDir = process.cwd(),
	configExtensions = ['.json', '.yaml', '.yml']
): Promise<string> => {
	const buildConfigFilePaths = (configFileName: string, extensions: string[]) =>
		extensions.map((ext) => path.join(rootDir, `${configFileName}${ext}`))

	const findExistingConfigFiles = async (
		filePaths: string[]
	): Promise<Awaited<string[]>> => {
		const existingFiles: string[] = []

		for (const filePath of filePaths) {
			try {
				await fs.promises.access(filePath, fs.constants.F_OK)
				existingFiles.push(filePath)
			} catch (error) {
				console.error(`Error accessing file at ${filePath}: ${error}`)
			}
		}
		return existingFiles
	}

	const filePaths = buildConfigFilePaths(configFileName, configExtensions)
	const foundConfigs = await findExistingConfigFiles(filePaths)

	if (foundConfigs.length > 1) {
		throw new Error(
			`Found multiple config files: ${foundConfigs.join(
				', '
			)}. Please only have one config file.`
		)
	} else if (foundConfigs.length === 0) {
		throw new Error('No config file found. Please create a translator.config file.')
	}

	if (!foundConfigs[0]) {
		throw new Error('No config file found. Please create a translator.config file.')
	}

	return foundConfigs[0]
}

const getConfig = async (filePath: string): Promise<Config> => {
	if (!filePath) {
		throw new Error(
			'Config file not specified. Please ensure the translator.config file path is provided.'
		)
	}
	try {
		const fileContents = await fs.promises.readFile(filePath, 'utf8')
		if (filePath.endsWith('.json')) {
			return JSON.parse(fileContents) as Config
		} else {
			return yaml.load(fileContents) as Config
		}
	} catch (error) {
		throw new Error(
			`Failed to parse and validate config file at ${filePath}. Error: ${error}`
		)
	}
}

const loadConfig = async (): Promise<Config> => {
	const configFilePath = await getConfigFilePath()
	const config = await getConfig(configFilePath)
	validateConfig(config as Partial<Config>)
	return config
}

export { getConfigFilePath, getConfig, validateConfig, loadConfig }
