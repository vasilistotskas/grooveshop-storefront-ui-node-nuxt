import * as fs from 'fs'
import path from 'path'

import yaml from 'js-yaml'
import { describe, expect, it, vi } from 'vitest'

import { getConfig, getConfigFilePath } from '~/tools/translator/src/config'

vi.mock('fs')
vi.mock('yaml')
vi.mock('path', async () => {
	const actual = await vi.importActual('path')
	return {
		...actual,
		join: (...args: string[]) => args.join('/')
	}
})

const validJsonConfig = JSON.stringify({
	translate: { engine: 'google', bundleDelay: 500, bundleMaxRetries: 3 },
	localePath: './locales',
	sourceFileName: 'en-US'
})

const validYamlConfig = yaml.dump({
	localePath: './locales',
	sourceFileName: 'en-US',
	translate: { engine: 'google', bundleDelay: 500, bundleMaxRetries: 3 }
})

describe('translator config tests', () => {
	const mockCwd = path.join('tests', 'data', 'locales')

	beforeEach(() => {
		vi.clearAllMocks()
		vi.spyOn(process, 'cwd').mockReturnValue(mockCwd)
	})

	it('should throw an error when multiple config files are found', async () => {
		const configPaths = [
			path.join(mockCwd, 'translator.config.json'),
			path.join(mockCwd, 'translator.config.yml')
		]
		vi.spyOn(fs.promises, 'access').mockImplementation((filePath) => {
			return configPaths.includes(filePath as string)
				? Promise.resolve()
				: Promise.reject(new Error('File not found'))
		})

		await expect(getConfigFilePath()).rejects.toThrow(
			'Found multiple config files: tests\\data\\locales\\translator.config.json, tests\\data\\locales\\translator.config.yml. Please only have one config file.'
		)
	})
	it('should throw an error when no config files are found', async () => {
		vi.spyOn(fs.promises, 'access').mockRejectedValue(new Error('File not found'))

		await expect(getConfigFilePath()).rejects.toThrow(
			'No config file found. Please create a translator.config file.'
		)
	})
	it('should return the correct path when a valid config file is found', async () => {
		const expectedPath = path.join(mockCwd, 'translator.config.json')
		vi.spyOn(fs.promises, 'access').mockImplementation((filePath) => {
			return filePath === expectedPath
				? Promise.resolve()
				: Promise.reject(new Error('File not found'))
		})

		const result = await getConfigFilePath()
		expect(result).toBe(expectedPath)
	})
	it('should throw an error if no file path is provided', async () => {
		await expect(getConfig('')).rejects.toThrow(
			'Config file not specified. Please ensure the translator.config file path is provided.'
		)
	})
	it('should parse and return a valid JSON config', async () => {
		vi.spyOn(fs.promises, 'readFile').mockResolvedValue(validJsonConfig)

		const config = await getConfig(path.join(mockCwd, 'translator.config.json'))
		expect(config).toEqual(JSON.parse(validJsonConfig))
	})
	it('should parse and return a valid YAML config', async () => {
		vi.spyOn(fs.promises, 'readFile').mockResolvedValue(validYamlConfig)

		const config = await getConfig(path.join(mockCwd, 'translator.config.yml'))
		expect(config).toEqual(yaml.load(validYamlConfig))
	})
	it('should throw an error for invalid file contents', async () => {
		vi.spyOn(fs.promises, 'readFile').mockResolvedValue('invalid content')

		await expect(getConfig(path.join(mockCwd, 'translator.config.json'))).rejects.toThrow(
			'Failed to parse and validate config file at tests\\data\\locales\\translator.config.json. Error: SyntaxError: Unexpected token \'i\', "invalid content" is not valid JSON'
		)
	})
})
